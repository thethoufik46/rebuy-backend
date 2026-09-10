// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: ~100 LINES → ~30 LINES WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
import mongoose from "mongoose";
import RecentlyViewed from "../models/recently_viewed_model.js";
import Car from "../models/car/car_model.js";
import Bike from "../models/bike/bike_model.js";
import Property from "../models/property_model.js";
import Electronics from "../models/electronics/electronics_model.js";
export const addRecentlyViewed=async(req,res)=>{
try{
const userId=req.userId,{itemId,itemType}=req.body;
if(!itemId||!itemType)return res.status(400).json({success:false,message:"itemId and itemType required"});
if(!mongoose.Types.ObjectId.isValid(itemId))return res.status(400).json({success:false,message:"Invalid itemId"});
let data=await RecentlyViewed.findOne({userId});
if(!data)data=new RecentlyViewed({userId,items:[]});
data.items=data.items.filter(i=>i.itemId.toString()!==itemId.toString());
data.items.unshift({itemId,itemType,viewedAt:new Date()});
data.items=data.items.slice(0,10);
await data.save();
res.json({success:true,items:data.items});
}catch(err){console.error("ADD RECENT ERROR:",err);res.status(500).json({success:false,message:err.message});}
};
export const getRecentlyViewed=async(req,res)=>{
try{
const userId=req.userId,data=await RecentlyViewed.findOne({userId});
if(!data||!data.items.length)return res.json({success:true,items:[]});
const items=data.items;
const carIds=items.filter(i=>i.itemType==="car").map(i=>i.itemId);
const bikeIds=items.filter(i=>i.itemType==="bike").map(i=>i.itemId);
const propertyIds=items.filter(i=>i.itemType==="property").map(i=>i.itemId);
const electronicsIds=items.filter(i=>i.itemType==="electronics").map(i=>i.itemId);
const[cars,bikes,properties,electronics]=await Promise.all([
Car.find({_id:{$in:carIds}}).populate("brand","name logoUrl"),
Bike.find({_id:{$in:bikeIds}}).populate("brand","name logoUrl"),
Property.find({_id:{$in:propertyIds}}),
Electronics.find({_id:{$in:electronicsIds}}).populate("brand","name logoUrl")
]);
const carMap=new Map(cars.map(c=>[c._id.toString(),c]));
const bikeMap=new Map(bikes.map(b=>[b._id.toString(),b]));
const propertyMap=new Map(properties.map(p=>[p._id.toString(),p]));
const electronicsMap=new Map(electronics.map(e=>[e._id.toString(),e]));
const finalItems=items.map(i=>{
const id=i.itemId.toString();
if(i.itemType==="car"&&carMap.has(id))return{type:"car",data:carMap.get(id)};
if(i.itemType==="bike"&&bikeMap.has(id))return{type:"bike",data:bikeMap.get(id)};
if(i.itemType==="property"&&propertyMap.has(id))return{type:"property",data:propertyMap.get(id)};
if(i.itemType==="electronics"&&electronicsMap.has(id))return{type:"electronics",data:electronicsMap.get(id)};
return null;
}).filter(Boolean);
res.json({success:true,items:finalItems});
}catch(err){console.error("GET RECENT ERROR:",err);res.status(500).json({success:false,message:err.message});}
};