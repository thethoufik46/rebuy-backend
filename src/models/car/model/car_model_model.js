// ======================= car_model_model.js =======================
// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: KEEP 100% LOGIC & FUNCTIONALITY.
import mongoose from "mongoose";
const carModelSchema=new mongoose.Schema({
  brand:{type:mongoose.Schema.Types.ObjectId,ref:"CarBrand",required:true},
  title:{type:String,required:true,trim:true},
  imageUrl:{type:String,required:false,default:"",trim:true},
  taxiImageUrl:{type:String,required:false,default:"",trim:true},
  seater:{type:String,enum:["","5 seater","7 seater"],required:false,default:"",trim:true},
  order:{type:Number,default:null},
},{timestamps:true});
const CarModel=mongoose.model("CarModel",carModelSchema,"carmodels");
export default CarModel;