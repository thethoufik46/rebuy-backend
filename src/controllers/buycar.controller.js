// ======================= buycar.controller.js =======================

import BuyCar from "../models/buycar_model.js";

import {
  deleteBuyCarAudio,
} from "../utils/buycarAudio.js";

/* ============================================================
   HELPERS
============================================================ */

const RECOVERY_TIME = 24 * 60 * 60 * 1000;

/*
  Remove expired soft-deleted records.

  IMPORTANT:
  This function runs whenever /my is requested.
  So expired records won't remain forever even without cron.
*/
const cleanupExpiredBuyCars = async () => {
  try {
    const now = new Date();

    const expiredCars =
      await BuyCar.find({
        isDeleted: true,
        deleteExpiresAt: {
          $lte: now,
        },
      }).select(
        "_id audioNote"
      );

    if (!expiredCars.length) {
      return;
    }

    /*
      Delete audio files from R2
      before permanently deleting DB records.
    */
    for (const car of expiredCars) {
      if (car.audioNote) {
        await deleteBuyCarAudio(
          car.audioNote
        );
      }
    }

    await BuyCar.deleteMany({
      _id: {
        $in: expiredCars.map(
          (car) => car._id
        ),
      },
    });

    console.log(
      `BUY CAR CLEANUP: ${expiredCars.length} expired request(s) permanently deleted`
    );
  } catch (error) {
    console.error(
      "BUY CAR EXPIRED CLEANUP ERROR 👉",
      error
    );
  }
};

/* ============================================================
   🟢 ADD BUY REQUEST
============================================================ */

export const addBuyCar = async (
  req,
  res
) => {
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

    /* ========================================================
       TYPE VALIDATION
    ======================================================== */

    if (
      type === "car" &&
      !car?.model
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Car details required",
      });
    }

    if (
      type === "bike" &&
      !bike?.model
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Bike details required",
      });
    }

    if (
      type === "property" &&
      !property?.category
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Property details required",
      });
    }

    if (
      type === "electronics" &&
      !electronics?.category
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Electronics details required",
      });
    }

    /* ========================================================
       CREATE
    ======================================================== */

    const newRequest =
      new BuyCar({
        type,

        name: String(
          name || ""
        ).trim(),

        phone: String(
          phone || ""
        ).trim(),

        location: String(
          location || ""
        ).trim(),

        description: String(
          description || ""
        ).trim(),

        /*
          IMPORTANT:
          audioNote must be the R2 PUBLIC URL.
        */
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
  } catch (error) {
    console.error(
      "ADD BUY CAR ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to submit request",
    });
  }
};

/* ============================================================
   🟢 GET MY REQUESTS

   Returns:

   {
      active: [],
      deleted: []
   }

============================================================ */

export const getMyBuyCars = async (
  req,
  res
) => {
  try {
    /*
      First remove anything whose
      24-hour recovery period expired.
    */
    await cleanupExpiredBuyCars();

    const userId =
      req.user._id;

    /* ========================================================
       ACTIVE
    ======================================================== */

    const active =
      await BuyCar.find({
        user: userId,
        isDeleted: false,
      }).sort({
        createdAt: -1,
      });

    /* ========================================================
       RECENTLY DELETED
    ======================================================== */

    const deleted =
      await BuyCar.find({
        user: userId,
        isDeleted: true,
        deleteExpiresAt: {
          $gt: new Date(),
        },
      }).sort({
        deletedAt: -1,
      });

    return res.json({
      success: true,

      count:
        active.length,

      active,

      deleted,
    });
  } catch (error) {
    console.error(
      "GET MY BUY CARS ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch requests",
    });
  }
};

/* ============================================================
   🟢 UPDATE MY REQUEST
============================================================ */

export const updateMyBuyCar = async (
  req,
  res
) => {
  try {
    const car =
      await BuyCar.findOne({
        _id: req.params.id,
        user: req.user._id,
        isDeleted: false,
      });

    if (!car) {
      return res.status(404).json({
        success: false,
        message:
          "Request not found",
      });
    }

    /*
      Prevent user from changing
      ownership / delete fields.
    */

    const allowedFields = [
      "type",
      "name",
      "phone",
      "location",
      "description",
      "audioNote",
      "car",
      "bike",
      "property",
      "electronics",
    ];

    for (const field of allowedFields) {
      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          field
        )
      ) {
        car[field] =
          req.body[field];
      }
    }

    await car.save();

    return res.json({
      success: true,
      message:
        "Request updated successfully",
      car,
    });
  } catch (error) {
    console.error(
      "UPDATE MY BUY CAR ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Update failed",
    });
  }
};

