// ======================= buycar.controller.js =======================

import BuyCar from "../models/buycar_model.js";
import {
  deleteBuyCarAudio,
} from "../utils/buycarAudio.js";

/* ============================================================
   ADD BUY REQUEST
============================================================ */

export const addBuyCar = async (req, res) => {
  try {
    const {
      type,
      name,
      phone,
      location,
      description,
      audioNote,
      car,
      bike,
      property,
      electronics,
    } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Type is required",
      });
    }

    if (
      !["car", "bike", "property", "electronics"].includes(
        type
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid type",
      });
    }

    /* ========================================================
       TYPE VALIDATION
    ======================================================== */

    if (type === "car" && !car?.model) {
      return res.status(400).json({
        success: false,
        message: "Car details required",
      });
    }

    if (type === "bike" && !bike?.model) {
      return res.status(400).json({
        success: false,
        message: "Bike details required",
      });
    }

    if (
      type === "property" &&
      !property?.category
    ) {
      return res.status(400).json({
        success: false,
        message: "Property details required",
      });
    }

    if (
      type === "electronics" &&
      !electronics?.category
    ) {
      return res.status(400).json({
        success: false,
        message: "Electronics details required",
      });
    }

    /* ========================================================
       CREATE
    ======================================================== */

    const newRequest = new BuyCar({
      type,

      name: String(name || "").trim(),

      phone: String(phone || "").trim(),

      location: String(location || "").trim(),

      description: String(
        description || ""
      ).trim(),

      audioNote:
        audioNote || null,

      user: req.user._id,

      userId:
        req.user._id.toString(),

      car:
        type === "car"
          ? car
          : undefined,

      bike:
        type === "bike"
          ? bike
          : undefined,

      property:
        type === "property"
          ? property
          : undefined,

      electronics:
        type === "electronics"
          ? electronics
          : undefined,

      status: "pending",

      isDeleted: false,

      deletedAt: null,

      deleteExpiresAt: null,
    });

    await newRequest.save();

    return res.status(201).json({
      success: true,
      message:
        "Request submitted successfully",
      data: newRequest,
    });
  } catch (err) {
    console.error(
      "addBuyCar error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ============================================================
   GET MY REQUESTS
   ACTIVE + DELETED
============================================================ */

export const getMyBuyCars = async (
  req,
  res
) => {
  try {
    const all = await BuyCar.find({
      user: req.user._id,
    }).sort({
      createdAt: -1,
    });

    const active = all.filter(
      (item) =>
        item.isDeleted !== true
    );

    const deleted = all.filter(
      (item) =>
        item.isDeleted === true
    );

    return res.json({
      success: true,

      count: active.length,

      active,

      deleted,
    });
  } catch (err) {
    console.error(
      "getMyBuyCars error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ============================================================
   UPDATE MY REQUEST
============================================================ */

export const updateMyBuyCar = async (
  req,
  res
) => {
  try {
    const car =
      await BuyCar.findOneAndUpdate(
        {
          _id: req.params.id,

          user: req.user._id,

          isDeleted: false,
        },

        req.body,

        {
          new: true,
          runValidators: true,
        }
      );

    if (!car) {
      return res.status(404).json({
        success: false,
        message:
          "Request not found",
      });
    }

    return res.json({
      success: true,
      car,
    });
  } catch (err) {
    console.error(
      "updateMyBuyCar error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ============================================================
   DELETE MY REQUEST
   IMPORTANT:
   THIS IS SOFT DELETE.
   NOT findOneAndDelete().
============================================================ */

export const deleteMyBuyCar = async (
  req,
  res
) => {
  try {
    const now = new Date();

    const expiresAt =
      new Date(
        now.getTime() +
          24 * 60 * 60 * 1000
      );

    const car =
      await BuyCar.findOneAndUpdate(
        {
          _id: req.params.id,

          user: req.user._id,

          isDeleted: false,
        },

        {
          $set: {
            isDeleted: true,

            deletedAt: now,

            deleteExpiresAt:
              expiresAt,
          },
        },

        {
          new: true,
        }
      );

    if (!car) {
      return res.status(404).json({
        success: false,
        message:
          "Request not found or already deleted",
      });
    }

    /*
      IMPORTANT:
      DO NOT DELETE audio here.

      Audio stays in R2 for 24 hours
      because user can recover the request.
    */

    return res.json({
      success: true,

      message:
        "Request moved to Recently Deleted",

      data: car,

      recoverUntil:
        expiresAt,
    });
  } catch (err) {
    console.error(
      "deleteMyBuyCar error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ============================================================
   RESTORE MY REQUEST
   ONLY WITHIN 24 HOURS
============================================================ */

export const restoreMyBuyCar =
  async (req, res) => {
    try {
      const car =
        await BuyCar.findOne({
          _id: req.params.id,

          user: req.user._id,

          isDeleted: true,
        });

      if (!car) {
        return res.status(404).json({
          success: false,
          message:
            "Deleted request not found",
        });
      }

      /* ======================================================
         CHECK 24 HOURS
      ====================================================== */

      const now =
        new Date();

      if (
        !car.deleteExpiresAt ||
        now >= car.deleteExpiresAt
      ) {
        return res.status(410).json({
          success: false,
          message:
            "Recovery period expired",
        });
      }

      /* ======================================================
         RESTORE
      ====================================================== */

      car.isDeleted = false;

      car.deletedAt = null;

      car.deleteExpiresAt = null;

      await car.save();

      return res.json({
        success: true,

        message:
          "Request recovered successfully",

        data: car,
      });
    } catch (err) {
      console.error(
        "restoreMyBuyCar error:",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

/* ============================================================
   GET ALL REQUESTS - ADMIN
============================================================ */

export const getBuyCars = async (
  req,
  res
) => {
  try {
    const {
      type,
      status,
    } = req.query;

    const filter = {
      isDeleted: false,
    };

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    const cars =
      await BuyCar.find(filter)
        .populate(
          "user",
          "name email"
        )
        .sort({
          createdAt: -1,
        });

    return res.json({
      success: true,

      count: cars.length,

      cars,
    });
  } catch (err) {
    console.error(
      "getBuyCars error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ============================================================
   GET SINGLE REQUEST - ADMIN
============================================================ */

export const getBuyCarById =
  async (req, res) => {
    try {
      const car =
        await BuyCar.findOne({
          _id: req.params.id,

          isDeleted: false,
        }).populate(
          "user",
          "name email"
        );

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Not found",
        });
      }

      return res.json({
        success: true,
        car,
      });
    } catch (err) {
      console.error(
        "getBuyCarById error:",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

/* ============================================================
   UPDATE STATUS - ADMIN
============================================================ */

export const updateBuyCarStatus =
  async (req, res) => {
    try {
      const {
        status,
        adminNote,
      } = req.body;

      if (
        ![
          "pending",
          "approved",
          "rejected",
        ].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status",
        });
      }

      const car =
        await BuyCar.findOneAndUpdate(
          {
            _id: req.params.id,

            isDeleted: false,
          },

          {
            $set: {
              status,

              adminNote:
                adminNote || "",
            },
          },

          {
            new: true,
          }
        );

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Not found",
        });
      }

      return res.json({
        success: true,
        car,
      });
    } catch (err) {
      console.error(
        "updateBuyCarStatus error:",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

/* ============================================================
   ADMIN DELETE
   PERMANENT DELETE
============================================================ */

export const deleteBuyCar =
  async (req, res) => {
    try {
      const car =
        await BuyCar.findById(
          req.params.id
        );

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Not found",
        });
      }

      /*
        Delete R2 audio only when
        document is permanently deleted.
      */

      if (car.audioNote) {
        await deleteBuyCarAudio(
          car.audioNote
        );
      }

      await BuyCar.findByIdAndDelete(
        req.params.id
      );

      return res.json({
        success: true,

        message:
          "Permanently deleted successfully",
      });
    } catch (err) {
      console.error(
        "deleteBuyCar error:",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };