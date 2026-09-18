// ======================= uploadCarModel.js =======================
// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: KEEP 100% LOGIC & FUNCTIONALITY.
import multer from "multer";

// ============================================================
// MEMORY STORAGE
// ============================================================
const storage=multer.memoryStorage();

// ============================================================
// FILE FILTER
// ============================================================
const fileFilter=(req,file,cb)=>{
  if(file.mimetype.startsWith("image/")||file.mimetype==="application/octet-stream")cb(null,true);
  else cb(new Error("Only image files allowed"),false);
};

// ============================================================
// MULTER
// ============================================================
const uploadCarModel=multer({
  storage,
  limits:{fileSize:10*1024*1024},
  fileFilter,
});

export default uploadCarModel;