/* ============================================================
   🔴 SOFT DELETE MY REQUEST

   IMPORTANT:

   This DOES NOT delete MongoDB record.

   It changes:

   isDeleted       = true
   deletedAt       = now
   deleteExpiresAt = now + 24 hours

============================================================ */

export const deleteMyBuyCar = async (
  req,
  res
) => {
  try {
    const car =
      await BuyCar.findOne({
        _id: req.params.id,
        user: req.user._id,
        isDeleted: false,
      });

    if (!car) {
      return res.status(404).json({
        success: false,
        message:
          "Request not found",
      });
    }

    const deletedAt =
      new Date();

    const deleteExpiresAt =
      new Date(
        deletedAt.getTime() +
          RECOVERY_TIME
      );

    car.isDeleted = true;

    car.deletedAt =
      deletedAt;

    car.deleteExpiresAt =
      deleteExpiresAt;

    await car.save();

    return res.json({
      success: true,

      message:
        "Request moved to Recently Deleted",

      data: car,

      deletedAt,

      recoverUntil:
        deleteExpiresAt,
    });
  } catch (error) {
    console.error(
      "SOFT DELETE BUY CAR ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Delete failed",
    });
  }
};

/* ============================================================
   🟢 RESTORE MY REQUEST

   ONLY AVAILABLE WITHIN 24 HOURS
============================================================ */

export const restoreMyBuyCar = async (
  req,
  res
) => {
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
          "Deleted request not found or already permanently deleted",
      });
    }

    const now =
      new Date();

    /* ========================================================
       24 HOUR CHECK
    ======================================================== */

    if (
      !car.deleteExpiresAt ||
      car.deleteExpiresAt <= now
    ) {
      /*
        Delete audio from R2.
      */
      if (car.audioNote) {
        await deleteBuyCarAudio(
          car.audioNote
        );
      }

      await BuyCar.findByIdAndDelete(
        car._id
      );

      return res.status(410).json({
        success: false,
        message:
          "Recovery period expired. Request was permanently deleted.",
      });
    }

    /* ========================================================
       RESTORE
    ======================================================== */

    car.isDeleted =
      false;

    car.deletedAt =
      null;

    car.deleteExpiresAt =
      null;

    await car.save();

    return res.json({
      success: true,

      message:
        "Request recovered successfully",

      data: car,
    });
  } catch (error) {
    console.error(
      "RESTORE BUY CAR ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Recovery failed",
    });
  }
};

/* ============================================================
   🔵 GET ALL REQUESTS - ADMIN
============================================================ */

export const getBuyCars = async (
  req,
  res
) => {
  try {
    /*
      Cleanup expired deleted
      requests before admin list.
    */
    await cleanupExpiredBuyCars();

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
      filter.status =
        status;
    }

    const cars =
      await BuyCar.find(
        filter
      )
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
  } catch (error) {
    console.error(
      "GET BUY CARS ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch requests",
    });
  }
};

/* ============================================================
   🔵 GET SINGLE REQUEST - ADMIN
============================================================ */

export const getBuyCarById = async (
  req,
  res
) => {
  try {
    const car =
      await BuyCar.findById(
        req.params.id
      ).populate(
        "user",
        "name email"
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
  } catch (error) {
    console.error(
      "GET BUY CAR BY ID ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch request",
    });
  }
};

/* ============================================================
   🟡 UPDATE STATUS - ADMIN
============================================================ */

export const updateBuyCarStatus =
  async (
    req,
    res
  ) => {
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
        await BuyCar.findOne({
          _id: req.params.id,
          isDeleted: false,
        });

      if (!car) {
        return res.status(404).json({
          success: false,
          message:
            "Request not found",
        });
      }

      car.status =
        status;

      car.adminNote =
        adminNote
          ? String(
              adminNote
            ).trim()
          : "";

      await car.save();

      return res.json({
        success: true,
        car,
      });
    } catch (error) {
      console.error(
        "UPDATE BUY CAR STATUS ERROR 👉",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Status update failed",
      });
    }
  };

/* ============================================================
   🔴 ADMIN PERMANENT DELETE

   This route is different from user DELETE.

   Admin intentionally deletes permanently.
   Audio is also deleted from R2.
============================================================ */

export const deleteBuyCar = async (
  req,
  res
) => {
  try {
    const car =
      await BuyCar.findById(
        req.params.id
      );

    if (!car) {
      return res.status(404).json({
        success: false,
        message:
          "Request not found",
      });
    }

    /*
      Delete audio from R2
      before deleting MongoDB record.
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
        "Request permanently deleted",
    });
  } catch (error) {
    console.error(
      "ADMIN DELETE BUY CAR ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Permanent delete failed",
    });
  }
};