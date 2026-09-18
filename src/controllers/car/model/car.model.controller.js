// ======================= car.model.controller.js =======================
import CarModel from "../../../models/car/model/car_model_model.js";
import CarBrand from "../../../models/car/brand/car_brand_model.js";
import {uploadCarModelImage,deleteCarModelImage} from "../../../utils/car/model/carModel.js";
// ============================================================
// ADD CAR MODEL
// Brand + Title REQUIRED
// Seater + Order + Image OPTIONAL
// ============================================================
export const addCarModel=async(req,res)=>{
  try{
    const{brandId,title,seater,order}=req.body;
    if(!brandId||!title||!title.trim())return res.status(400).json({success:false,message:"Brand and car model title are required"});
    if(seater&&!["5 seater","7 seater"].includes(seater))return res.status(400).json({success:false,message:"Seater must be 5 seater or 7 seater"});
    let orderValue=null;
    if(order!==undefined&&order!==null&&order!==""){
      const n=Number(order);
      if(!Number.isFinite(n))return res.status(400).json({success:false,message:"Order must be a number"});
      orderValue=n;
    }
    const brand=await CarBrand.findById(brandId);
    if(!brand)return res.status(404).json({success:false,message:"Brand not found"});
    const cleanTitle=title.trim();
    const existing=await CarModel.findOne({brand:brandId,title:new RegExp(`^${escapeRegex(cleanTitle)}$`,"i")});
    if(existing)return res.status(409).json({success:false,message:"Car model already exists"});
    let imageUrl="";
    if(req.file)imageUrl=await uploadCarModelImage(req.file);
    const carModel=await CarModel.create({brand:brandId,title:cleanTitle,imageUrl,seater:seater||"",order:orderValue});
    return res.status(201).json({success:true,message:"Car model added successfully",carModel});
  }catch(err){
    console.error("ADD CAR MODEL ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
// ============================================================
// GET ALL CAR MODELS
// ============================================================
export const getAllCarModels=async(req,res)=>{
  try{
    const carModels=await CarModel.find().sort({order:1,createdAt:-1}).populate("brand","name logoUrl");
    const data=carModels.map(model=>({_id:model._id.toString(),brandId:model.brand?._id?.toString()||"",brandName:model.brand?.name||"",brandLogo:model.brand?.logoUrl||"",modelName:model.title||"",modelImage:model.imageUrl||"",seater:model.seater||"",order:model.order??null}));
    return res.status(200).json({success:true,carModels:data});
  }catch(err){
    console.error("GET ALL CAR MODELS ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
// ============================================================
// GET CAR MODELS BY BRAND
// ============================================================
export const getCarModelsByBrand=async(req,res)=>{
  try{
    const{brandId}=req.params;
    const brand=await CarBrand.findById(brandId);
    if(!brand)return res.status(404).json({success:false,message:"Brand not found"});
    const carModels=await CarModel.find({brand:brandId}).sort({order:1,createdAt:-1}).populate("brand","name logoUrl");
    const priority=["crysta","innova","ertiga","swift","wagon r"];
    carModels.sort((a,b)=>{
      const aTitle=(a.title||"").trim().toLowerCase(),bTitle=(b.title||"").trim().toLowerCase();
      const aIndex=priority.findIndex(x=>aTitle.startsWith(x)),bIndex=priority.findIndex(x=>bTitle.startsWith(x));
      if(aIndex!==-1&&bIndex!==-1)return aIndex-bIndex;
      if(aIndex!==-1)return-1;
      if(bIndex!==-1)return 1;
      if(a.order!=null&&b.order!=null&&a.order!==b.order)return a.order-b.order;
      if(a.order!=null)return-1;
      if(b.order!=null)return 1;
      return aTitle.localeCompare(bTitle,"en",{sensitivity:"base"});
    });
    const data=carModels.map(model=>({_id:model._id.toString(),brandId:model.brand?._id?.toString()||"",brandName:model.brand?.name||"",brandLogo:model.brand?.logoUrl||"",modelName:model.title||"",modelImage:model.imageUrl||"",seater:model.seater||"",order:model.order??null}));
    return res.status(200).json({success:true,carModels:data});
  }catch(err){
    console.error("GET CAR MODELS BY BRAND ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
// ============================================================
// GET VISIBLE CAR MODELS
// HIDE LOAD VEHICLES + OTHER STATE
// ============================================================
export const getONEBrandhideCarModels=async(req,res)=>{
  try{
    const loadBrand=await CarBrand.findOne({name:"Load vehicles லோடு வாகனங்கள்"});
    const otherStateBrand=await CarBrand.findOne({name:"Other State டெல்லி"});
    const hiddenBrandIds=[];
    if(loadBrand)hiddenBrandIds.push(loadBrand._id);
    if(otherStateBrand)hiddenBrandIds.push(otherStateBrand._id);
    const query=hiddenBrandIds.length?{brand:{$nin:hiddenBrandIds}}:{};
    const carModels=await CarModel.find(query).sort({order:1,createdAt:-1}).populate("brand","name logoUrl");
    const data=carModels.map(model=>({_id:model._id.toString(),brandId:model.brand?._id?.toString()||"",brandName:model.brand?.name||"",brandLogo:model.brand?.logoUrl||"",modelName:model.title||"",modelImage:model.imageUrl||"",seater:model.seater||"",order:model.order??null}));
    return res.status(200).json({success:true,carModels:data});
  }catch(err){
    console.error("GET VISIBLE CAR MODELS ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
// ============================================================
// LOAD VEHICLES CAR MODELS
// ============================================================
export const getLoadVehiclesCarModels=async(req,res)=>{
  try{
    const brand=await CarBrand.findOne({name:/load vehicles/i});
    if(!brand)return res.status(200).json({success:true,carModels:[]});
    const carModels=await CarModel.find({brand:brand._id}).sort({order:1,createdAt:-1}).populate("brand","name logoUrl");
    const data=carModels.map(model=>({_id:model._id.toString(),brandId:model.brand?._id?.toString()||"",brandName:model.brand?.name||"",brandLogo:model.brand?.logoUrl||"",modelName:model.title||"",modelImage:model.imageUrl||"",seater:model.seater||"",order:model.order??null}));
    return res.status(200).json({success:true,carModels:data});
  }catch(err){
    console.error("GET LOAD VEHICLES CAR MODELS ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
// ============================================================
// OTHER STATE CAR MODELS
// ============================================================
export const getOtherStateCarModels=async(req,res)=>{
  try{
    const brand=await CarBrand.findOne({name:"Other State டெல்லி"});
    if(!brand)return res.status(200).json({success:true,carModels:[]});
    const carModels=await CarModel.find({brand:brand._id}).sort({order:1,createdAt:-1}).populate("brand","name logoUrl");
    const data=carModels.map(model=>({_id:model._id.toString(),brandId:model.brand?._id?.toString()||"",brandName:model.brand?.name||"",brandLogo:model.brand?.logoUrl||"",modelName:model.title||"",modelImage:model.imageUrl||"",seater:model.seater||"",order:model.order??null}));
    return res.status(200).json({success:true,carModels:data});
  }catch(err){
    console.error("GET OTHER STATE CAR MODELS ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
// ============================================================
// SELECTED CAR MODELS
// ============================================================
export const getSelectedCarModels=async(req,res)=>{
  try{
    const carModels=await CarModel.find({title:{$in:["Innova இன்னோவா","Crysta கிரிஸ்டா","Swift ஸ்விப்ட்","Ertiga எர்டிகா"]}}).populate("brand","name logoUrl").sort({order:1,createdAt:-1});
    const data=carModels.map(model=>({_id:model._id.toString(),brandId:model.brand?._id?.toString()||"",brandName:model.brand?.name||"",brandLogo:model.brand?.logoUrl||"",modelName:model.title||"",modelImage:model.imageUrl||"",seater:model.seater||"",order:model.order??null}));
    return res.status(200).json({success:true,carModels:data});
  }catch(err){
    console.error("GET SELECTED CAR MODELS ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
// ============================================================
// UPDATE CAR MODEL
// Brand + Title REQUIRED
// Seater + Order + Image OPTIONAL
// ============================================================
export const updateCarModel=async(req,res)=>{
  try{
    const{id}=req.params;
    const{title,brandId,seater,order}=req.body;
    const carModel=await CarModel.findById(id);
    if(!carModel)return res.status(404).json({success:false,message:"Car model not found"});
    if(!brandId||!title||!title.trim())return res.status(400).json({success:false,message:"Brand and car model title are required"});
    if(seater&&!["5 seater","7 seater"].includes(seater))return res.status(400).json({success:false,message:"Seater must be 5 seater or 7 seater"});
    let orderValue=null;
    if(order!==undefined&&order!==null&&order!==""){
      const n=Number(order);
      if(!Number.isFinite(n))return res.status(400).json({success:false,message:"Order must be a number"});
      orderValue=n;
    }
    const brand=await CarBrand.findById(brandId);
    if(!brand)return res.status(404).json({success:false,message:"Brand not found"});
    const cleanTitle=title.trim();
    const duplicate=await CarModel.findOne({_id:{$ne:id},brand:brandId,title:new RegExp(`^${escapeRegex(cleanTitle)}$`,"i")});
    if(duplicate)return res.status(409).json({success:false,message:"Car model already exists"});
    carModel.title=cleanTitle;
    carModel.brand=brandId;
    carModel.order=orderValue;
    if(seater!==undefined)carModel.seater=seater||"";
    if(req.file){
      if(carModel.imageUrl)await deleteCarModelImage(carModel.imageUrl);
      carModel.imageUrl=await uploadCarModelImage(req.file);
    }
    await carModel.save();
    return res.status(200).json({success:true,message:"Car model updated successfully",carModel});
  }catch(err){
    console.error("UPDATE CAR MODEL ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
// ============================================================
// DELETE CAR MODEL
// ============================================================
export const deleteCarModel=async(req,res)=>{
  try{
    const{id}=req.params;
    const carModel=await CarModel.findById(id);
    if(!carModel)return res.status(404).json({success:false,message:"Car model not found"});
    if(carModel.imageUrl)await deleteCarModelImage(carModel.imageUrl);
    await carModel.deleteOne();
    return res.status(200).json({success:true,message:"Car model deleted"});
  }catch(err){
    console.error("DELETE CAR MODEL ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
// ============================================================
// ESCAPE REGEX
// ============================================================
function escapeRegex(value){
  return value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
}