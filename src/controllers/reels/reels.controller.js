// ======================= src/controllers/reels/reels.controller.js =======================
// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
import { randomUUID } from "crypto";
import { z } from "zod";
import fs from "fs/promises";
import os from "os";
import path from "path";
import Reel from "../../models/reels/reels_model.js";
import Car from "../../models/car/car_model.js";
import Bike from "../../models/bike/bike_model.js";
import Property from "../../models/property/property_model.js";
import Electronics from "../../models/electronics/electronics_model.js";
import { deleteReelFile } from "../../utils/reels/sendReels.js";
import { enqueueReelProcessing } from "../../workers/reels/reels_worker.js";
const listingModelMap={
  cars:{model:Car,idField:"carId"},
  bikes:{model:Bike,idField:"bikeId"},
  property:{model:Property,idField:"propertyId"},
  electronics:{model:Electronics,idField:"electronicsId"},
};
const verifyListing=async(category,listingId)=>{
  const entry=listingModelMap[category];
  if(!entry)return null;
  const listing=await entry.model.findOne({[entry.idField]:listingId}).select(`${entry.idField} createdBy sellerUser status`).lean();
  return listing||null;
};
const uploadSchema=z.object({
  category:z.enum(["cars","bikes","property","electronics"]),
  listingId:z.coerce.number().int().positive(),
});
const saveTempFile=async(file,reelUuid)=>{
  if(!file)return null;
  if(file.path)return file.path;
  if(!file.buffer)return null;
  const dir=process.env.REEL_TEMP_DIR||path.join(os.tmpdir(),"re2buy-reels");
  await fs.mkdir(dir,{recursive:true});
  const filePath=path.join(dir,`${reelUuid}.mp4`);
  await fs.writeFile(filePath,file.buffer);
  return filePath;
};
const removeTempFile=async(filePath)=>{
  if(!filePath)return;
  await fs.unlink(filePath).catch(()=>{});
};
export const initUpload=async(req,res)=>{
  let inputPath=null;
  try{
    const body=uploadSchema.parse({
      category:req.body?.category,
      listingId:req.body?.listingId,
    });
    if(!req.file){
      return res.status(400).json({success:false,message:"Video file is required"});
    }
    if(!req.file.mimetype?.startsWith("video/")){
      return res.status(400).json({success:false,message:"Only video files are allowed"});
    }
    const sizeBytes=Number(req.file.size||req.file.buffer?.length||0);
    if(!sizeBytes||sizeBytes>200*1024*1024){
      return res.status(400).json({success:false,message:"Video size must be between 1 byte and 200 MB"});
    }
    const listing=await verifyListing(body.category,body.listingId);
    if(!listing){
      return res.status(404).json({success:false,message:"Listing not found for this category"});
    }
    const reelUuid=randomUUID();
    inputPath=await saveTempFile(req.file,reelUuid);
    if(!inputPath){
      return res.status(400).json({success:false,message:"Failed to save uploaded video"});
    }
    await Reel.create({
      reelUuid,
      createdBy:req.userId,
      sellerUser:listing.sellerUser||null,
      category:body.category,
      listingId:body.listingId,
      sizeBytes,
      status:"processing",
    });
    await enqueueReelProcessing({reelUuid,inputPath});
    inputPath=null;
    return res.status(201).json({
      success:true,
      reelUuid,
      message:"Reel processing started",
      status:"processing",
    });
  }catch(err){
    console.error("INIT REEL UPLOAD ERROR 👉",err);
    await removeTempFile(inputPath);
    return res.status(400).json({success:false,message:err.message||"Failed to upload reel"});
  }
};
export const completeUpload=async(req,res)=>{
  return res.status(410).json({
    success:false,
    message:"Complete upload is no longer required. Video upload starts processing automatically.",
  });
};
export const getFeed=async(req,res)=>{
  try{
    const {category,cursor}=req.query;
    const limit=Math.min(Number(req.query.limit)||10,20);
    if(!category||!listingModelMap[category]){
      return res.status(400).json({success:false,message:"Valid category is required"});
    }
    let cursorFilter={};
    if(cursor){
      const raw=JSON.parse(Buffer.from(cursor,"base64url").toString());
      cursorFilter={
        $or:[
          {createdAt:{$lt:new Date(raw.createdAt)}},
          {createdAt:new Date(raw.createdAt),_id:{$lt:raw.id}},
        ],
      };
    }
    const reels=await Reel.find({
      category,
      status:"ready",
      ...cursorFilter,
    })
      .select("reelUuid category listingId videoUrl1080 videoUrl720 thumbnailUrl duration shares createdAt")
      .sort({createdAt:-1,_id:-1})
      .limit(limit+1)
      .lean();
    const hasMore=reels.length>limit;
    const items=hasMore?reels.slice(0,limit):reels;
    const last=items[items.length-1];
    const nextCursor=hasMore&&last
      ?Buffer.from(JSON.stringify({createdAt:last.createdAt,id:last._id})).toString("base64url")
      :null;
    const data=items.map(reel=>({
      reelUuid:reel.reelUuid,
      category:reel.category,
      listingId:reel.listingId,
      videoUrl1080:reel.videoUrl1080,
      videoUrl720:reel.videoUrl720,
      thumbnailUrl:reel.thumbnailUrl,
      duration:reel.duration,
      shares:reel.shares,
    }));
    return res.status(200).json({success:true,reels:data,nextCursor,hasMore});
  }catch(err){
    console.error("GET REEL FEED ERROR 👉",err);
    return res.status(400).json({success:false,message:err.message||"Failed to get feed"});
  }
};
export const getAdminReels=async(req,res)=>{
  try{
    const {category}=req.query;
    const limit=Math.min(Number(req.query.limit)||50,100);
    const filter={};
    if(category){
      if(!listingModelMap[category]){
        return res.status(400).json({success:false,message:"Invalid category"});
      }
      filter.category=category;
    }
    const reels=await Reel.find(filter)
      .select("reelUuid category listingId videoUrl1080 videoUrl720 thumbnailUrl duration shares status failReason sizeBytes createdAt updatedAt")
      .sort({createdAt:-1})
      .limit(limit)
      .lean();
    return res.status(200).json({success:true,reels});
  }catch(err){
    console.error("GET ADMIN REELS ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message||"Failed to get admin reels"});
  }
};
export const shareReel=async(req,res)=>{
  try{
    const {reelUuid}=req.params;
    const reel=await Reel.findOneAndUpdate(
      {reelUuid,status:"ready"},
      {$inc:{shares:1}},
      {new:true}
    ).select("shares");
    if(!reel){
      return res.status(404).json({success:false,message:"Reel not found"});
    }
    return res.status(200).json({success:true,shares:reel.shares});
  }catch(err){
    console.error("SHARE REEL ERROR 👉",err);
    return res.status(400).json({success:false,message:err.message||"Failed to share reel"});
  }
};
export const deleteReel=async(req,res)=>{
  try{
    const {reelUuid}=req.params;
    const reel=await Reel.findOne({reelUuid});
    if(!reel){
      return res.status(404).json({success:false,message:"Reel not found"});
    }
    await deleteReelFile(reel.videoKey1080);
    await deleteReelFile(reel.videoKey720);
    await deleteReelFile(reel.thumbnailKey);
    await reel.deleteOne();
    return res.status(200).json({success:true,message:"Reel deleted"});
  }catch(err){
    console.error("DELETE REEL ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message||"Failed to delete reel"});
  }
};
export default{
  initUpload,
  completeUpload,
  getFeed,
  getAdminReels,
  shareReel,
  deleteReel,
};