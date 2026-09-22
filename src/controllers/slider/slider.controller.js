// ======================= slider.controller.js =======================

import Slider from "../../models/slider/slider_model.js";

import {
  uploadSliderImage,
  deleteSliderImage,
} from "../../utils/slider/slider.js";

// ============================================================
// VALIDATE CATEGORY
// ============================================================

const validCategories = [
  "car",
  "bike",
  "property",
  "electronics",
];

const validateCategory = (category) => {
  return (
    typeof category === "string" &&
    validCategories.includes(
      category.trim().toLowerCase()
    )
  );
};

// ============================================================
// VALIDATE ORDER
// ============================================================

const validateOrder = (order) => {
  const value = Number(order);

  return (
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 100
  );
};

// ============================================================
// ADD SLIDER
// ============================================================

export const addSlider = async (req, res) => {
  try {
    const { category, order } = req.body;

    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

    if (!validateCategory(category)) {
      return res.status(400).json({
        success: false,
        message:
          "Valid category is required: car, bike, property, electronics",
      });
    }

    if (!validateOrder(order)) {
      return res.status(400).json({
        success: false,
        message: "Order must be a number from 1 to 100",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Slider image is required",
      });
    }

    const cleanCategory =
      category.trim().toLowerCase();

    const cleanOrder = Number(order);

    // ----------------------------------------------------------
    // CHECK DUPLICATE ORDER
    // ----------------------------------------------------------

    const existing = await Slider.findOne({
      category: cleanCategory,
      order: cleanOrder,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          `Order ${cleanOrder} already exists for ${cleanCategory}`,
      });
    }

    // ----------------------------------------------------------
    // UPLOAD IMAGE
    // ----------------------------------------------------------

    const imageUrl =
      await uploadSliderImage(req.file);

    // ----------------------------------------------------------
    // CREATE SLIDER
    // ----------------------------------------------------------

    const slider = await Slider.create({
      category: cleanCategory,
      imageUrl,
      order: cleanOrder,
    });

    // ----------------------------------------------------------
    // RESPONSE
    // ----------------------------------------------------------

    return res.status(201).json({
      success: true,
      slider,
    });
  } catch (err) {
    console.error(
      "ADD SLIDER ERROR 👉",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to add slider",
    });
  }
};

// ============================================================
// GET ALL SLIDERS
// ============================================================

export const getAllSliders = async (
  req,
  res
) => {
  try {
    const { category } = req.query;

    const filter = {};

    if (category) {
      const cleanCategory =
        category.trim().toLowerCase();

      if (!validateCategory(cleanCategory)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid category",
        });
      }

      filter.category = cleanCategory;
    }

    const sliders = await Slider.find(filter)
      .sort({
        category: 1,
        order: 1,
      })
      .lean();

    const data = sliders.map(
      (slider) => ({
        _id: slider._id.toString(),
        category:
          slider.category || "",
        imageUrl:
          slider.imageUrl || "",
        image:
          slider.imageUrl || "",
        order:
          slider.order || 0,
        createdAt:
          slider.createdAt,
        updatedAt:
          slider.updatedAt,
      })
    );

    return res.status(200).json({
      success: true,
      sliders: data,
    });
  } catch (err) {
    console.error(
      "GET ALL SLIDERS ERROR 👉",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to get sliders",
    });
  }
};

// ============================================================
// GET SLIDERS BY CATEGORY
// ============================================================

export const getSlidersByCategory =
  async (req, res) => {
    try {
      const category =
        req.params.category
          ?.trim()
          .toLowerCase();

      if (!validateCategory(category)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid category",
        });
      }

      const sliders =
        await Slider.find({
          category,
        })
          .sort({
            order: 1,
          })
          .lean();

      const data = sliders.map(
        (slider) => ({
          _id:
            slider._id.toString(),
          category:
            slider.category || "",
          imageUrl:
            slider.imageUrl || "",
          image:
            slider.imageUrl || "",
          order:
            slider.order || 0,
        })
      );

      return res.status(200).json({
        success: true,
        category,
        sliders: data,
      });
    } catch (err) {
      console.error(
        "GET CATEGORY SLIDERS ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          err.message ||
          "Failed to get category sliders",
      });
    }
  };

// ============================================================
// GET SINGLE SLIDER
// ============================================================

export const getSliderById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const slider =
      await Slider.findById(id);

    if (!slider) {
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    return res.status(200).json({
      success: true,
      slider,
    });
  } catch (err) {
    console.error(
      "GET SLIDER ERROR 👉",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to get slider",
    });
  }
};

// ============================================================
// UPDATE SLIDER
// ============================================================

export const updateSlider = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { category, order } =
      req.body;

    // ----------------------------------------------------------
    // FIND SLIDER
    // ----------------------------------------------------------

    const slider =
      await Slider.findById(id);

    if (!slider) {
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    // ----------------------------------------------------------
    // CATEGORY
    // ----------------------------------------------------------

    let cleanCategory =
      slider.category;

    if (
      category !== undefined &&
      category !== null &&
      category !== ""
    ) {
      if (!validateCategory(category)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid category",
        });
      }

      cleanCategory =
        category.trim().toLowerCase();
    }

    // ----------------------------------------------------------
    // ORDER
    // ----------------------------------------------------------

    let cleanOrder =
      slider.order;

    if (
      order !== undefined &&
      order !== null &&
      order !== ""
    ) {
      if (!validateOrder(order)) {
        return res.status(400).json({
          success: false,
          message:
            "Order must be a number from 1 to 100",
        });
      }

      cleanOrder = Number(order);
    }

    // ----------------------------------------------------------
    // CHECK DUPLICATE
    // ----------------------------------------------------------

    const duplicate =
      await Slider.findOne({
        _id: {
          $ne: id,
        },
        category: cleanCategory,
        order: cleanOrder,
      });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          `Order ${cleanOrder} already exists for ${cleanCategory}`,
      });
    }

    // ----------------------------------------------------------
    // UPDATE CATEGORY
    // ----------------------------------------------------------

    slider.category =
      cleanCategory;

    // ----------------------------------------------------------
    // UPDATE ORDER
    // ----------------------------------------------------------

    slider.order =
      cleanOrder;

    // ----------------------------------------------------------
    // UPDATE IMAGE
    // ----------------------------------------------------------

    if (req.file) {
      const oldImage =
        slider.imageUrl;

      const newImage =
        await uploadSliderImage(
          req.file
        );

      slider.imageUrl =
        newImage;

      // Delete old image after new
      // image upload succeeds
      if (oldImage) {
        try {
          await deleteSliderImage(
            oldImage
          );
        } catch (deleteError) {
          console.error(
            "OLD SLIDER IMAGE DELETE ERROR 👉",
            deleteError
          );
        }
      }
    }

    // ----------------------------------------------------------
    // SAVE
    // ----------------------------------------------------------

    await slider.save();

    // ----------------------------------------------------------
    // RESPONSE
    // ----------------------------------------------------------

    return res.status(200).json({
      success: true,
      slider,
    });
  } catch (err) {
    console.error(
      "UPDATE SLIDER ERROR 👉",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to update slider",
    });
  }
};

// ============================================================
// DELETE SLIDER
// ============================================================

export const deleteSlider = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    // ----------------------------------------------------------
    // FIND SLIDER
    // ----------------------------------------------------------

    const slider =
      await Slider.findById(id);

    if (!slider) {
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    // ----------------------------------------------------------
    // DELETE R2 IMAGE
    // ----------------------------------------------------------

    if (slider.imageUrl) {
      try {
        await deleteSliderImage(
          slider.imageUrl
        );
      } catch (deleteError) {
        console.error(
          "SLIDER IMAGE DELETE ERROR 👉",
          deleteError
        );
      }
    }

    // ----------------------------------------------------------
    // DELETE DATABASE DOCUMENT
    // ----------------------------------------------------------

    await slider.deleteOne();

    // ----------------------------------------------------------
    // RESPONSE
    // ----------------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Slider deleted",
    });
  } catch (err) {
    console.error(
      "DELETE SLIDER ERROR 👉",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to delete slider",
    });
  }
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  addSlider,
  getAllSliders,
  getSlidersByCategory,
  getSliderById,
  updateSlider,
  deleteSlider,
};