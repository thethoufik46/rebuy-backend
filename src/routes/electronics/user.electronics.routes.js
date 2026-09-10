// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: ~100 LINES → ~30 LINES WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
import express from "express";
import mongoose from "mongoose";
import Electronics from "../../models/electronics/electronics_model.js";
import User from "../../models/user_model.js";
import {verifyToken} from "../../middleware/auth.js";
import {verifyTokenOptional} from "../../middleware/verifyTokenOptional.js";
import uploadElectronics from "../../middleware/electronics/uploadElectronics.js";
import {uploadElectronicsMedia} from "../../utils/electronics/electronicsUpload.js";
const router=express.Router();
const fields=[{name:"gallery",maxCount:10},{name:"audio",maxCount:1},{name:"video",maxCount:3}];
router.get("/",verifyTokenOptional,async(req,res)=>{
try{
const isAdmin=req.user?.role==="admin",query={},{
category,brand,district,minPrice,maxPrice}=req.query;
if(category)query.category={$in:category.split(",").map(x=>x.trim())};
if(brand)query.brand={$in:brand.split(",").map(x=>x.trim())};
if(district)query.district={$in:district.split(",").map(x=>x.trim())};
if(minPrice||maxPrice){query.price={};if(minPrice)query.price.$gte=Number(minPrice);if(maxPrice)query.price.$lte=Number(maxPrice);}
if(!isAdmin)query.status={$nin:["draft","delete_requested"]};
const electronics=await Electronics.find(query).populate("brand","name logoUrl").sort({createdAt:-1}).lean();
res.json({success:true,count:electronics.length,electronics});
}catch(err){console.log("GET ELECTRONICS ERROR:",err);res.status(500).json({success:false,message:"Failed to fetch electronics"});}
});
router.post("/user-add",verifyToken,uploadElectronics.fields(fields),async(req,res)=>{
try{
const{brand,category,videoLink}=req.body;
if(!mongoose.Types.ObjectId.isValid(brand))return res.status(400).json({message:"Invalid brand id"});
if(!category)return res.status(400).json({message:"Category required"});
const user=await User.findById(req.user.id);
if(!user)return res.status(404).json({message:"User not found"});
const galleryImages=req.files?.gallery?await Promise.all(req.files.gallery.map(x=>uploadElectronicsMedia(x,"electronics/gallery"))):[];
const audioNote=req.files?.audio?await uploadElectronicsMedia(req.files.audio[0],"electronics/audio"):null;
const videos=req.files?.video?await Promise.all(req.files.video.map(x=>uploadElectronicsMedia(x,"electronics/videos"))):[];
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