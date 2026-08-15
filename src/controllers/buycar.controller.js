// ======================= buycar.controller.js =======================

import BuyCar from "../models/buycar_model.js";

import {
  deleteBuyCarAudio,
} from "../utils/buycarAudio.js";

/* ============================================================
   CONSTANTS
============================================================ */

const RECOVERY_MS =
  24 * 60 * 60 * 1000;

/* ============================================================
   GET ID
============================================================ */

const getId = (req) => {
  return req.user?._id;
};

/* ============================================================
   CLEANUP EXPIRED DELETED REQUESTS
============================================================ */

const cleanupExpiredBuyCars = async () => {
  try {
    const now = new Date();

    /*
      First find ALL soft deleted records.

      We intentionally do NOT filter only by
      deleteExpiresAt here.

      This also catches old records which were
      deleted before deleteExpiresAt was added.
    */

    const deletedCars =
      await BuyCar.find({
        isDeleted: true,
      }).select(
        "_id audioNote deletedAt deleteExpiresAt"
      );

    if (!deletedCars.length) {
      return;
    }

    const permanentlyDeleteIds = [];

    for (const car of deletedCars) {
      let expiresAt =
        car.deleteExpiresAt;

      /*
        ========================================================
        OLD RECORD FIX

        If deleteExpiresAt does not exist,
        calculate it from deletedAt.
        ========================================================
      */

      if (
        !expiresAt &&
        car.deletedAt
      ) {
        expiresAt = new Date(
          new Date(
            car.deletedAt
          ).getTime() +
            RECOVERY_MS
        );

        /*
          Save calculated expiry time
          so future requests work normally.
        */

        car.deleteExpiresAt =
          expiresAt;

        await car.save();
      }

      /*
        If there is still no valid expiry,
        keep the record instead of deleting it.
      */

      if (!expiresAt) {
        continue;
      }

      /*
        ========================================================
        24 HOURS EXPIRED
        ========================================================
      */

      if (
        new Date(
          expiresAt
        ).getTime() <=
        now.getTime()
      ) {
        permanentlyDeleteIds.push(
          car
        );
      }
    }

    /*
      ========================================================
      PERMANENT DELETE
      ========================================================
    */

    if (
      permanentlyDeleteIds.length
    ) {
      for (
        const car of permanentlyDeleteIds
      ) {
        /*
          Delete audio from Cloudflare R2
          only when the 24 hour period is over.
        */

        if (car.audioNote) {
          await deleteBuyCarAudio(
            car.audioNote
          );
        }

        await BuyCar.findByIdAndDelete(
          car._id
        );
      }

      console.log(
        `BUY CAR CLEANUP: ${permanentlyDeleteIds.length} expired request(s) permanently deleted`
      );
    }
  } catch (error) {
    console.error(
      "BUY CAR CLEANUP ERROR 👉",
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
        message:
          "Type is required",
      });
    }

    /*
      TYPE VALIDATION
    */

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

    /*
      CREATE REQUEST
    */

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
          This must be R2 public URL.
        */

        audioNote:
          audioNote || null,

        user: getId(req),

        userId:
          getId(req).toString(),

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
============================================================ */

