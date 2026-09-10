// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: ~100 LINES → ~30 LINES WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
import multer from "multer";
const storage=multer.memoryStorage();
const fileFilter=(req,file,cb)=>file.mimetype.startsWith("image/")||file.mimetype==="application/octet-stream"?cb(null,true):cb(new Error("Only image files allowed"),false);
const uploadLaptopBrand=multer({storage,limits:{fileSize:10*1024*1024},fileFilter});
export default uploadLaptopBrand;