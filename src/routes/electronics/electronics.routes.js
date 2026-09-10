// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: ~100 LINES → ~30 LINES WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
import express from "express";
import mongoose from "mongoose";
import Electronics from "../../models/electronics/electronics_model.js";
import User from "../../models/user_model.js";
import {verifyToken,isAdmin} from "../../middleware/auth.js";
import {verifyTokenOptional} from "../../middleware/verifyTokenOptional.js";
import uploadElectronics from "../../middleware/electronics/uploadElectronics.js";
import {uploadElectronicsMedia,deleteElectronicsMedia} from "../../utils/electronics/electronicsUpload.js";
import {decryptSeller} from "../../utils/sellerCrypto.js";
const router=express.Router();
router.post("/add",verifyToken,isAdmin,uploadElectronics.fields([{name:"banner",maxCount:1},{name:"gallery",maxCount:10},{name:"audio",maxCount:1},{name:"video",maxCount:5}]),async(req,res)=>{
try{
const{brand,category,videoLink}=req.body;
if(!mongoose.Types.ObjectId.isValid(brand))return res.status(400).json({message:"Invalid brand id"});
if(!category)return res.status(400).json({message:"Category required"});
let bannerImage=null;
if(req.files?.banner)bannerImage=await uploadElectronicsMedia(req.files.banner[0],"electronics/banner");
const galleryImages=req.files?.gallery?await Promise.all(req.files.gallery.map(img=>uploadElectronicsMedia(img,"electronics/gallery"))):[];
let audioNote=null;
if(req.files?.audio)audioNote=await uploadElectronicsMedia(req.files.audio[0],"electronics/audio");
const videos=req.files?.video?await Promise.all(req.files.video.map(vid=>uploadElectronicsMedia(vid,"electronics/videos"))):[];
const item=await Electronics.create({...req.body,bannerImage,galleryImages,audioNote,videos,videoLink:videoLink||null,createdBy:req.user._id,status:"available"});
res.status(201).json({success:true,message:"Electronics added successfully",item});
}catch(err){console.log("ADD ERROR:",err);res.status(500).json({message:err.message});}
});
router.get("/",verifyTokenOptional,async(req,res)=>{
try{
const isAdminUser=req.user?.role==="admin",query={};
const{category,brand,district,minPrice,maxPrice}=req.query;
if(category)query.category={$in:category.split(",").map(c=>c.trim())};
if(brand)query.brand={$in:brand.split(",").map(b=>b.trim())};
if(district)query.district={$in:district.split(",").map(d=>d.trim())};
if(minPrice||maxPrice){query.price={};if(minPrice)query.price.$gte=Number(minPrice);if(maxPrice)query.price.$lte=Number(maxPrice);}
if(!isAdminUser)query.status={$nin:["draft","delete_requested"]};
const electronics=await Electronics.find(query).populate("brand","name logoUrl").sort({createdAt:-1}).lean();
const finalElectronics=electronics.map(item=>{if(isAdminUser&&typeof item.seller==="string"&&item.seller.includes(":"))try{item.seller=decryptSeller(item.seller);}catch(_){}return item;});
res.json({success:true,count:finalElectronics.length,electronics:finalElectronics});
}catch(err){console.log("GET ELECTRONICS ERROR:",err);res.status(500).json({success:false,message:"Failed to fetch electronics"});}
});
router.put("/:id",verifyToken,isAdmin,uploadElectronics.fields([{name:"banner",maxCount:1},{name:"gallery",maxCount:10},{name:"audio",maxCount:1},{name:"video",maxCount:5}]),async(req,res)=>{
try{
const item=await Electronics.findById(req.params.id);
if(!item)return res.status(404).json({message:"Electronics not found"});
if(req.files?.banner?.length){if(item.bannerImage)await deleteElectronicsMedia(item.bannerImage);item.bannerImage=await uploadElectronicsMedia(req.files.banner[0],"electronics/banner");}
if(req.body.existingGallery!==undefined){
let existingGallery;
try{existingGallery=Array.isArray(req.body.existingGallery)?req.body.existingGallery:JSON.parse(req.body.existingGallery);}catch{existingGallery=item.galleryImages||[];}
if(Array.isArray(existingGallery)){for(const img of(item.galleryImages||[]).filter(img=>!existingGallery.includes(img)))await deleteElectronicsMedia(img);item.galleryImages=existingGallery;}
}
if(req.files?.gallery?.length)item.galleryImages=[...(item.galleryImages||[]),...(await Promise.all(req.files.gallery.map(img=>uploadElectronicsMedia(img,"electronics/gallery"))))];
if(req.files?.audio?.length){if(item.audioNote)await deleteElectronicsMedia(item.audioNote);item.audioNote=await uploadElectronicsMedia(req.files.audio[0],"electronics/audio");}
if(req.body.existingVideos!==undefined){
let existingVideos;
try{existingVideos=Array.isArray(req.body.existingVideos)?req.body.existingVideos:JSON.parse(req.body.existingVideos);}catch{existingVideos=item.videos||[];}
if(Array.isArray(existingVideos)){for(const v of(item.videos||[]).filter(v=>!existingVideos.includes(v)))await deleteElectronicsMedia(v);item.videos=existingVideos;}
}
if(req.files?.video?.length)item.videos=[...(item.videos||[]),...(await Promise.all(req.files.video.map(vid=>uploadElectronicsMedia(vid,"electronics/videos"))))];
if(req.body.videoLink!==undefined)item.videoLink=req.body.videoLink||null;
["category","brand","title","description","price","seller","sellerinfo","status","district","city"].forEach(f=>{if(req.body[f]!==undefined)item[f]=req.body[f];});
await item.save();
res.json({success:true,message:"Electronics updated",item});
}catch(err){console.log("UPDATE ERROR:",err);res.status(500).json({message:"Update failed"});}
});
router.delete("/:id",verifyToken,isAdmin,async(req,res)=>{
try{
const item=await Electronics.findById(req.params.id);
if(!item)return res.status(404).json({message:"Electronics not found"});
if(item.bannerImage)await deleteElectronicsMedia(item.bannerImage);
for(const img of item.galleryImages||[])await deleteElectronicsMedia(img);
if(item.audioNote)await deleteElectronicsMedia(item.audioNote);
for(const v of item.videos||[])await deleteElectronicsMedia(v);
await item.deleteOne();
res.json({success:true,message:"Electronics deleted"});
}catch(err){console.log("DELETE ERROR:",err);res.status(500).json({message:"Delete failed"});}
});
router.post("/user-add",verifyToken,uploadElectronics.fields([{name:"gallery",maxCount:10},{name:"audio",maxCount:1},{name:"video",maxCount:3}]),async(req,res)=>{
try{
const{brand,category,videoLink}=req.body;
if(!mongoose.Types.ObjectId.isValid(brand))return res.status(400).json({message:"Invalid brand id"});
if(!category)return res.status(400).json({message:"Category required"});
const user=await User.findById(req.user.id);
if(!user)return res.status(404).json({message:"User not found"});
const galleryImages=req.files?.gallery?await Promise.all(req.files.gallery.map(img=>uploadElectronicsMedia(img,"electronics/gallery"))):[];
let audioNote=null;
if(req.files?.audio)audioNote=await uploadElectronicsMedia(req.files.audio[0],"electronics/audio");
const videos=req.files?.video?await Promise.all(req.files.video.map(vid=>uploadElectronicsMedia(vid,"electronics/videos"))):[];
const item=await Electronics.create({...req.body,bannerImage:null,galleryImages,audioNote,videos,videoLink:videoLink||null,seller:String(user.phone),sellerUser:user._id,createdBy:user._id,status:"draft",price:null});
res.status(201).json({success:true,message:"Electronics submitted for approval",item});
}catch(err){console.log("USER ADD ERROR:",err);res.status(500).json({message:err.message});}
});
router.get("/my",verifyToken,async(req,res)=>{
try{
const items=await Electronics.find({createdBy:req.user._id}).populate("brand","name logoUrl").sort({createdAt:-1}).lean();
const safeItems=items.map(item=>{if(typeof item.seller==="string"&&item.seller.includes(":"))item.seller="**********";return item;});
res.json({success:true,count:safeItems.length,items:safeItems});
}catch(err){res.status(500).json({message:"Fetch failed"});}
});
router.put("/:id/request-delete",verifyToken,async(req,res)=>{
try{
const item=await Electronics.findById(req.params.id);
if(!item)return res.status(404).json({message:"Electronics not found"});
if(item.createdBy.toString()!==req.user.id)return res.status(403).json({message:"Unauthorized"});
item.status="delete_requested";
await item.save();
res.json({success:true,message:"Delete request sent"});
}catch(err){res.status(500).json({message:"Request failed"});}
});
export default router;