// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: ~100 LINES → ~30 LINES WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
import express from "express";
import mongoose from "mongoose";
import Electronics from "../../models/electronics/electronics_model.js";
import User from "../../models/user_model.js";
import {verifyToken,isAdmin} from "../../middleware/auth.js";
import uploadElectronics from "../../middleware/electronics/uploadElectronics.js";
import {uploadElectronicsMedia,deleteElectronicsMedia} from "../../utils/electronics/electronicsUpload.js";
import {decryptSeller} from "../../utils/sellerCrypto.js";
const router=express.Router();
const fields=[{name:"banner",maxCount:1},{name:"gallery",maxCount:10},{name:"audio",maxCount:1},{name:"video",maxCount:5}];
const ADMIN_USER_FIELDS="name googleName email phone alternatePhone role category userType status highlightText district address profileImage galleryImages forgotRequest forgotRequestAt createdAt updatedAt";
const getId=x=>x?._id||x;
const attachAdminUsers=async items=>{
  const list=Array.isArray(items)?items:[items];
  const ids=[...new Set(list.flatMap(x=>[getId(x?.createdBy),getId(x?.sellerUser)]).filter(x=>x&&mongoose.Types.ObjectId.isValid(x.toString())).map(x=>x.toString()))];
  if(!ids.length)return items;
  const users=await User.find({_id:{$in:ids}}).select(ADMIN_USER_FIELDS).lean();
  const map=new Map(users.map(x=>[x._id.toString(),x]));
  list.forEach(x=>{
    const a=getId(x?.createdBy),b=getId(x?.sellerUser);
    if(a){const u=map.get(a.toString());if(u)x.createdBy=u;}
    if(b){const u=map.get(b.toString());if(u)x.sellerUser=u;}
  });
  return items;
};
const prepareItem=item=>{
  if(!item)return item;
  if(typeof item.seller==="string"&&item.seller.includes(":"))try{item.seller=decryptSeller(item.seller)}catch(_){}
  return item;
};
router.post("/add",verifyToken,isAdmin,uploadElectronics.fields(fields),async(req,res)=>{
  try{
    const{brand,category,videoLink}=req.body;
    if(!mongoose.Types.ObjectId.isValid(brand))return res.status(400).json({success:false,message:"Invalid brand id"});
    if(!category)return res.status(400).json({success:false,message:"Category required"});
    const bannerImage=req.files?.banner?.length?await uploadElectronicsMedia(req.files.banner[0],"electronics/banner"):null;
    const galleryImages=req.files?.gallery?.length?await Promise.all(req.files.gallery.map(x=>uploadElectronicsMedia(x,"electronics/gallery"))):[];
    const audioNote=req.files?.audio?.length?await uploadElectronicsMedia(req.files.audio[0],"electronics/audio"):null;
    const videos=req.files?.video?.length?await Promise.all(req.files.video.map(x=>uploadElectronicsMedia(x,"electronics/videos"))):[];
    const item=await Electronics.create({...req.body,bannerImage,galleryImages,audioNote,videos,videoLink:videoLink||null,createdBy:req.user?._id||req.user?.id,status:"available"});
    const result=item.toObject();
    await attachAdminUsers([result]);
    res.status(201).json({success:true,message:"Electronics added successfully",item:prepareItem(result)});
  }catch(err){
    console.log("ADD ERROR:",err);
    res.status(500).json({success:false,message:err.message});
  }
});
router.get("/all",verifyToken,isAdmin,async(req,res)=>{
  try{
    const{category,brand,district,minPrice,maxPrice}=req.query,query={};
    if(category)query.category={$in:category.split(",").map(x=>x.trim())};
    if(brand)query.brand={$in:brand.split(",").map(x=>x.trim())};
    if(district)query.district={$in:district.split(",").map(x=>x.trim())};
    if(minPrice||maxPrice){query.price={};if(minPrice)query.price.$gte=Number(minPrice);if(maxPrice)query.price.$lte=Number(maxPrice);}
    const electronics=await Electronics.find(query).populate("brand","name logoUrl").sort({createdAt:-1}).lean();
    await attachAdminUsers(electronics);
    const finalElectronics=electronics.map(prepareItem);
    res.json({success:true,count:finalElectronics.length,electronics:finalElectronics});
  }catch(err){
    console.log("ADMIN GET ELECTRONICS ERROR:",err);
    res.status(500).json({success:false,message:"Failed to fetch electronics"});
  }
});
router.put("/:id",verifyToken,isAdmin,uploadElectronics.fields(fields),async(req,res)=>{
  try{
    const item=await Electronics.findById(req.params.id);
    if(!item)return res.status(404).json({success:false,message:"Electronics not found"});
    if(req.files?.banner?.length){
      if(item.bannerImage)await deleteElectronicsMedia(item.bannerImage);
      item.bannerImage=await uploadElectronicsMedia(req.files.banner[0],"electronics/banner");
    }
    if(req.body.existingGallery!==undefined){
      let gallery;
      try{gallery=Array.isArray(req.body.existingGallery)?req.body.existingGallery:JSON.parse(req.body.existingGallery)}catch{gallery=item.galleryImages||[]}
      if(Array.isArray(gallery)){
        for(const x of(item.galleryImages||[]).filter(x=>!gallery.includes(x)))await deleteElectronicsMedia(x);
        item.galleryImages=gallery;
      }
    }
    if(req.files?.gallery?.length)item.galleryImages=[...(item.galleryImages||[]),...(await Promise.all(req.files.gallery.map(x=>uploadElectronicsMedia(x,"electronics/gallery"))))];
    if(req.files?.audio?.length){
      if(item.audioNote)await deleteElectronicsMedia(item.audioNote);
      item.audioNote=await uploadElectronicsMedia(req.files.audio[0],"electronics/audio");
    }
    if(req.body.existingVideos!==undefined){
      let videos;
      try{videos=Array.isArray(req.body.existingVideos)?req.body.existingVideos:JSON.parse(req.body.existingVideos)}catch{videos=item.videos||[]}
      if(Array.isArray(videos)){
        for(const x of(item.videos||[]).filter(x=>!videos.includes(x)))await deleteElectronicsMedia(x);
        item.videos=videos;
      }
    }
    if(req.files?.video?.length)item.videos=[...(item.videos||[]),...(await Promise.all(req.files.video.map(x=>uploadElectronicsMedia(x,"electronics/videos"))))];
    if(req.body.videoLink!==undefined)item.videoLink=req.body.videoLink||null;
    ["category","brand","title","description","price","seller","sellerinfo","sellerUser","status","district","city"].forEach(f=>{if(req.body[f]!==undefined)item[f]=req.body[f]});
    await item.save();
    const result=await Electronics.findById(item._id).populate("brand","name logoUrl").lean();
    await attachAdminUsers([result]);
    res.json({success:true,message:"Electronics updated",item:prepareItem(result)});
  }catch(err){
    console.log("UPDATE ERROR:",err);
    res.status(500).json({success:false,message:"Update failed"});
  }
});
router.delete("/:id",verifyToken,isAdmin,async(req,res)=>{
  try{
    const item=await Electronics.findById(req.params.id);
    if(!item)return res.status(404).json({success:false,message:"Electronics not found"});
    if(item.bannerImage)await deleteElectronicsMedia(item.bannerImage);
    for(const x of item.galleryImages||[])await deleteElectronicsMedia(x);
    if(item.audioNote)await deleteElectronicsMedia(item.audioNote);
    for(const x of item.videos||[])await deleteElectronicsMedia(x);
    await item.deleteOne();
    res.json({success:true,message:"Electronics deleted"});
  }catch(err){
    console.log("DELETE ERROR:",err);
    res.status(500).json({success:false,message:"Delete failed"});
  }
});
export default router;