export const getMyBuyCars = async (
  req,
  res
) => {
  try {
    /*
      IMPORTANT:
      Cleanup first.

      This also fixes old deleted
      records which don't have
      deleteExpiresAt.
    */

    await cleanupExpiredBuyCars();

    const userId =
      getId(req);

    /* ========================================================
       ACTIVE
    ======================================================== */

    const active =
      await BuyCar.find({
        user: userId,

        $or: [
          {
            isDeleted: false,
          },
          {
            isDeleted: {
              $exists: false,
            },
          },
        ],
      }).sort({
        createdAt: -1,
      });

    /* ========================================================
       DELETED

       IMPORTANT:

       DO NOT use:

       deleteExpiresAt: { $gt: new Date() }

       alone.

       Old records may not have that
       field.

    ======================================================== */

    const deletedRaw =
      await BuyCar.find({
        user: userId,

        isDeleted: true,
      }).sort({
        deletedAt: -1,
      });

    /*
      Make sure every deleted record
      has deleteExpiresAt.

      This is also a migration for
      your existing MongoDB records.
    */

    const deleted = [];

    const now = new Date();

    for (
      const car of deletedRaw
    ) {
      let expiresAt =
        car.deleteExpiresAt;

      /*
        OLD RECORD:

        deletedAt exists
        deleteExpiresAt missing
      */

      if (
        !expiresAt &&
        car.deletedAt
      ) {
        expiresAt = new Date(
          new Date(
            car.deletedAt
          ).getTime() +
            RECOVERY_MS
        );

        car.deleteExpiresAt =
          expiresAt;

        await car.save();
      }

      /*
        If no expiry information,
        don't show it as recoverable.
      */

      if (!expiresAt) {
        continue;
      }

      /*
        Still within 24 hours
      */

      if (
        new Date(
          expiresAt
        ).getTime() >
        now.getTime()
      ) {
        deleted.push(
          car
        );
      }
    }

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

        user: getId(req),

        isDeleted: false,
      });

    if (!car) {
      return res.status(404).json({
        success: false,

        message:
          "Request not found",
      });
    }

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

    for (
      const field of allowedFields
    ) {
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
   🔴 SOFT DELETE
============================================================ */

export const deleteMyBuyCar = async (
  req,
  res
) => {
  try {
    const car =
      await BuyCar.findOne({
        _id: req.params.id,

        user: getId(req),

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
          RECOVERY_MS
      );

    /*
      SOFT DELETE ONLY
    */

    car.isDeleted =
      true;

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

      deleteExpiresAt,

      recoverUntil:
        deleteExpiresAt,
    });
  } catch (error) {
    console.error(
      "SOFT DELETE ERROR 👉",
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
   🟢 RESTORE
============================================================ */

export const restoreMyBuyCar = async (
  req,
  res
) => {
  try {
    const car =
      await BuyCar.findOne({
        _id: req.params.id,

        user: getId(req),

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

    let expiresAt =
      car.deleteExpiresAt;

    /*
      OLD RECORD FIX
    */

    if (
      !expiresAt &&
      car.deletedAt
    ) {
      expiresAt = new Date(
        new Date(
          car.deletedAt
        ).getTime() +
          RECOVERY_MS
      );

      car.deleteExpiresAt =
        expiresAt;

      await car.save();
    }

    /*
      NO EXPIRY
    */

    if (!expiresAt) {
      return res.status(410).json({
        success: false,

        message:
          "Recovery period information unavailable",
      });
    }

    /*
      EXPIRED
    */

    if (
      new Date(
        expiresAt
      ).getTime() <=
      now.getTime()
    ) {
      /*
        Delete R2 audio
        after recovery expires.
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

    /*
      RESTORE
    */

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
   🔵 ADMIN GET ALL
============================================================ */

export const getBuyCars = async (
  req,
  res
) => {
  try {
    await cleanupExpiredBuyCars();

    const {
      type,
      status,
    } = req.query;

    const filter = {
      isDeleted: false,
    };

    if (type) {
      filter.type =
        type;
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

      count:
        cars.length,

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
   🔵 ADMIN SINGLE
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
   🟡 ADMIN UPDATE STATUS
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
        "UPDATE STATUS ERROR 👉",
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
      Delete R2 audio
      for admin permanent delete.
    */

    if (car.audioNote) {
      await deleteBuyCarAudio(
        car.audioNote
      );
    }

    await BuyCar.findByIdAndDelete(
      car._id
    );

    return res.json({
      success: true,

      message:
        "Request permanently deleted",
    });
  } catch (error) {
    console.error(
      "ADMIN PERMANENT DELETE ERROR 👉",
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