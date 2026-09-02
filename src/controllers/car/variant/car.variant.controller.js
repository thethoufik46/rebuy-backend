// ======================= car.variant.controller.js =======================

import CarVariant from "../../../models/car/variant/car_variant_model.js";
import CarModel from "../../../models/car/model/car_model_model.js";

import {
  uploadCarVariantImage,
  deleteCarVariantImage,
} from "../../../utils/car/variant/carVariant.js";

// ============================================================
// ADD CAR VARIANT
// ============================================================

export const addCarVariant = async (
  req,
  res
) => {
  try {
    const {
      carModelId,
      title,
    } = req.body;

    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

    if (
      !carModelId ||
      !title ||
      !req.file
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Car model, variant title and image are required",
      });
    }

    // ----------------------------------------------------------
    // CHECK CAR MODEL
    // ----------------------------------------------------------

    const carModel =
      await CarModel.findById(
        carModelId
      );

    if (!carModel) {
      return res.status(404).json({
        success: false,
        message:
          "Car model not found",
      });
    }

    // ----------------------------------------------------------
    // CHECK DUPLICATE VARIANT
    // ----------------------------------------------------------

    const existing =
      await CarVariant.findOne({
        carModel:
          carModelId,

        title: new RegExp(
          `^${title.trim()}$`,
          "i"
        ),
      });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "Car variant already exists",
      });
    }

    // ----------------------------------------------------------
    // UPLOAD IMAGE
    // ----------------------------------------------------------

    const imageUrl =
      await uploadCarVariantImage(
        req.file
      );

    // ----------------------------------------------------------
    // CREATE CAR VARIANT
    // ----------------------------------------------------------

    const carVariant =
      await CarVariant.create({
        carModel:
          carModelId,

        title:
          title.trim(),

        imageUrl,
      });

    // ----------------------------------------------------------
    // RESPONSE
    // ----------------------------------------------------------

    return res.status(201).json({
      success: true,
      carVariant,
    });
  } catch (err) {
    console.error(
      "ADD CAR VARIANT ERROR 👉",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================================================
// GET ALL CAR VARIANTS
// ============================================================

export const getAllCarVariants =
  async (
    req,
    res
  ) => {
    try {
      const variants =
        await CarVariant.find()
          .sort({
            createdAt: -1,
          })
          .populate(
            {
              path: "carModel",
              select:
                "title imageUrl brand",
              populate: {
                path: "brand",
                select:
                  "name logoUrl",
              },
            }
          );

      const data =
        variants.map(
          (variant) => ({
            _id:
              variant._id.toString(),

            carModelId:
              variant.carModel?._id
                ?.toString() ||
              "",

            carModelName:
              variant
                .carModel
                ?.title ||
              "",

            carModelImage:
              variant
                .carModel
                ?.imageUrl ||
              "",

            brandId:
              variant
                .carModel
                ?.brand
                ?._id
                ?.toString() ||
              "",

            brandName:
              variant
                .carModel
                ?.brand
                ?.name ||
              "",

            brandLogo:
              variant
                .carModel
                ?.brand
                ?.logoUrl ||
              "",

            variantName:
              variant.title ||
              "",

            variantImage:
              variant.imageUrl ||
              "",
          })
        );

      return res.status(200).json({
        success: true,
        carVariants: data,
      });
    } catch (err) {
      console.error(
        "GET ALL CAR VARIANTS ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

// ============================================================
// GET CAR VARIANTS BY CAR MODEL
// ============================================================

export const getCarVariantsByModel =
  async (
    req,
    res
  ) => {
    try {
      const {
        carModelId,
      } = req.params;

      const variants =
        await CarVariant.find({
          carModel:
            carModelId,
        })
          .sort({
            createdAt: -1,
          })
          .populate(
            {
              path: "carModel",
              select:
                "title imageUrl brand",
              populate: {
                path: "brand",
                select:
                  "name logoUrl",
              },
            }
          );

      const data =
        variants.map(
          (variant) => ({
            _id:
              variant._id.toString(),

            carModelId:
              variant
                .carModel
                ?._id
                ?.toString() ||
              "",

            carModelName:
              variant
                .carModel
                ?.title ||
              "",

            carModelImage:
              variant
                .carModel
                ?.imageUrl ||
              "",

            brandId:
              variant
                .carModel
                ?.brand
                ?._id
                ?.toString() ||
              "",

            brandName:
              variant
                .carModel
                ?.brand
                ?.name ||
              "",

            brandLogo:
              variant
                .carModel
                ?.brand
                ?.logoUrl ||
              "",

            variantName:
              variant.title ||
              "",

            variantImage:
              variant.imageUrl ||
              "",
          })
        );

      return res.status(200).json({
        success: true,
        carVariants: data,
      });
    } catch (err) {
      console.error(
        "GET CAR VARIANTS BY MODEL ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

// ============================================================
// GET SELECTED CAR VARIANTS
// ============================================================

export const getSelectedCarVariants =
  async (
    req,
    res
  ) => {
    try {
      const variants =
        await CarVariant.find({
          title: {
            $in: [
              "Base",
              "LXI",
              "VXI",
              "ZXI",
              "V",
              "VX",
              "ZX",
            ],
          },
        })
          .populate(
            {
              path: "carModel",
              select:
                "title imageUrl brand",
              populate: {
                path: "brand",
                select:
                  "name logoUrl",
              },
            }
          )
          .sort({
            createdAt: -1,
          });

      const data =
        variants.map(
          (variant) => ({
            _id:
              variant._id.toString(),

            carModelId:
              variant
                .carModel
                ?._id
                ?.toString() ||
              "",

            carModelName:
              variant
                .carModel
                ?.title ||
              "",

            carModelImage:
              variant
                .carModel
                ?.imageUrl ||
              "",

            brandId:
              variant
                .carModel
                ?.brand
                ?._id
                ?.toString() ||
              "",

            brandName:
              variant
                .carModel
                ?.brand
                ?.name ||
              "",

            brandLogo:
              variant
                .carModel
                ?.brand
                ?.logoUrl ||
              "",

            variantName:
              variant.title ||
              "",

            variantImage:
              variant.imageUrl ||
              "",
          })
        );

      return res.status(200).json({
        success: true,
        carVariants: data,
      });
    } catch (err) {
      console.error(
        "GET SELECTED CAR VARIANTS ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

// ============================================================
// UPDATE CAR VARIANT
// ============================================================

export const updateCarVariant =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      const {
        title,
        carModelId,
      } = req.body;

      // --------------------------------------------------------
      // FIND VARIANT
      // --------------------------------------------------------

      const variant =
        await CarVariant.findById(
          id
        );

      if (!variant) {
        return res.status(404).json({
          success: false,
          message:
            "Car variant not found",
        });
      }

      // --------------------------------------------------------
      // UPDATE TITLE
      // --------------------------------------------------------

      if (
        title &&
        title.trim()
      ) {
        variant.title =
          title.trim();
      }

      // --------------------------------------------------------
      // UPDATE CAR MODEL
      // --------------------------------------------------------

      if (carModelId) {
        const carModel =
          await CarModel.findById(
            carModelId
          );

        if (!carModel) {
          return res.status(404).json({
            success: false,
            message:
              "Car model not found",
          });
        }

        variant.carModel =
          carModelId;
      }

      // --------------------------------------------------------
      // UPDATE IMAGE
      // --------------------------------------------------------

      if (req.file) {
        await deleteCarVariantImage(
          variant.imageUrl
        );

        variant.imageUrl =
          await uploadCarVariantImage(
            req.file
          );
      }

      // --------------------------------------------------------
      // SAVE
      // --------------------------------------------------------

      await variant.save();

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      return res.status(200).json({
        success: true,
        carVariant:
          variant,
      });
    } catch (err) {
      console.error(
        "UPDATE CAR VARIANT ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

// ============================================================
// DELETE CAR VARIANT
// ============================================================

export const deleteCarVariant =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      // --------------------------------------------------------
      // FIND VARIANT
      // --------------------------------------------------------

      const variant =
        await CarVariant.findById(
          id
        );

      if (!variant) {
        return res.status(404).json({
          success: false,
          message:
            "Car variant not found",
        });
      }

      // --------------------------------------------------------
      // DELETE R2 IMAGE
      // --------------------------------------------------------

      await deleteCarVariantImage(
        variant.imageUrl
      );

      // --------------------------------------------------------
      // DELETE DATABASE DOCUMENT
      // --------------------------------------------------------

      await variant.deleteOne();

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      return res.status(200).json({
        success: true,
        message:
          "Car variant deleted",
      });
    } catch (err) {
      console.error(
        "DELETE CAR VARIANT ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };