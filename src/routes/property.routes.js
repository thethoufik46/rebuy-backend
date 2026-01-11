import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import Property from "../models/property_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

/* -------------------------------------------------
   ☁️ CLOUDINARY + MULTER
---------------------------------------------------*/
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "rebuy_properties",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const upload = multer({ storage });

/* =================================================
   🔍 FILTER PROPERTIES
   GET /api/properties/filter
==================================================*/
router.get("/filter", async (req, res) => {
  try {
    const {
      mainType,
      category,
      district,
      town,
      minPrice,
      maxPrice,
      bedrooms,
      status,
      sellerInfo,
    } = req.query;

    const query = {};

    if (mainType) query.mainType = mainType;
    if (category) query.category = category;
    if (bedrooms) query.bedrooms = Number(bedrooms);
    if (status) query.status = status;
    if (sellerInfo) query.sellerInfo = sellerInfo;

    // ✅ LOCATION STRING FILTER
    if (district && town) {
      query.location = new RegExp(`${town}.*, ${district}`, "i");
    } else if (district) {
      query.location = new RegExp(district, "i");
    } else if (town) {
      query.location = new RegExp(town, "i");
    }

    // ✅ PRICE FILTER
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const properties = await Property.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (error) {
    console.error("❌ Property Filter Error:", error);
    res.status(500).json({
      success: false,
      message: "Error filtering properties",
    });
  }
});

/* =================================================
   ➕ ADD PROPERTY (ADMIN)
   POST /api/properties/add
==================================================*/
router.post(
  "/add",
  verifyToken,
  isAdmin,
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const {
        mainType,
        category,
        price,
        yearBuilt,
        bedrooms,
        landArea,
        homeArea,
        roadAccess,
        direction,
        status,
        seller,
        sellerInfo,
        description,
        district,
        town,
      } = req.body;

      if (!req.files?.banner) {
        return res.status(400).json({
          success: false,
          message: "Banner image is required",
        });
      }

      // ✅ SINGLE LOCATION STRING
      const location = `${town}, ${district}, Tamil Nadu`;

      const bannerImage = req.files.banner[0].path;
      const galleryImages = req.files.gallery
        ? req.files.gallery.map((img) => img.path)
        : [];

      const property = new Property({
        mainType,
        category,
        price,
        yearBuilt,
        bedrooms,
        landArea,
        homeArea,
        roadAccess,
        direction,
        status,
        seller,
        sellerInfo,
        description,
        location, // ✅ STRING
        bannerImage,
        galleryImages,
      });

      await property.save();

      res.status(201).json({
        success: true,
        message: "✅ Property added successfully",
        property,
      });
    } catch (error) {
      console.error("❌ Add Property Error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/* =================================================
   📄 GET ALL PROPERTIES
   GET /api/properties
==================================================*/
router.get("/", async (req, res) => {
  try {
    const properties = await Property.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (error) {
    console.error("❌ Fetch Properties Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching properties",
    });
  }
});

/* =================================================
   📄 GET SINGLE PROPERTY
   GET /api/properties/:id
==================================================*/
router.get("/:id", async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    res.status(200).json({
      success: true,
      property,
    });
  } catch (error) {
    console.error("❌ Single Property Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching property",
    });
  }
});

/* =================================================
   ✏️ UPDATE PROPERTY (ADMIN)
   PUT /api/properties/:id
==================================================*/
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const property = await Property.findById(req.params.id);

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      if (req.files?.banner) {
        property.bannerImage = req.files.banner[0].path;
      }

      if (req.files?.gallery) {
        property.galleryImages = req.files.gallery.map((f) => f.path);
      }

      Object.assign(property, req.body);
      await property.save();

      res.status(200).json({
        success: true,
        message: "📝 Property updated successfully",
        property,
      });
    } catch (error) {
      console.error("❌ Update Property Error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/* =================================================
   🗑️ DELETE PROPERTY (ADMIN)
   DELETE /api/properties/:id
==================================================*/
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    await property.deleteOne();

    res.status(200).json({
      success: true,
      message: "🗑️ Property deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete Property Error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting property",
    });
  }
});

export default router;
