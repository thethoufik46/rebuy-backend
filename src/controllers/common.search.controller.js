// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: ~100 LINES → ~30 LINES WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
import Car from "../models/car/car_model.js";
import Bike from "../models/bike/bike_model.js";
import Electronics from "../models/electronics/electronics_model.js";
import Property from "../models/property_model.js";
import CarBrand from "../models/car/brand/car_brand_model.js";
import CarModel from "../models/car/model/car_model_model.js";
import CarVariant from "../models/car/variant/car_variant_model.js";
import BikeBrand from "../models/bike/brand/bike_brand_model.js";
import BikeModel from "../models/bike/bike_model.js";
export const commonSearch=async(req,res)=>{
try{
const q=String(req.query.q||"").trim();
if(!q)return res.status(400).json({success:false,message:"Search query is required",results:[]});
const regex=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i");
const carBrands=await CarBrand.find({name:regex}).select("_id name logoUrl").lean();
const carBrandIds=carBrands.map(b=>b._id);
const carModels=await CarModel.find({$or:[{title:regex},...(carBrandIds.length?[{brand:{$in:carBrandIds}}]:[])]}).select("_id brand title imageUrl").lean();
const carModelIds=carModels.map(m=>m._id);
const carVariants=await CarVariant.find({$or:[{title:regex},...(carModelIds.length?[{carModel:{$in:carModelIds}}]:[])]}).select("_id carModel title imageUrl").lean();
const carVariantIds=carVariants.map(v=>v._id);
const cars=await Car.find({status:"available",$or:[{model:regex},{description:regex},{district:regex},{city:regex},...(carBrandIds.length?[{brand:{$in:carBrandIds}}]:[]),...(carVariantIds.length?[{variant:{$in:carVariantIds}}]:[])]}).populate("brand","name logoUrl").populate("variant","title imageUrl carModel").limit(50).lean();
const bikeBrands=await BikeBrand.find({name:regex}).select("_id name logoUrl").lean();
const bikeBrandIds=bikeBrands.map(b=>b._id);
const bikeModels=await BikeModel.find({$or:[{title:regex},...(bikeBrandIds.length?[{brand:{$in:bikeBrandIds}}]:[])]}).select("_id title brand imageUrl").lean();
const bikeModelIds=bikeModels.map(m=>m._id);
const bikes=await Bike.find({status:"available",$or:[{variant:regex},{description:regex},{district:regex},{city:regex},...(bikeBrandIds.length?[{brand:{$in:bikeBrandIds}}]:[]),...(bikeModelIds.length?[{model:{$in:bikeModelIds}}]:[])]}).populate("brand","name logoUrl").populate("model","title imageUrl brand").limit(50).lean();
const electronics=await Electronics.find({status:"available",$or:[{category:regex},{title:regex},{description:regex},{district:regex},{city:regex}]}).populate("brand","name logoUrl").limit(50).lean();
const properties=await Property.find({status:"available",$or:[{mainType:regex},{category:regex},{bedrooms:regex},{description:regex},{district:regex},{city:regex}]}).limit(50).lean();
const results=[
...cars.map(item=>({type:"car",id:item._id,item})),
...bikes.map(item=>({type:"bike",id:item._id,item})),
...electronics.map(item=>({type:"electronics",id:item._id,item})),
...properties.map(item=>({type:"property",id:item._id,item}))
];
const seen=new Set(),uniqueResults=results.filter(result=>{const key=`${result.type}_${result.id}`;if(seen.has(key))return false;seen.add(key);return true;});
return res.status(200).json({success:true,query:q,total:uniqueResults.length,results:uniqueResults});
}catch(error){
console.error("COMMON SEARCH ERROR:",error);
return res.status(500).json({success:false,message:"Common search failed",error:error.message,results:[]});
}
};