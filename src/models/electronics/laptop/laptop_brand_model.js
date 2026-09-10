// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: ~100 LINES → ~30 LINES WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
import mongoose from "mongoose";
const laptopBrandSchema=new mongoose.Schema({name:{type:String,required:true,unique:true,trim:true},logoUrl:{type:String,required:true}},{timestamps:true});
export default mongoose.model("LaptopBrand",laptopBrandSchema);