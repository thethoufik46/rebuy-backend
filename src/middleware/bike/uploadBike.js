// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES.
// KEEP CODE LINES SHORT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES. BREAK LONG CODE INTO SHORT, READABLE LINES.
import multer from "multer";
const storage = multer.memoryStorage();
const uploadBike = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
export default uploadBike;