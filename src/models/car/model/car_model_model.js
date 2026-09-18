// ======================= car_model_model.js =======================
import mongoose from "mongoose";
// ============================================================
// CAR MODEL SCHEMA
// ============================================================
const carModelSchema=new mongoose.Schema({
  // CAR BRAND — REQUIRED
  brand:{type:mongoose.Schema.Types.ObjectId,ref:"CarBrand",required:true},
  // CAR MODEL NAME — REQUIRED
  title:{type:String,required:true,trim:true},
  // CAR MODEL IMAGE — OPTIONAL
  imageUrl:{type:String,required:false,default:"",trim:true},
  // SEATER — OPTIONAL
  seater:{type:String,enum:["5 seater","7 seater"],required:false,default:"",trim:true},
  // ORDER — OPTIONAL, INTEGER 1 TO 99
  order:{type:Number,min:1,max:99,validate:{validator:Number.isInteger,message:"Order must be an integer between 1 and 99"},required:false,default:null},
},{timestamps:true});
// ============================================================
// MONGODB COLLECTION = carmodels
// ============================================================
const CarModel=mongoose.model("CarModel",carModelSchema,"carmodels");
export default CarModel;