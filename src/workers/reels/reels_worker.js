// // ======================= src/workers/reels/reels_worker.js =======================
// // 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// // ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// import { Queue,Worker,QueueEvents } from "bullmq";
// import IORedis from "ioredis";
// import ffmpeg from "fluent-ffmpeg";
// import ffmpegStatic from "ffmpeg-static";
// import fs from "fs";
// import fsp from "fs/promises";
// import path from "path";
// import os from "os";
// import { pipeline } from "stream/promises";
// import { GetObjectCommand,PutObjectCommand } from "@aws-sdk/client-s3";
// import Reel from "../../models/reels/reels_model.js";
// import { r2,BUCKET,publicUrl,deleteReelFile } from "../../utils/reels/sendReels.js";
// if(ffmpegStatic)ffmpeg.setFfmpegPath(ffmpegStatic);
// const redisUrl=process.env.REDIS_URL||"redis://127.0.0.1:6379";
// const connection=new IORedis(redisUrl,{maxRetriesPerRequest:null});
// connection.on("connect",()=>console.log("🔴 REDIS CONNECTED 👉 Reels worker"));
// connection.on("ready",()=>console.log("🟢 REDIS READY 👉 Reels worker"));
// connection.on("error",err=>console.error("❌ REDIS ERROR 👉",err.message||err));
// connection.on("close",()=>console.log("⚠️ REDIS CONNECTION CLOSED 👉 Reels worker"));
// connection.on("reconnecting",()=>console.log("🔄 REDIS RECONNECTING 👉 Reels worker"));
// export const reelQueue=new Queue("reel-processing",{connection});
// const queueEventsConnection=new IORedis(redisUrl,{maxRetriesPerRequest:null});
// const queueEvents=new QueueEvents("reel-processing",{connection:queueEventsConnection});
// queueEvents.on("waiting",({jobId})=>console.log(`⏳ REEL JOB WAITING 👉 ${jobId}`));
// queueEvents.on("active",({jobId,prev})=>console.log(`▶️ REEL JOB ACTIVE 👉 ${jobId} | previous: ${prev||"none"}`));
// queueEvents.on("completed",({jobId,returnvalue})=>console.log(`✅ REEL JOB COMPLETED 👉 ${jobId} | ${returnvalue||""}`));
// queueEvents.on("failed",({jobId,failedReason})=>console.error(`❌ REEL JOB FAILED 👉 ${jobId} | ${failedReason||"unknown"}`));
// queueEvents.on("error",err=>console.error("❌ REEL QUEUE EVENTS ERROR 👉",err.message||err));
// export const enqueueReelProcessing=async({reelUuid,rawKey})=>{
//   console.log(`📥 REEL JOB ADDING 👉 ${reelUuid}`);
//   console.log(`☁️ REEL RAW KEY 👉 ${rawKey}`);
//   try{
//     const job=await reelQueue.add("process",{reelUuid,rawKey},{
//       jobId:reelUuid,
//       attempts:2,
//       backoff:{type:"exponential",delay:5000},
//       removeOnComplete:true,
//       removeOnFail:false,
//     });
//     console.log(`📥 REEL JOB ADDED 👉 ${reelUuid} | jobId: ${job.id}`);
//     console.log(`📊 REEL QUEUE COUNT 👉 ${await reelQueue.count()}`);
//     return job;
//   }catch(err){
//     console.error(`❌ REEL JOB ADD ERROR 👉 ${reelUuid}`,err);
//     throw err;
//   }
// };
// const downloadRawToTemp=async(rawKey,filePath)=>{
//   console.log(`☁️ R2 RAW DOWNLOAD START 👉 ${rawKey}`);
//   const result=await r2.send(new GetObjectCommand({Bucket:BUCKET,Key:rawKey}));
//   if(!result.Body)throw new Error("R2 raw video body is empty");
//   await pipeline(result.Body,fs.createWriteStream(filePath));
//   const stat=await fsp.stat(filePath);
//   console.log(`☁️ R2 RAW DOWNLOAD DONE 👉 ${rawKey} | ${stat.size} bytes`);
//   return stat.size;
// };
// const uploadFile=async(key,filePath,contentType)=>{
//   console.log(`☁️ R2 UPLOAD START 👉 ${key}`);
//   const stat=await fsp.stat(filePath);
//   await r2.send(new PutObjectCommand({
//     Bucket:BUCKET,
//     Key:key,
//     Body:fs.createReadStream(filePath),
//     ContentLength:stat.size,
//     ContentType:contentType,
//   }));
//   console.log(`☁️ R2 UPLOAD DONE 👉 ${key} | ${stat.size} bytes`);
// };
// const ffmpegPromise=(input,output,options)=>new Promise((resolve,reject)=>{
//   console.log(`🎬 FFMPEG START 👉 ${path.basename(output)}`);
//   ffmpeg(input)
//     .outputOptions(options)
//     .output(output)
//     .on("start",cmd=>console.log(`🎬 FFMPEG CMD 👉 ${cmd}`))
//     .on("progress",p=>{
//       if(p.percent!=null)console.log(`🎬 FFMPEG PROGRESS 👉 ${path.basename(output)} | ${Number(p.percent).toFixed(1)}%`);
//     })
//     .on("end",()=>{
//       console.log(`✅ FFMPEG DONE 👉 ${path.basename(output)}`);
//       resolve();
//     })
//     .on("error",err=>{
//       console.error(`❌ FFMPEG ERROR 👉 ${path.basename(output)}`,err);
//       reject(err);
//     })
//     .run();
// });
// const probeVideo=input=>new Promise((resolve,reject)=>{
//   console.log(`🔎 VIDEO PROBE START 👉 ${input}`);
//   ffmpeg.ffprobe(input,(err,metadata)=>{
//     if(err)return reject(err);
//     const stream=metadata.streams.find(s=>s.codec_type==="video");
//     if(!stream)return reject(new Error("No video stream found"));
//     const result={
//       width:Number(stream.width)||0,
//       height:Number(stream.height)||0,
//       duration:Number(metadata.format?.duration)||0,
//     };
//     console.log(`🔎 VIDEO PROBE DONE 👉 ${result.width}x${result.height} | ${result.duration}s`);
//     resolve(result);
//   });
// });
// const cleanupTemp=async(files)=>{
//   await Promise.all(files.filter(Boolean).map(file=>fsp.unlink(file).catch(()=>{})));
// };
// const OPTS_1080=[
//   "-vf","scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black",
//   "-c:v","libx264","-preset","veryfast","-crf","22","-maxrate","3.5M","-bufsize","7M",
//   "-profile:v","high","-level","4.1","-pix_fmt","yuv420p","-threads","1",
//   "-c:a","aac","-b:a","96k","-ac","2","-ar","44100","-movflags","+faststart",
// ];
// const OPTS_720=[
//   "-vf","scale=720:1280:force_original_aspect_ratio:decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black",
//   "-c:v","libx264","-preset","veryfast","-crf","24","-maxrate","1.5M","-bufsize","3M",
//   "-profile:v","main","-level","3.1","-pix_fmt","yuv420p","-threads","1",
//   "-c:a","aac","-b:a","80k","-ac","2","-ar","44100","-movflags","+faststart",
// ];
// const processReel=async({reelUuid,rawKey})=>{
//   const tmp=process.env.REEL_TEMP_DIR||path.join(os.tmpdir(),"re2buy-reels");
//   await fsp.mkdir(tmp,{recursive:true});
//   const inputPath=path.join(tmp,`${reelUuid}_raw.mp4`);
//   const p1080=path.join(tmp,`${reelUuid}_1080.mp4`);
//   const p720=path.join(tmp,`${reelUuid}_720.mp4`);
//   const pThumb=path.join(tmp,`${reelUuid}.jpg`);
//   const tempFiles=[inputPath,p1080,p720,pThumb];
//   console.log(`🚀 REEL PROCESS START 👉 ${reelUuid}`);
//   console.log(`☁️ REEL RAW KEY 👉 ${rawKey}`);
//   try{
//     await downloadRawToTemp(rawKey,inputPath);
//     const {width,height,duration}=await probeVideo(inputPath);
//     if(!width||!height)throw new Error("Invalid video resolution");
//     const minSide=Math.min(width,height);
//     const make1080=minSide>=1000;
//     console.log(`📐 ${reelUuid} — source: ${width}x${height} | 1080p: ${make1080} | 720p: true`);
//     if(make1080)await ffmpegPromise(inputPath,p1080,OPTS_1080);
//     await ffmpegPromise(inputPath,p720,OPTS_720);
//     console.log(`🖼️ THUMBNAIL START 👉 ${reelUuid}`);
//     await new Promise((resolve,reject)=>{
//       ffmpeg(inputPath)
//         .seekInput(Math.min(1,Math.max(0,duration/2)))
//         .frames(1)
//         .outputOptions(["-q:v","4"])
//         .output(pThumb)
//         .on("end",()=>resolve())
//         .on("error",reject)
//         .run();
//     });
//     const key1080=`videos/1080/${reelUuid}.mp4`;
//     const key720=`videos/720/${reelUuid}.mp4`;
//     const keyThumb=`thumbnails/${reelUuid}.jpg`;
//     await uploadFile(key720,p720,"video/mp4");
//     if(make1080)await uploadFile(key1080,p1080,"video/mp4");
//     await uploadFile(keyThumb,pThumb,"image/jpeg");
//     const update={
//       $set:{
//         status:"ready",
//         duration:duration>0?duration:null,
//         thumbnailKey:keyThumb,
//         thumbnailUrl:publicUrl(keyThumb),
//         videoKey720:key720,
//         videoUrl720:publicUrl(key720),
//         failReason:null,
//       },
//       $unset:{rawKey:""},
//     };
//     if(make1080){
//       update.$set.videoKey1080=key1080;
//       update.$set.videoUrl1080=publicUrl(key1080);
//     }else{
//       update.$set.videoKey1080=key720;
//       update.$set.videoUrl1080=publicUrl(key720);
//     }
//     await Reel.updateOne({reelUuid},update);
//     console.log(`💾 REEL DATABASE UPDATED 👉 ${reelUuid} | status: ready`);
//     await deleteReelFile(rawKey);
//     console.log(`🗑️ R2 RAW DELETED 👉 ${rawKey}`);
//     await cleanupTemp(tempFiles);
//     console.log(`✅ REEL READY 👉 ${reelUuid} | ${width}x${height} | duration: ${duration}s`);
//     return "ready";
//   }catch(err){
//     console.error(`❌ REEL PROCESS ERROR 👉 ${reelUuid}`,err);
//     console.error(`❌ REEL ERROR MESSAGE 👉 ${err.message||err}`);
//     await Reel.updateOne(
//       {reelUuid},
//       {$set:{status:"failed",failReason:String(err.message||err).slice(0,1000)}},
//     ).catch(dbErr=>console.error("❌ REEL FAILURE DB UPDATE ERROR 👉",dbErr));
//     await cleanupTemp(tempFiles);
//     throw err;
//   }
// };
// let reelWorker=null;
// if(process.env.NODE_ENV!=="test"){
//   reelWorker=new Worker(
//     "reel-processing",
//     async job=>{
//       console.log(`▶️ REEL WORKER RECEIVED JOB 👉 ${job.id}`);
//       console.log(`📦 REEL JOB DATA 👉 ${JSON.stringify(job.data)}`);
//       const result=await processReel(job.data);
//       console.log(`🏁 REEL WORKER FINISHED JOB 👉 ${job.id} | ${result}`);
//       return result;
//     },
//     {connection,concurrency:1},
//   );
//   reelWorker.on("ready",()=>console.log("🟢 REEL WORKER READY 👉 BullMQ"));
//   reelWorker.on("active",job=>console.log(`▶️ REEL WORKER ACTIVE 👉 ${job.id}`));
//   reelWorker.on("completed",(job,result)=>console.log(`✅ REEL WORKER COMPLETED 👉 ${job.id} | ${result}`));
//   reelWorker.on("failed",(job,err)=>console.error(`❌ REEL WORKER FAILED 👉 ${job?.id}`,err));
//   reelWorker.on("error",err=>console.error("❌ REEL WORKER ERROR 👉",err));
//   reelWorker.on("stalled",jobId=>console.error(`⚠️ REEL WORKER STALLED 👉 ${jobId}`));
//   console.log("🎬 Reels worker running...");
// }