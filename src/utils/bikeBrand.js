// ======================= utils/bikeBrand.js =======================

import {
  uploadCarImage,
  deleteCarImage,
} from "./carBrand.js";

/* =====================================================
   REUSE CAR IMAGE UTILS ✅
===================================================== */

export const uploadBikeImage = async (file, folder = "bike-brands") => {
  return await uploadCarImage(file, folder);
};

export const deleteBikeImage = async (url) => {
  return await deleteCarImage(url);
};
