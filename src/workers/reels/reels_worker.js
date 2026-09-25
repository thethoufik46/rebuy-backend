// ======================= src/workers/reels/reels_worker.js =======================
// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.

import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";
import os from "os";

import {
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import Reel from "../../models/reels/reels_model.js";

import {
  r2,
  BUCKET,
  publicUrl,
  deleteReelFile,
} from "../../utils/reels/sendReels.js";

// ============================================================
// REDIS CONNECTION
// ============================================================

const connection = new IORedis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
  {
    maxRetriesPerRequest: null,
  }
);

// ============================================================
// QUEUE
// ============================================================

export const reelQueue = new Queue("reel-processing", { connection });

// ============================================================
// ENQUEUE
// ============================================================

export const enqueueReelProcessing = async ({ reelUuid, rawKey }) => {
  await reelQueue.add(
    "process",
    { reelUuid, rawKey },
    {
      attempts: 2,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
};

// ============================================================
// DOWNLOAD RAW FROM R2
// ============================================================

const downloadRaw = async (rawKey, destPath) => {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: rawKey,
  });

  const res = await r2.send(cmd);

  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);

  await fs.writeFile(destPath, Buffer.concat(chunks));
};

// ============================================================
// UPLOAD FILE TO R2
// ============================================================

const uploadFile = async (key, filePath, contentType) => {
  const buf = await fs.readFile(filePath);

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buf,
      ContentType: contentType,
    })
  );
};

// ============================================================
// FFMPEG PROMISE WRAPPER
// ============================================================

const ffmpegPromise = (input, output, options) => {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .outputOptions(options)
      .output(output)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
};

// ============================================================
// PROCESS REEL
// ============================================================

const processReel = async ({ reelUuid, rawKey }) => {
  const tmp = os.tmpdir();
  const inPath = path.join(tmp, `${reelUuid}_in.mp4`);
  const p1080 = path.join(tmp, `${reelUuid}_1080.mp4`);
  const p720 = path.join(tmp, `${reelUuid}_720.mp4`);
  const pThumb = path.join(tmp, `${reelUuid}.jpg`);

  try {
    // ----------------------------------------------------------
    // DOWNLOAD RAW
    // ----------------------------------------------------------

    await downloadRaw(rawKey, inPath);

    // ----------------------------------------------------------
    // TRANSCODE 1080p
    // ----------------------------------------------------------

    await ffmpegPromise(inPath, p1080, [
      "-vf",
      "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-b:v",
      "4M",
      "-maxrate",
      "4.5M",
      "-bufsize",
      "8M",
      "-profile:v",
      "high",
      "-level",
      "4.1",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ac",
      "2",
      "-ar",
      "44100",
      "-movflags",
      "+faststart",
    ]);

    // ----------------------------------------------------------
    // TRANSCODE 720p
    // ----------------------------------------------------------

    await ffmpegPromise(inPath, p720, [
      "-vf",
      "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-b:v",
      "1.5M",
      "-maxrate",
      "1.8M",
      "-bufsize",
      "3M",
      "-profile:v",
      "main",
      "-level",
      "3.1",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      "-ac",
      "2",
      "-ar",
      "44100",
      "-movflags",
      "+faststart",
    ]);

    // ----------------------------------------------------------
    // EXTRACT THUMBNAIL
    // ----------------------------------------------------------

    await new Promise((resolve, reject) => {
      ffmpeg(inPath)
        .seekInput(1)
        .frames(1)
        .outputOptions(["-q:v", "2"])
        .output(pThumb)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // ----------------------------------------------------------
    // UPLOAD ALL 3 TO R2
    // ----------------------------------------------------------

    const key1080 = `videos/1080/${reelUuid}.mp4`;
    const key720 = `videos/720/${reelUuid}.mp4`;
    const keyThumb = `thumbnails/${reelUuid}.jpg`;

    await uploadFile(key1080, p1080, "video/mp4");
    await uploadFile(key720, p720, "video/mp4");
    await uploadFile(keyThumb, pThumb, "image/jpeg");

    // ----------------------------------------------------------
    // UPDATE DB
    // ----------------------------------------------------------

    await Reel.updateOne(
      { reelUuid },
      {
        status: "ready",
        videoKey1080: key1080,
        videoKey720: key720,
        thumbnailKey: keyThumb,
        videoUrl1080: publicUrl(key1080),
        videoUrl720: publicUrl(key720),
        thumbnailUrl: publicUrl(keyThumb),
        rawKey: null,
      }
    );

    // ----------------------------------------------------------
    // DELETE RAW FROM R2
    // ----------------------------------------------------------

    await deleteReelFile(rawKey);

    // ----------------------------------------------------------
    // CLEANUP TEMP FILES
    // ----------------------------------------------------------

    await Promise.all(
      [inPath, p1080, p720, pThumb].map((f) =>
        fs.unlink(f).catch(() => {})
      )
    );

    console.log(`✅ Reel ready: ${reelUuid}`);
  } catch (err) {
    console.error(`REEL PROCESS ERROR 👉 ${reelUuid}`, err);

    await Reel.updateOne(
      { reelUuid },
      {
        status: "failed",
        failReason: err.message,
        rawKey: null,
      }
    );

    await deleteReelFile(rawKey);

    await Promise.all(
      [inPath, p1080, p720, pThumb].map((f) =>
        fs.unlink(f).catch(() => {})
      )
    );

    throw err;
  }
};

// ============================================================
// WORKER
// ============================================================

if (process.env.NODE_ENV !== "test") {
  new Worker(
    "reel-processing",
    async (job) => {
      await processReel(job.data);
    },
    { connection, concurrency: 2 }
  );

  console.log("🎬 Reels worker running...");
}