// ======================= src/workers/reels/reels_worker.js =======================
// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.

import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import Reel from "../../models/reels/reels_model.js";
import { r2, BUCKET, publicUrl, deleteReelFile } from "../../utils/reels/sendReels.js";

const connection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

export const reelQueue = new Queue("reel-processing", { connection });

export const enqueueReelProcessing = async ({ reelUuid, rawKey }) => {
  await reelQueue.add("process", { reelUuid, rawKey }, {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
};

const downloadRaw = async (rawKey, destPath) => {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: rawKey });
  const res = await r2.send(cmd);
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  await fs.writeFile(destPath, Buffer.concat(chunks));
};

const uploadFile = async (key, filePath, contentType) => {
  const buf = await fs.readFile(filePath);
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buf, ContentType: contentType }));
};

const ffmpegPromise = (input, output, options) => new Promise((resolve, reject) => {
  ffmpeg(input).outputOptions(options).output(output).on("end", resolve).on("error", reject).run();
});

const probeVideo = (input) => new Promise((resolve, reject) => {
  ffmpeg.ffprobe(input, (err, meta) => {
    if (err) return reject(err);
    const v = meta.streams.find((s) => s.codec_type === "video");
    if (!v) return reject(new Error("No video stream"));
    resolve({ width: v.width, height: v.height, duration: meta.format.duration });
  });
});

const cleanupTemp = async (files) => {
  await Promise.all(files.map((f) => fs.unlink(f).catch(() => {})));
};

const OPTS_1080 = [
  "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black",
  "-c:v", "libx264", "-preset", "medium", "-crf", "21",
  "-maxrate", "3.5M", "-bufsize", "7M",
  "-profile:v", "high", "-level", "4.1", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "96k", "-ac", "2", "-ar", "44100",
  "-movflags", "+faststart",
];

const OPTS_720 = [
  "-vf", "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black",
  "-c:v", "libx264", "-preset", "medium", "-crf", "23",
  "-maxrate", "1.5M", "-bufsize", "3M",
  "-profile:v", "main", "-level", "3.1", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "80k", "-ac", "2", "-ar", "44100",
  "-movflags", "+faststart",
];

const processReel = async ({ reelUuid, rawKey }) => {
  const tmp = os.tmpdir();
  const inPath = path.join(tmp, `${reelUuid}_in.mp4`);
  const p1080 = path.join(tmp, `${reelUuid}_1080.mp4`);
  const p720 = path.join(tmp, `${reelUuid}_720.mp4`);
  const pThumb = path.join(tmp, `${reelUuid}.jpg`);
  const tempFiles = [inPath, p1080, p720, pThumb];

  try {
    await downloadRaw(rawKey, inPath);

    const { width, height } = await probeVideo(inPath);
    const minSide = Math.min(width, height);
    const make1080 = minSide >= 1000;
    const make720 = minSide >= 700;

    console.log(`📐 ${reelUuid} — source: ${width}x${height} | 1080p: ${make1080} | 720p: ${make720}`);

    if (make1080) await ffmpegPromise(inPath, p1080, OPTS_1080);
    if (make720) await ffmpegPromise(inPath, p720, OPTS_720);

    await new Promise((resolve, reject) => {
      ffmpeg(inPath).seekInput(1).frames(1).outputOptions(["-q:v", "3"]).output(pThumb)
        .on("end", resolve).on("error", reject).run();
    });

    const key1080 = `videos/1080/${reelUuid}.mp4`;
    const key720 = `videos/720/${reelUuid}.mp4`;
    const keyOriginal = `videos/original/${reelUuid}.mp4`;
    const keyThumb = `thumbnails/${reelUuid}.jpg`;

    if (make1080) await uploadFile(key1080, p1080, "video/mp4");
    if (make720) await uploadFile(key720, p720, "video/mp4");
    if (!make720) await uploadFile(keyOriginal, inPath, "video/mp4");
    await uploadFile(keyThumb, pThumb, "image/jpeg");

    const update = {
      $set: { status: "ready", thumbnailKey: keyThumb, thumbnailUrl: publicUrl(keyThumb) },
      $unset: { failReason: "", rawKey: "" },
    };

    if (make1080) {
      update.$set.videoKey1080 = key1080;
      update.$set.videoUrl1080 = publicUrl(key1080);
      update.$set.videoKey720 = key720;
      update.$set.videoUrl720 = publicUrl(key720);
    } else if (make720) {
      update.$set.videoKey720 = key720;
      update.$set.videoUrl720 = publicUrl(key720);
      update.$set.videoKey1080 = key720;
      update.$set.videoUrl1080 = publicUrl(key720);
    } else {
      update.$set.videoKey1080 = keyOriginal;
      update.$set.videoUrl1080 = publicUrl(keyOriginal);
      update.$set.videoKey720 = keyOriginal;
      update.$set.videoUrl720 = publicUrl(keyOriginal);
    }

    await Reel.updateOne({ reelUuid }, update);

    // Raw deleted after successful processing.
    // On failure, retained for BullMQ retry (attempts: 2).
    await deleteReelFile(rawKey);

    await cleanupTemp(tempFiles);

    console.log(`✅ Reel ready: ${reelUuid} | 1080p: ${make1080} | 720p: ${make720}`);
  } catch (err) {
    console.error(`❌ REEL PROCESS ERROR 👉 ${reelUuid}`, err);

    await Reel.updateOne(
      { reelUuid },
      { $set: { status: "failed", failReason: err.message } }
      // rawKey — retry-க்கு காக்கப்படும்
    );

    await cleanupTemp(tempFiles);

    throw err;
  }
};

if (process.env.NODE_ENV !== "test") {
  new Worker(
    "reel-processing",
    async (job) => { await processReel(job.data); },
    { connection, concurrency: 2 }
  );
  console.log("🎬 Reels worker running...");
}