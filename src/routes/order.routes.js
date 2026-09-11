// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: ~100 LINES → ~30 LINES WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
import express from "express";
import mongoose from "mongoose";
import Order from "../models/order_model.js";
import Car from "../models/car/car_model.js";
import Bike from "../models/bike/bike_model.js";
import Property from "../models/property/property_model.js";
import Electronics from "../models/electronics/electronics_model.js";
import {verifyToken,isAdmin} from "../middleware/auth.js";
const router=express.Router();
const ITEM_MODELS={car:Car,bike:Bike,property:Property,electronics:Electronics};
const ALLOWED_ITEM_TYPES=["car","bike","property","electronics"];
const ALLOWED_STATUS=["booking","verification","advance","finance","delivery","cancel_requested","cancelled"];
const getItemModel=t=>ITEM_MODELS[t];
const validId=id=>mongoose.Types.ObjectId.isValid(id);
const populateItem=(query,type)=>{
  if(type==="car")query=query.populate("brand","name logoUrl").populate("variant","title imageUrl");
  if(type==="bike")query=query.populate("brand","name logoUrl").populate("model","title");
  if(type==="electronics")query=query.populate("brand","name logoUrl");
  return query;
};
router.post("/",verifyToken,async(req,res)=>{
  try{
    const {itemId,itemType}=req.body;
    if(!itemType||!ALLOWED_ITEM_TYPES.includes(itemType))return res.status(400).json({success:false,message:"Invalid itemType. Use car, bike, property or electronics"});
    if(!itemId||!validId(itemId))return res.status(400).json({success:false,message:"Valid itemId is required"});
    const ItemModel=getItemModel(itemType);
    if(!ItemModel)return res.status(400).json({success:false,message:"Invalid item type"});
    const item=await ItemModel.findById(itemId).lean();
    if(!item)return res.status(404).json({success:false,message:`${itemType} not found`});
    if(item.status==="draft"||item.status==="delete_requested")return res.status(400).json({success:false,message:"This item is not available for ordering"});
    const existingOrder=await Order.findOne({user:req.userId,item:itemId,itemType,status:{$ne:"cancelled"}});
    if(existingOrder)return res.status(400).json({success:false,message:`You already ordered this ${itemType}`,order:existingOrder});
    const order=await Order.create({user:req.userId,item:itemId,itemType,status:"booking",isUserVisible:true});
    return res.status(201).json({success:true,message:"Order created successfully",order});
  }catch(err){
    console.error("CREATE ORDER ERROR:",err);
    if(err.code===11000)return res.status(400).json({success:false,message:"You already ordered this item"});
    return res.status(500).json({success:false,message:err.message});
  }
});
router.get("/my",verifyToken,async(req,res)=>{
  try{
    const orders=await Order.find({user:req.userId,isUserVisible:true}).sort({createdAt:-1}).lean();
    const finalOrders=await Promise.all(orders.map(async order=>{
      try{
        const ItemModel=getItemModel(order.itemType);
        if(!ItemModel)return {...order,item:null};
        const item=await populateItem(ItemModel.findById(order.item),order.itemType).lean();
        return {...order,item:item||null};
      }catch(err){
        console.error(`MY ORDER ITEM ERROR [${order._id}]:`,err.message);
        return {...order,item:null};
      }
    }));
    return res.json({success:true,count:finalOrders.length,orders:finalOrders});
  }catch(err){
    console.error("GET MY ORDERS ERROR:",err);
    return res.status(500).json({success:false,message:err.message});
  }
});
router.get("/",verifyToken,isAdmin,async(req,res)=>{
  try{
    const orders=await Order.find().populate("user","name phone email").sort({createdAt:-1}).lean();
    const finalOrders=await Promise.all(orders.map(async order=>{
      try{
        const ItemModel=getItemModel(order.itemType);
        if(!ItemModel)return {...order,item:null};
        const item=await populateItem(ItemModel.findById(order.item),order.itemType).lean();
        return {...order,item:item||null};
      }catch(err){
        console.error(`ADMIN ORDER ITEM ERROR [${order._id}]:`,err.message);
        return {...order,item:null};
      }
    }));
    return res.json({success:true,count:finalOrders.length,orders:finalOrders});
  }catch(err){
    console.error("GET ALL ORDERS ERROR:",err);
    return res.status(500).json({success:false,message:err.message});
  }
});
router.get("/:id",verifyToken,async(req,res)=>{
  try{
    if(!validId(req.params.id))return res.status(400).json({success:false,message:"Invalid order id"});
    const order=await Order.findOne({_id:req.params.id,user:req.userId,isUserVisible:true}).lean();
    if(!order)return res.status(404).json({success:false,message:"Order not found"});
    const ItemModel=getItemModel(order.itemType);
    let item=null;
    if(ItemModel)item=await populateItem(ItemModel.findById(order.item),order.itemType).lean();
    return res.json({success:true,order:{...order,item}});
  }catch(err){
    console.error("GET SINGLE ORDER ERROR:",err);
    return res.status(500).json({success:false,message:err.message});
  }
});
router.put("/:id/cancel",verifyToken,async(req,res)=>{
  try{
    if(!validId(req.params.id))return res.status(400).json({success:false,message:"Invalid order id"});
    const order=await Order.findOne({_id:req.params.id,user:req.userId});
    if(!order)return res.status(404).json({success:false,message:"Order not found"});
    if(order.status==="cancelled")return res.status(400).json({success:false,message:"Order is already cancelled"});
    if(order.status==="cancel_requested")return res.status(400).json({success:false,message:"Cancel request already sent"});
    if(order.status==="delivery")return res.status(400).json({success:false,message:"Delivered order cannot be cancelled"});
    order.status="cancel_requested";
    await order.save();
    return res.json({success:true,message:"Cancel request sent. Waiting for admin approval",order});
  }catch(err){
    console.error("CANCEL ORDER ERROR:",err);
    return res.status(500).json({success:false,message:err.message});
  }
});
router.put("/:id/status",verifyToken,isAdmin,async(req,res)=>{
  try{
    const {status}=req.body;
    if(!ALLOWED_STATUS.includes(status))return res.status(400).json({success:false,message:"Invalid status",allowedStatus:ALLOWED_STATUS});
    if(!validId(req.params.id))return res.status(400).json({success:false,message:"Invalid order id"});
    const order=await Order.findById(req.params.id);
    if(!order)return res.status(404).json({success:false,message:"Order not found"});
    order.status=status;
    order.isUserVisible=status!=="cancelled";
    await order.save();
    return res.json({success:true,message:"Order status updated successfully",order});
  }catch(err){
    console.error("UPDATE ORDER STATUS ERROR:",err);
    return res.status(500).json({success:false,message:err.message});
  }
});
router.delete("/:id",verifyToken,isAdmin,async(req,res)=>{
  try{
    if(!validId(req.params.id))return res.status(400).json({success:false,message:"Invalid order id"});
    const order=await Order.findById(req.params.id);
    if(!order)return res.status(404).json({success:false,message:"Order not found"});
    if(order.status!=="cancelled")return res.status(400).json({success:false,message:"Only cancelled orders can be deleted"});
    await order.deleteOne();
    return res.json({success:true,message:"Order permanently deleted"});
  }catch(err){
    console.error("DELETE ORDER ERROR:",err);
    return res.status(500).json({success:false,message:err.message});
  }
});
export default router;