// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: ~100 LINES → ~30 LINES WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
import express from "express";
import Property from "../../models/property/property_model.js";
import {verifyToken,isAdmin} from "../../middleware/auth.js";
import uploadProperty from "../../middleware/property/uploadProperty.js";
import {uploadPropertyImage,deletePropertyImage} from "../../utils/property/propertyUpload.js";
const router=express.Router();
const fields=[{name:"banner",maxCount:1},{name:"gallery",maxCount:10},{name:"audio",maxCount:1},{name:"video",maxCount:5}];
const parseDocuments=v=>{if(v==null||v==="")return[];if(Array.isArray(v))return v;if(typeof v==="string"){try{const x=JSON.parse(v);if(Array.isArray(x))return x;}catch{}return[v];}return[];};
router.post("/add",verifyToken,isAdmin,uploadProperty.fields(fields),async(req,res)=>{
  try{
    if(!req.files?.banner?.length)return res.status(400).json({success:false,message:"Banner image required"});
    const bannerImage=await uploadPropertyImage(req.files.banner[0],"property/banner");
    const galleryImages=req.files?.gallery?.length?await Promise.all(req.files.gallery.map(x=>uploadPropertyImage(x,"property/gallery"))):[];
    const audioNote=req.files?.audio?.length?await uploadPropertyImage(req.files.audio[0],"property/audio"):null;
    const videos=req.files?.video?.length?await Promise.all(req.files.video.map(x=>uploadPropertyImage(x,"property/videos"))):[];
    const property=await Property.create({...req.body,documents:parseDocuments(req.body.documents),bannerImage,galleryImages,audioNote,videos,videoLink:req.body.videoLink||null,createdBy:req.user.id,status:"available"});
    res.status(201).json({success:true,message:"Property added successfully",property});
  }catch(err){console.error("ADD PROPERTY ERROR:",err);res.status(500).json({success:false,message:err.message});}
});
router.get("/all",verifyToken,isAdmin,async(req,res)=>{
  try{
    const properties=await Property.find({}).sort({status:1,createdAt:-1}).lean();
    res.json({success:true,count:properties.length,properties});
  }catch(err){console.error("GET ADMIN PROPERTY ERROR:",err);res.status(500).json({success:false,message:"Failed to fetch properties"});}
});
router.get("/:id",verifyToken,isAdmin,async(req,res)=>{
  try{
    const property=await Property.findById(req.params.id);
    if(!property)return res.status(404).json({success:false,message:"Property not found"});
    res.json({success:true,property});
  }catch(err){res.status(500).json({success:false,message:"Failed to fetch property"});}
});
router.put("/:id",verifyToken,isAdmin,uploadProperty.fields(fields),async(req,res)=>{
  try{
    const property=await Property.findById(req.params.id);
    if(!property)return res.status(404).json({success:false,message:"Property not found"});
    if(req.files?.banner?.length){if(property.bannerImage)await deletePropertyImage(property.bannerImage);property.bannerImage=await uploadPropertyImage(req.files.banner[0],"property/banner");}
    if(req.body.existingGallery!==undefined){
      let existing=[];try{existing=Array.isArray(req.body.existingGallery)?req.body.existingGallery:JSON.parse(req.body.existingGallery);}catch{existing=property.galleryImages||[];}
      for(const img of(property.galleryImages||[]).filter(x=>!existing.includes(x)))await deletePropertyImage(img);
      property.galleryImages=existing;
    }
    if(req.files?.gallery?.length)property.galleryImages=[...(property.galleryImages||[]),...(await Promise.all(req.files.gallery.map(x=>uploadPropertyImage(x,"property/gallery"))))];
    if(req.files?.audio?.length){if(property.audioNote)await deletePropertyImage(property.audioNote);property.audioNote=await uploadPropertyImage(req.files.audio[0],"property/audio");}
    if(req.body.existingVideos!==undefined){
      let existing=[];try{existing=Array.isArray(req.body.existingVideos)?req.body.existingVideos:JSON.parse(req.body.existingVideos);}catch{existing=property.videos||[];}
      for(const vid of(property.videos||[]).filter(x=>!existing.includes(x)))await deletePropertyImage(vid);
      property.videos=existing;
    }
    if(req.files?.video?.length)property.videos=[...(property.videos||[]),...(await Promise.all(req.files.video.map(x=>uploadPropertyImage(x,"property/videos"))))];
    if(req.body.videoLink!==undefined)property.videoLink=req.body.videoLink||null;
    const allowed=["mainType","category","price","yearBuilt","bedrooms","landArea","homeArea","roadAccess","direction","district","city","status","sellerInfo","description"];
    allowed.forEach(k=>{if(req.body[k]!==undefined)property[k]=req.body[k];});
    if(req.body.documents!==undefined)property.documents=parseDocuments(req.body.documents);
    await property.save();
    res.json({success:true,message:"Property updated successfully",property});
  }catch(err){console.error("UPDATE PROPERTY ERROR:",err);res.status(500).json({success:false,message:"Property update failed"});}
});
router.delete("/:id",verifyToken,isAdmin,async(req,res)=>{
  try{
    const property=await Property.findById(req.params.id);
    if(!property)return res.status(404).json({success:false,message:"Property not found"});
    if(property.bannerImage)await deletePropertyImage(property.bannerImage);
    for(const img of property.galleryImages||[])await deletePropertyImage(img);
    if(property.audioNote)await deletePropertyImage(property.audioNote);
    for(const vid of property.videos||[])await deletePropertyImage(vid);
    await property.deleteOne();
    res.json({success:true,message:"Property deleted successfully"});
  }catch(err){console.error("DELETE PROPERTY ERROR:",err);res.status(500).json({success:false,message:"Delete failed"});}
});
export default router;