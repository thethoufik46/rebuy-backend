// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: ~100 LINES → ~30 LINES WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
import express from "express";
import mongoose from "mongoose";
import Electronics from "../../models/electronics/electronics_model.js";
import User from "../../models/user/user_model.js";
import { verifyToken } from "../../middleware/auth.js";
import { verifyTokenOptional } from "../../middleware/verifyTokenOptional.js";
import uploadElectronics from "../../middleware/electronics/uploadElectronics.js";
import { uploadElectronicsMedia } from "../../utils/electronics/electronicsUpload.js";

const router = express.Router();

const fields = [
  { name: "banner", maxCount: 1 },
  { name: "gallery", maxCount: 10 },
  { name: "audio", maxCount: 1 },
  { name: "video", maxCount: 3 },
];

/* ✅ Multi-value parser — "a,b" | ["a","b"] | "a" → ["a","b"] */
const parseMultiValues = (v) => {
  if (v == null || v === "") return [];
  const arr = Array.isArray(v) ? v : String(v).split(",");
  return [...new Set(arr.map((x) => String(x).trim()).filter(Boolean))];
};

/* ✅ Multi-value ObjectId parser */
const parseObjectIds = (v) => {
  if (v == null || v === "") return [];
  const arr = Array.isArray(v) ? v : String(v).split(",");
  return arr
    .map((x) => String(x).trim())
    .filter((x) => mongoose.Types.ObjectId.isValid(x))
    .map((x) => new mongoose.Types.ObjectId(x));
};

router.get("/", verifyTokenOptional, async (req, res) => {
  try {
    const isAdmin = req.user?.role === "admin";
    const query = {};
    const {
      category, brand, district, city,
      condition, storage, color, warranty,
      minPrice, maxPrice, minYear, maxYear,
    } = req.query;

    /* ✅ MULTI-VALUE FILTERS */
    const categoryList = parseMultiValues(category);
    if (categoryList.length) query.category = { $in: categoryList };

    const brandIds = parseObjectIds(brand);
    if (brandIds.length) query.brand = { $in: brandIds };

    const districtList = parseMultiValues(district);
    if (districtList.length) query.district = { $in: districtList };

    const cityList = parseMultiValues(city);
    if (cityList.length) query.city = { $in: cityList };

    const conditionList = parseMultiValues(condition);
    if (conditionList.length) query.condition = { $in: conditionList };

    const storageList = parseMultiValues(storage);
    if (storageList.length) query.storage = { $in: storageList };

    const colorList = parseMultiValues(color);
    if (colorList.length) query.color = { $in: colorList };

    const warrantyList = parseMultiValues(warranty);
    if (warrantyList.length) query.warranty = { $in: warrantyList };

    /* PRICE */
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    /* YEAR */
    if (minYear || maxYear) {
      query.year = {};
      if (minYear) query.year.$gte = Number(minYear);
      if (maxYear) query.year.$lte = Number(maxYear);
    }

    if (!isAdmin) query.status = { $nin: ["draft", "delete_requested"] };

    const electronics = await Electronics.find(query)
      .populate("brand", "name logoUrl")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: electronics.length, electronics });
  } catch (err) {
    console.log("GET ELECTRONICS ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to fetch electronics" });
  }
});

router.post(
  "/user-add",
  verifyToken,
  uploadElectronics.fields(fields),
  async (req, res) => {
    try {
      const { brand, category, videoLink } = req.body;
      if (!mongoose.Types.ObjectId.isValid(brand))
        return res.status(400).json({ success: false, message: "Invalid brand id" });
      if (!category)
        return res.status(400).json({ success: false, message: "Category required" });

      const user = await User.findById(req.user.id);
      if (!user)
        return res.status(404).json({ success: false, message: "User not found" });

      const bannerImage = req.files?.banner?.length
        ? await uploadElectronicsMedia(req.files.banner[0], "electronics/banner")
        : null;
      const galleryImages = req.files?.gallery?.length
        ? await Promise.all(req.files.gallery.map((x) => uploadElectronicsMedia(x, "electronics/gallery")))
        : [];
      const audioNote = req.files?.audio?.length
        ? await uploadElectronicsMedia(req.files.audio[0], "electronics/audio")
        : null;
      const videos = req.files?.video?.length
        ? await Promise.all(req.files.video.map((x) => uploadElectronicsMedia(x, "electronics/videos")))
        : [];

      const item = await Electronics.create({
        ...req.body,
        bannerImage,
        galleryImages,
        audioNote,
        videos,
        videoLink: videoLink || null,
        seller: String(user.phone),
        sellerUser: user._id,
        createdBy: user._id,
        status: "draft",
        price: null,
      });

      res.status(201).json({
        success: true,
        message: "Electronics submitted for approval",
        item,
      });
    } catch (err) {
      console.log("USER ADD ERROR:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.get("/my", verifyToken, async (req, res) => {
  try {
    const items = await Electronics.find({ createdBy: req.user._id })
      .populate("brand", "name logoUrl")
      .sort({ createdAt: -1 })
      .lean();

    const safeItems = items.map((item) => {
      if (typeof item.seller === "string" && item.seller.includes(":"))
        item.seller = "**********";
      return item;
    });

    res.json({ success: true, count: safeItems.length, items: safeItems });
  } catch (err) {
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
});

router.put("/:id/request-delete", verifyToken, async (req, res) => {
  try {
    const item = await Electronics.findById(req.params.id);
    if (!item)
      return res.status(404).json({ success: false, message: "Electronics not found" });
    if (item.createdBy.toString() !== req.user.id.toString())
      return res.status(403).json({ success: false, message: "Unauthorized" });

    item.status = "delete_requested";
    await item.save();
    res.json({ success: true, message: "Delete request sent" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Request failed" });
  }
});

export default router;