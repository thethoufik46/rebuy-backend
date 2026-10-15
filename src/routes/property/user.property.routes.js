// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: ~100 LINES → ~30 LINES WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
import express from "express";
import Property from "../../models/property/property_model.js";
import User from "../../models/user/user_model.js";
import { verifyToken } from "../../middleware/auth.js";
import { verifyTokenOptional } from "../../middleware/verifyTokenOptional.js";
import uploadProperty from "../../middleware/property/uploadProperty.js";
import { uploadPropertyImage } from "../../utils/property/propertyUpload.js";

const router = express.Router();

const fields = [
  { name: "banner", maxCount: 1 },
  { name: "gallery", maxCount: 10 },
  { name: "audio", maxCount: 1 },
  { name: "video", maxCount: 5 },
];

const parseDocuments = (v) => {
  if (v == null || v === "") return [];
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const x = JSON.parse(v);
      if (Array.isArray(x)) return x;
    } catch {}
    return [v];
  }
  return [];
};

/* ✅ Multi-value parser — "a,b" | ["a","b"] | "a" → ["a","b"] */
const parseMultiValues = (v) => {
  if (v == null || v === "") return [];
  const arr = Array.isArray(v) ? v : String(v).split(",");
  return [...new Set(arr.map((x) => String(x).trim()).filter(Boolean))];
};

router.get("/", verifyTokenOptional, async (req, res) => {
  try {
    const query = {};
    const isAdmin = req.user?.role === "admin";
    const {
      district, city, mainType, category, direction, bedrooms,
      minPrice, maxPrice, minLandArea, maxLandArea,
    } = req.query;

    /* ✅ MULTI-VALUE FILTERS — all fields */
    const districtList = parseMultiValues(district);
    if (districtList.length) query.district = { $in: districtList };

    const cityList = parseMultiValues(city);
    if (cityList.length) query.city = { $in: cityList };

    const mainTypeList = parseMultiValues(mainType);
    if (mainTypeList.length) query.mainType = { $in: mainTypeList };

    const categoryList = parseMultiValues(category);
    if (categoryList.length) query.category = { $in: categoryList };

    const directionList = parseMultiValues(direction);
    if (directionList.length) query.direction = { $in: directionList };

    const bedroomList = parseMultiValues(bedrooms);
    if (bedroomList.length) query.bedrooms = { $in: bedroomList };

    /* PRICE */
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    /* LAND AREA */
    if (minLandArea || maxLandArea) {
      const c = [];
      if (minLandArea) {
        c.push({
          $gte: [
            {
              $convert: {
                input: { $arrayElemAt: [{ $split: ["$landArea", " "] }, 0] },
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
            Number(minLandArea),
          ],
        });
      }
      if (maxLandArea) {
        c.push({
          $lte: [
            {
              $convert: {
                input: { $arrayElemAt: [{ $split: ["$landArea", " "] }, 0] },
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
            Number(maxLandArea),
          ],
        });
      }
      if (c.length) query.$expr = { $and: c };
    }

    if (!isAdmin) query.status = { $nin: ["draft", "delete_requested"] };

    const properties = await Property.find(query).sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: properties.length, properties });
  } catch (err) {
    console.error("GET PROPERTY ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to fetch properties" });
  }
});

router.post("/user-add", verifyToken, uploadProperty.fields(fields), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const bannerImage = req.files?.banner?.length
      ? await uploadPropertyImage(req.files.banner[0], "property/banner")
      : null;
    const galleryImages = req.files?.gallery?.length
      ? await Promise.all(req.files.gallery.map((x) => uploadPropertyImage(x, "property/gallery")))
      : [];
    const audioNote = req.files?.audio?.length
      ? await uploadPropertyImage(req.files.audio[0], "property/audio")
      : null;
    const videos = req.files?.video?.length
      ? await Promise.all(req.files.video.map((x) => uploadPropertyImage(x, "property/videos")))
      : [];

    const property = await Property.create({
      ...req.body,
      documents: parseDocuments(req.body.documents),
      bannerImage,
      galleryImages,
      audioNote,
      videos,
      videoLink: req.body.videoLink || null,
      seller: String(user.phone),
      sellerUser: user._id,
      createdBy: user._id,
      status: "draft",
      price: null,
    });

    res.status(201).json({
      success: true,
      message: "Property submitted for approval",
      property,
    });
  } catch (err) {
    console.error("USER ADD PROPERTY ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/my", verifyToken, async (req, res) => {
  try {
    const properties = await Property.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, count: properties.length, properties });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch properties" });
  }
});

router.put("/:id/request-delete", verifyToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: "Property not found" });
    if (property.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    property.status = "delete_requested";
    await property.save();
    res.json({ success: true, message: "Delete request sent" });
  } catch (err) {
    console.error("REQUEST DELETE ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to request delete" });
  }
});

export default router;