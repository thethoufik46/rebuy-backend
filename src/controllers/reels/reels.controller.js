// ======================= src/controllers/reels/reels.controller.js =======================
// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
import { randomUUID } from "crypto";
import { z } from "zod";
import Reel from "../../models/reels/reels_model.js";
import Car from "../../models/car/car_model.js";
import Bike from "../../models/bike/bike_model.js";
import Property from "../../models/property/property_model.js";
import Electronics from "../../models/electronics/electronics_model.js";
import { getSignedUploadUrl,deleteReelFile,headReelFile,publicUrl } from "../../utils/reels/sendReels.js";
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
const initSchema=z.object({
  category:z.enum(["cars","bikes","property","electronics"]),
  contentType:z.string().regex(/^video\//),
  sizeBytes:z.coerce.number().int().positive().max(200*1024*1024),
  listingId:z.coerce.number().int().positive(),
});
const completeSchema=z.object({reelUuid:z.string().uuid()});
export const initUpload=async(req,res)=>{
  try{
    const body=initSchema.parse(req.body);
    const listing=await verifyListing(body.category,body.listingId);
    if(!listing)return res.status(404).json({success:false,message:"Listing not found for this category"});
    const reelUuid=randomUUID();
    const videoKey=`videos/${reelUuid}.mp4`;
    const uploadUrl=await getSignedUploadUrl(videoKey,body.contentType);
    await Reel.create({
      reelUuid,
      createdBy:req.userId,
      sellerUser:listing.sellerUser||null,
      category:body.category,
      listingId:body.listingId,
      rawKey:videoKey,
      videoKey1080:videoKey,
      videoKey720:videoKey,
      sizeBytes:body.sizeBytes,
      status:"processing",
    });
    return res.status(201).json({success:true,reelUuid,uploadUrl,videoKey,status:"upload_pending"});
  }catch(err){
    console.error("INIT REEL UPLOAD ERROR 👉",err);
    return res.status(400).json({success:false,message:err.message||"Failed to init upload"});
  }
};
export const completeUpload=async(req,res)=>{
  try{
    const {reelUuid}=completeSchema.parse(req.body);
    const reel=await Reel.findOne({reelUuid,createdBy:req.userId});
    if(!reel)return res.status(404).json({success:false,message:"Reel not found"});
    if(!reel.rawKey)return res.status(400).json({success:false,message:"Video key missing"});
    const object=await headReelFile(reel.rawKey);
    if(!object)return res.status(400).json({success:false,message:"Video upload not found in R2"});
    const sizeBytes=Number(object.ContentLength||reel.sizeBytes||0);
    const contentType=object.ContentType||"video/mp4";
    const videoUrl=publicUrl(reel.rawKey);
    await Reel.updateOne(
      {reelUuid},
      {$set:{
        status:"ready",
        sizeBytes,
        videoKey1080:reel.rawKey,
        videoKey720:reel.rawKey,
        videoUrl1080:videoUrl,
        videoUrl720:videoUrl,
        thumbnailKey:null,
        thumbnailUrl:null,
        duration:null,
        failReason:null,
      }}
    );
    return res.status(200).json({
      success:true,
      message:"Reel uploaded successfully",
      status:"ready",
      reelUuid,
      videoKey:reel.rawKey,
      videoUrl,
      sizeBytes,
      contentType,
    });
  }catch(err){
    console.error("COMPLETE REEL UPLOAD ERROR 👉",err);
    return res.status(400).json({success:false,message:err.message||"Failed to complete upload"});
  }
};
export const getFeed=async(req,res)=>{
  try{
    const {category,cursor}=req.query;
    const limit=Math.min(Number(req.query.limit)||10,20);
    if(!category)return res.status(400).json({success:false,message:"category is required"});
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
    const reels=await Reel.find({category,status:"ready",...cursorFilter})
      .select("reelUuid category listingId videoUrl1080 videoUrl720 thumbnailUrl duration shares sizeBytes createdAt")
      .sort({createdAt:-1,_id:-1})
      .limit(limit+1)
      .lean();
    const hasMore=reels.length>limit;
    const items=hasMore?reels.slice(0,limit):reels;
    const last=items[items.length-1];
    const nextCursor=hasMore&&last?Buffer.from(JSON.stringify({createdAt:last.createdAt,id:last._id})).toString("base64url"):null;
    return res.status(200).json({
      success:true,
      reels:items.map(reel=>({
        reelUuid:reel.reelUuid,
        category:reel.category,
        listingId:reel.listingId,
        videoUrl1080:reel.videoUrl1080,
        videoUrl720:reel.videoUrl720,
        thumbnailUrl:reel.thumbnailUrl,
        duration:reel.duration,
        shares:reel.shares,
        sizeBytes:reel.sizeBytes,
      })),
      nextCursor,
      hasMore,
    });
  }catch(err){
    console.error("GET REEL FEED ERROR 👉",err);
    return res.status(400).json({success:false,message:err.message||"Failed to get feed"});
  }
};
export const shareReel=async(req,res)=>{
  try{
    const {reelUuid}=req.params;
    const reel=await Reel.findOneAndUpdate({reelUuid,status:"ready"},{$inc:{shares:1}},{new:true});
    if(!reel)return res.status(404).json({success:false,message:"Reel not found"});
    const shareLink=`${process.env.SHARE_BASE_URL||"https://re2buy.com/reels"}/${reelUuid}`;
    return res.status(200).json({success:true,shareLink,shares:reel.shares});
  }catch(err){
    console.error("SHARE REEL ERROR 👉",err);
    return res.status(400).json({success:false,message:err.message||"Failed to share reel"});
  }
};
export const deleteReel=async(req,res)=>{
  try{
    const {reelUuid}=req.params;
    const reel=await Reel.findOne({reelUuid});
    if(!reel)return res.status(404).json({success:false,message:"Reel not found"});
    const keys=[reel.rawKey,reel.videoKey1080,reel.videoKey720,reel.thumbnailKey].filter(Boolean);
    for(const key of [...new Set(keys)])await deleteReelFile(key);
    await reel.deleteOne();
    return res.status(200).json({success:true,message:"Reel deleted"});
  }catch(err){
    console.error("DELETE REEL ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message||"Failed to delete reel"});
  }
};
export default {initUpload,completeUpload,getFeed,shareReel,deleteReel};