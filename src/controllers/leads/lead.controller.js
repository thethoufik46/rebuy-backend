// ============================================================
// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: ~100 LINES → ~30 LINES WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
// ============================================================
import mongoose from "mongoose";
import Lead from "../../models/leads/lead_model.js";
import {uploadLeadAudio,deleteLeadAudio} from "../../utils/leads/sendLeads.js";
const isValidObjectId=id=>mongoose.Types.ObjectId.isValid(id);
export const addLead=async(req,res)=>{
  let uploadedAudioUrl=null;
  try{
    const {phone,district,address,type,payment,buyer,board,transmission,status,review,description,reason,publish}=req.body;
    if(!phone||!description)return res.status(400).json({success:false,message:"Phone and description are required"});
    const cleanPhone=phone.toString().replace(/\D/g,"");
    const existingLead=await Lead.findOne({phone:cleanPhone});
    if(existingLead)return res.status(400).json({success:false,message:existingLead.isDeleted?"Phone number already exists in Recently Deleted. Please restore it instead.":"Phone number already registered",...(existingLead.isDeleted?{leadId:existingLead._id}:{})});
    if(req.file)uploadedAudioUrl=await uploadLeadAudio(req.file);
    const reasonHistory=reason?.toString().trim()?[{message:reason.toString().trim(),createdAt:new Date()}]:[];
    const lead=await Lead.create({phone:cleanPhone,description:description.toString().trim(),district:district||"",address:address||"",type:type||null,payment:payment||null,buyer:buyer||null,board:board||null,transmission:transmission||null,status:status||"pending",review:review||"",reasonHistory,publish:publish==="on"?"on":"off",audioNote:uploadedAudioUrl});
    return res.status(201).json({success:true,message:"Lead added successfully",lead});
  }catch(err){
    console.error("ADD LEAD ERROR 👉",err);
    if(uploadedAudioUrl)await deleteLeadAudio(uploadedAudioUrl);
    if(err.code===11000)return res.status(400).json({success:false,message:"Phone number already registered"});
    return res.status(500).json({success:false,message:err.message});
  }
};
export const getLeads=async(req,res)=>{
  try{
    const leads=await Lead.find({isDeleted:false}).sort({createdAt:-1});
    return res.json({success:true,total:leads.length,leads});
  }catch(err){
    console.error("GET LEADS ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
export const getDeletedLeads=async(req,res)=>{
  try{
    const leads=await Lead.find({isDeleted:true}).sort({deletedAt:-1});
    return res.json({success:true,total:leads.length,leads});
  }catch(err){
    console.error("GET DELETED LEADS ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
export const getLead=async(req,res)=>{
  try{
    const {id}=req.params;
    if(!isValidObjectId(id))return res.status(400).json({success:false,message:"Invalid lead ID"});
    const lead=await Lead.findById(id);
    if(!lead)return res.status(404).json({success:false,message:"Lead not found"});
    return res.json({success:true,lead});
  }catch(err){
    console.error("GET LEAD ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
export const updateLead=async(req,res)=>{
  let uploadedAudioUrl=null;
  try{
    const {id}=req.params;
    if(!isValidObjectId(id))return res.status(400).json({success:false,message:"Invalid lead ID"});
    const lead=await Lead.findById(id);
    if(!lead)return res.status(404).json({success:false,message:"Lead not found"});
    if(lead.isDeleted)return res.status(400).json({success:false,message:"Cannot update a deleted lead. Restore it first."});
    if(req.body.phone!==undefined){
      const cleanPhone=req.body.phone.toString().replace(/\D/g,"");
      if(!cleanPhone)return res.status(400).json({success:false,message:"Invalid phone number"});
      const existingLead=await Lead.findOne({phone:cleanPhone,_id:{$ne:lead._id}});
      if(existingLead)return res.status(400).json({success:false,message:"Phone number already registered"});
      lead.phone=cleanPhone;
    }
    ["district","address","type","payment","buyer","board","transmission","status","review","description"].forEach(field=>{if(req.body[field]!==undefined)lead[field]=req.body[field]});
    if(req.body.publish!==undefined){
      if(req.body.publish!=="on"&&req.body.publish!=="off")return res.status(400).json({success:false,message:'Publish must be either "on" or "off"'});
      lead.publish=req.body.publish;
    }
    const newReason=req.body.reason!==undefined?req.body.reason:req.body.message;
    if(newReason!==undefined&&newReason!==null&&newReason.toString().trim())lead.reasonHistory.push({message:newReason.toString().trim(),createdAt:new Date()});
    if(req.body.removeAudio==="true"){
      if(lead.audioNote)await deleteLeadAudio(lead.audioNote);
      lead.audioNote=null;
    }
    if(req.file){
      uploadedAudioUrl=await uploadLeadAudio(req.file);
      if(lead.audioNote)await deleteLeadAudio(lead.audioNote);
      lead.audioNote=uploadedAudioUrl;
      uploadedAudioUrl=null;
    }
    await lead.save();
    return res.json({success:true,message:"Lead updated successfully",lead});
  }catch(err){
    console.error("UPDATE LEAD ERROR 👉",err);
    if(uploadedAudioUrl)await deleteLeadAudio(uploadedAudioUrl);
    if(err.code===11000)return res.status(400).json({success:false,message:"Phone number already registered"});
    return res.status(500).json({success:false,message:err.message});
  }
};
export const addLeadReason=async(req,res)=>{
  try{
    const {id}=req.params,{message,reason}=req.body;
    if(!isValidObjectId(id))return res.status(400).json({success:false,message:"Invalid lead ID"});
    const reasonMessage=message!==undefined?message:reason;
    if(reasonMessage===undefined||reasonMessage===null||!reasonMessage.toString().trim())return res.status(400).json({success:false,message:"Reason message is required"});
    const lead=await Lead.findById(id);
    if(!lead)return res.status(404).json({success:false,message:"Lead not found"});
    if(lead.isDeleted)return res.status(400).json({success:false,message:"Cannot add reason to a deleted lead. Restore it first."});
    lead.reasonHistory.push({message:reasonMessage.toString().trim(),createdAt:new Date()});
    await lead.save();
    const addedReason=lead.reasonHistory[lead.reasonHistory.length-1];
    return res.status(201).json({success:true,message:"Reason added successfully",reason:addedReason,reasonHistory:lead.reasonHistory,lead});
  }catch(err){
    console.error("ADD LEAD REASON ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
export const getLeadReasons=async(req,res)=>{
  try{
    const {id}=req.params;
    if(!isValidObjectId(id))return res.status(400).json({success:false,message:"Invalid lead ID"});
    const lead=await Lead.findById(id).select("reasonHistory");
    if(!lead)return res.status(404).json({success:false,message:"Lead not found"});
    return res.json({success:true,total:lead.reasonHistory.length,reasonHistory:lead.reasonHistory});
  }catch(err){
    console.error("GET LEAD REASONS ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
export const deleteLeadReason=async(req,res)=>{
  try{
    const {id,reasonId}=req.params;
    if(!isValidObjectId(id))return res.status(400).json({success:false,message:"Invalid lead ID"});
    if(!isValidObjectId(reasonId))return res.status(400).json({success:false,message:"Invalid reason ID"});
    const lead=await Lead.findById(id);
    if(!lead)return res.status(404).json({success:false,message:"Lead not found"});
    const reasonIndex=lead.reasonHistory.findIndex(item=>item._id.toString()===reasonId);
    if(reasonIndex===-1)return res.status(404).json({success:false,message:"Reason message not found"});
    lead.reasonHistory.splice(reasonIndex,1);
    await lead.save();
    return res.json({success:true,message:"Reason deleted successfully",reasonHistory:lead.reasonHistory});
  }catch(err){
    console.error("DELETE LEAD REASON ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
export const updateLeadPublish=async(req,res)=>{
  try{
    const {id}=req.params,{publish}=req.body;
    if(!isValidObjectId(id))return res.status(400).json({success:false,message:"Invalid lead ID"});
    if(publish!=="on"&&publish!=="off")return res.status(400).json({success:false,message:'Publish must be either "on" or "off"'});
    const lead=await Lead.findById(id);
    if(!lead)return res.status(404).json({success:false,message:"Lead not found"});
    if(lead.isDeleted)return res.status(400).json({success:false,message:"Cannot change publish status of a deleted lead."});
    lead.publish=publish;
    await lead.save();
    return res.json({success:true,message:`Lead publish set to ${publish}`,publish:lead.publish,lead});
  }catch(err){
    console.error("UPDATE LEAD PUBLISH ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
export const deleteLead=async(req,res)=>{
  try{
    const {id}=req.params;
    if(!isValidObjectId(id))return res.status(400).json({success:false,message:"Invalid lead ID"});
    const lead=await Lead.findById(id);
    if(!lead)return res.status(404).json({success:false,message:"Lead not found"});
    if(lead.isDeleted)return res.status(400).json({success:false,message:"Lead is already deleted"});
    lead.isDeleted=true;
    lead.deletedAt=new Date();
    await lead.save();
    return res.json({success:true,message:"Lead moved to trash",lead});
  }catch(err){
    console.error("DELETE LEAD ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
export const restoreLead=async(req,res)=>{
  try{
    const {id}=req.params;
    if(!isValidObjectId(id))return res.status(400).json({success:false,message:"Invalid lead ID"});
    const lead=await Lead.findById(id);
    if(!lead)return res.status(404).json({success:false,message:"Lead not found"});
    if(!lead.isDeleted)return res.status(400).json({success:false,message:"Lead is not deleted"});
    lead.isDeleted=false;
    lead.deletedAt=null;
    await lead.save();
    return res.json({success:true,message:"Lead restored successfully",lead});
  }catch(err){
    console.error("RESTORE LEAD ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
export const restoreManyLeads=async(req,res)=>{
  try{
    const {ids}=req.body;
    if(!ids||!Array.isArray(ids)||!ids.length)return res.status(400).json({success:false,message:"Please provide an array of lead IDs"});
    const invalidIds=ids.filter(id=>!isValidObjectId(id));
    if(invalidIds.length)return res.status(400).json({success:false,message:"One or more lead IDs are invalid",invalidIds});
    const leads=await Lead.find({_id:{$in:ids},isDeleted:true});
    if(!leads.length)return res.status(400).json({success:false,message:"No deleted leads found for the provided IDs"});
    const restoredIds=leads.map(lead=>lead._id);
    await Lead.updateMany({_id:{$in:restoredIds}},{isDeleted:false,deletedAt:null});
    return res.json({success:true,message:`${restoredIds.length} leads restored successfully`,restoredIds,modifiedCount:restoredIds.length});
  }catch(err){
    console.error("RESTORE MANY LEADS ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
export const permanentDeleteLead=async(req,res)=>{
  try{
    const {id}=req.params;
    if(!isValidObjectId(id))return res.status(400).json({success:false,message:"Invalid lead ID"});
    const lead=await Lead.findById(id);
    if(!lead)return res.status(404).json({success:false,message:"Lead not found"});
    if(!lead.isDeleted)return res.status(400).json({success:false,message:"Cannot permanently delete an active lead. Delete it first."});
    if(lead.audioNote)await deleteLeadAudio(lead.audioNote);
    await lead.deleteOne();
    return res.json({success:true,message:"Lead permanently deleted"});
  }catch(err){
    console.error("PERMANENT DELETE LEAD ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
export const permanentDeleteManyLeads=async(req,res)=>{
  try{
    const {ids}=req.body;
    if(!ids||!Array.isArray(ids)||!ids.length)return res.status(400).json({success:false,message:"Please provide an array of lead IDs"});
    const invalidIds=ids.filter(id=>!isValidObjectId(id));
    if(invalidIds.length)return res.status(400).json({success:false,message:"One or more lead IDs are invalid",invalidIds});
    const leads=await Lead.find({_id:{$in:ids},isDeleted:true});
    if(!leads.length)return res.status(400).json({success:false,message:"No deleted leads found for the provided IDs"});
    const deleteIds=leads.map(lead=>lead._id);
    await Promise.all(leads.filter(lead=>lead.audioNote).map(lead=>deleteLeadAudio(lead.audioNote)));
    const result=await Lead.deleteMany({_id:{$in:deleteIds},isDeleted:true});
    return res.json({success:true,message:`${result.deletedCount} leads permanently deleted`,deletedIds:deleteIds,deletedCount:result.deletedCount});
  }catch(err){
    console.error("PERMANENT DELETE MANY LEADS ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};
export const restoreAllLeads=async(req,res)=>{
  try{
    const result=await Lead.updateMany({isDeleted:true},{isDeleted:false,deletedAt:null});
    return res.json({success:true,message:`${result.modifiedCount} leads restored from trash`,modifiedCount:result.modifiedCount});
  }catch(err){
    console.error("RESTORE ALL LEADS ERROR 👉",err);
    return res.status(500).json({success:false,message:err.message});
  }
};