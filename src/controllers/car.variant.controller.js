import Variant from "../models/car_variant_model.js";
import Brand from "../models/car_brand_model.js";
import {
  uploadVariantImage,
  deleteVariantImage,
} from "../utils/carVariant.js";

/* =====================================================
   ADD VARIANT
===================================================== */
export const addVariant = async (req, res) => {
  try {
    const { brandId, title } = req.body;

    if (!brandId || !title || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Brand, variant title and image are required",
      });
    }

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    const existing = await Variant.findOne({
      brand: brandId,
      title: new RegExp(`^${title.trim()}$`, "i"),
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Variant already exists",
      });
    }

    const imageUrl = await uploadVariantImage(req.file);

    const variant = await Variant.create({
      brand: brandId,
      title: title.trim(),
      imageUrl,
    });

    return res.status(201).json({
      success: true,
      variant,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   GET ALL VARIANTS
===================================================== */
export const getAllVariants = async (req, res) => {
  try {
    const variants = await Variant.find()
      .sort({ createdAt: -1 })
      .populate("brand", "name logoUrl");

    const data = variants.map((v) => ({
      _id: v._id.toString(),
      brandId: v.brand?._id?.toString() || "",
      brandName: v.brand?.name || "",
      brandLogo: v.brand?.logoUrl || "",
      variantName: v.title || "",
      variantImage: v.imageUrl || "",
    }));

    return res.status(200).json({
      success: true,
      variants: data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   GET VISIBLE VARIANTS (Hide Load + Other State)
===================================================== */
export const getONEBrandhideVariants = async (req, res) => {
  try {
    /// ✅ Exact Brand Match (NO STRING BUGS)
    const loadBrand = await Brand.findOne({
      name: "Load vehicles லோடு வாகனங்கள்",
    });

    const otherStateBrand = await Brand.findOne({
      name: "Other State டெல்லி",
    });

    /// ✅ Hidden brand IDs
    const hiddenBrandIds = [];

    if (loadBrand) hiddenBrandIds.push(loadBrand._id);
    if (otherStateBrand) hiddenBrandIds.push(otherStateBrand._id);

    /// ✅ Mongo Query (FAST ⚡)
    const query =
      hiddenBrandIds.length > 0
        ? { brand: { $nin: hiddenBrandIds } }
        : {};

    const variants = await Variant.find(query)
      .sort({ createdAt: -1 })
      .populate("brand", "name logoUrl");

    const data = variants.map((v) => ({
      _id: v._id.toString(),
      brandId: v.brand?._id?.toString() || "",
      brandName: v.brand?.name || "",
      brandLogo: v.brand?.logoUrl || "",
      variantName: v.title || "",
      variantImage: v.imageUrl || "",
    }));

    return res.status(200).json({
      success: true,
      variants: data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


/* =====================================================
   LOAD VEHICLES VARIANTS 🚚
===================================================== */
export const getLoadVehiclesVariants = async (req, res) => {
  try {
    /// ✅ Find Brand (NO STRING BUGS)
    const brand = await Brand.findOne({
      name: /load vehicles/i,
    });

    if (!brand) {
      return res.status(200).json({
        success: true,
        variants: [],
      });
    }

    const variants = await Variant.find({ brand: brand._id })
      .sort({ createdAt: -1 })
      .populate("brand", "name logoUrl");

    const data = variants.map((v) => ({
      _id: v._id.toString(),
      brandId: v.brand?._id?.toString() || "",
      brandName: v.brand?.name || "",
      brandLogo: v.brand?.logoUrl || "",
      variantName: v.title || "",
      variantImage: v.imageUrl || "",
    }));

    return res.status(200).json({
      success: true,
      variants: data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   OTHER STATE VARIANTS 🌏
===================================================== */
export const getOtherStateVariants = async (req, res) => {
  try {
    /// ✅ Exact Brand Match (NO REGEX / NO BUGS)
    const brand = await Brand.findOne({
      name: "Other State டெல்லி",
    });

    if (!brand) {
      return res.status(200).json({
        success: true,
        variants: [],
      });
    }

    const variants = await Variant.find({ brand: brand._id })
      .sort({ createdAt: -1 })
      .populate("brand", "name logoUrl");

    const data = variants.map((v) => ({
      _id: v._id.toString(),
      brandId: v.brand?._id?.toString() || "",
      brandName: v.brand?.name || "",
      brandLogo: v.brand?.logoUrl || "",
      variantName: v.title || "",
      variantImage: v.imageUrl || "",
    }));

    return res.status(200).json({
      success: true,
      variants: data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   tarvel cars BY verint cryst ertiga swift innova
===================================================== */

export const getSelectedVariants = async (req, res) => {
  try {
    const variants = await Variant.find({
      title: {
        $in: [
          "Innova இன்னோவா",
          "Crysta கிரிஸ்டா",
          "Swift ஸ்விப்ட்",
          "Ertiga எர்டிகா",
        ],
      },
    })
      .populate("brand", "name logoUrl")
      .sort({ createdAt: -1 });

    const data = variants.map((v) => ({
      _id: v._id.toString(),
      brandId: v.brand?._id?.toString() || "",
      brandName: v.brand?.name || "",
      brandLogo: v.brand?.logoUrl || "",
      variantName: v.title || "",
      variantImage: v.imageUrl || "",
    }));

    return res.status(200).json({
      success: true,
      variants: data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};



/* =====================================================
   VARIANTS BY BRAND
===================================================== */

/* =====================================================
   VARIANTS BY BRAND
===================================================== */
export const getVariantsByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;

    const variants = await Variant.find({ brand: brandId })
      .populate("brand", "name logoUrl");

    // ✅ Crysta always first
    variants.sort((a, b) => {
      const aTitle = (a.title || "").trim().toLowerCase();
      const bTitle = (b.title || "").trim().toLowerCase();

      if (aTitle.startsWith("crysta")) return -1;
      if (bTitle.startsWith("crysta")) return 1;

      return a.title.localeCompare(b.title);
    });

    const data = variants.map((v) => ({
      _id: v._id.toString(),
      brandId: v.brand?._id?.toString() || "",
      brandName: v.brand?.name || "",
      brandLogo: v.brand?.logoUrl || "",
      variantName: v.title || "",
      variantImage: v.imageUrl || "",
    }));

    return res.status(200).json({
      success: true,
      variants: data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   UPDATE VARIANT
===================================================== */
export const updateVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, brandId } = req.body;

    const variant = await Variant.findById(id);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    if (title?.trim()) variant.title = title.trim();

    if (brandId) {
      const brand = await Brand.findById(brandId);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: "Brand not found",
        });
      }
      variant.brand = brandId;
    }

    if (req.file) {
      await deleteVariantImage(variant.imageUrl);
      variant.imageUrl = await uploadVariantImage(req.file);
    }

    await variant.save();

    return res.status(200).json({
      success: true,
      variant,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   DELETE VARIANT
===================================================== */
export const deleteVariant = async (req, res) => {
  try {
    const { id } = req.params;

    const variant = await Variant.findById(id);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    await deleteVariantImage(variant.imageUrl);
    await variant.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Variant deleted",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
