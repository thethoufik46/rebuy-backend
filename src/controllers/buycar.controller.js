// ======================= buycar.controller.js =======================

import BuyCar from "../models/buycar_model.js";

import {
  deleteBuyCarAudio,
} from "../utils/buyCarAudio.js";


/* ============================================================
   CONSTANTS
============================================================ */

const RECOVERY_MS =
  24 * 60 * 60 * 1000;


/* ============================================================
   USER ID
============================================================ */

const getUserId = (req) => {
  return req.user?._id;
};


/* ============================================================
   PERMANENT CLEANUP
============================================================ */

/*
  This function:

  1. Finds soft-deleted requests.
  2. Fixes old records without deleteExpiresAt.
  3. Checks 24 hour expiry.
  4. Deletes R2 audio.
  5. Permanently deletes Mongo document.
*/

export const cleanupExpiredBuyCars = async () => {
  try {
    const now = new Date();

    const deletedCars =
      await BuyCar.find({
        isDeleted: true,
      }).select(
        "_id audioNote deletedAt deleteExpiresAt"
      );

    if (!deletedCars.length) {
      return;
    }

    let deletedCount = 0;

    for (const car of deletedCars) {

      let expiresAt =
        car.deleteExpiresAt;


      /* ========================================================
         OLD RECORD FIX
      ======================================================== */

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


      /* ========================================================
         NO EXPIRY INFORMATION
      ======================================================== */

      if (!expiresAt) {
        continue;
      }


      /* ========================================================
         NOT EXPIRED
      ======================================================== */

      if (
        new Date(
          expiresAt
        ).getTime() >
        now.getTime()
      ) {
        continue;
      }


      /* ========================================================
         EXPIRED
      ======================================================== */

      try {

        /* Delete audio from Cloudflare R2 */

        if (car.audioNote) {
          await deleteBuyCarAudio(
            car.audioNote
          );
        }

      } catch (audioError) {

        /*
          Audio deletion failure should NOT
          stop Mongo cleanup.
        */

        console.error(
          "R2 AUDIO DELETE ERROR 👉",
          audioError
        );
      }


      /* ========================================================
         PERMANENT MONGO DELETE
      ======================================================== */

      await BuyCar.findByIdAndDelete(
        car._id
      );

      deletedCount++;
    }


    if (deletedCount > 0) {
      console.log(
        `BUY CAR CLEANUP 👉 ${deletedCount} expired request(s) permanently deleted`
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


    /* ========================================================
       TYPE
    ======================================================== */

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
        message: "Car details required",
      });
    }


    if (
      type === "bike" &&
      !bike?.model
    ) {
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
       USER
    ======================================================== */

    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }


    /* ========================================================
       CREATE
    ======================================================== */

    const newRequest =
      new BuyCar({

        type,

        user: userId,

        userId:
          userId.toString(),

        name:
          String(
            name || ""
          ).trim(),

        phone:
          String(
            phone || ""
          ).trim(),

        location:
          String(
            location || ""
          ).trim(),

        description:
          String(
            description || ""
          ).trim(),

        /*
          Must be R2 public URL.
        */

        audioNote:
          audioNote || null,


        /* TYPE DATA */

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


        /* ADMIN */

        status: "pending",

        adminNote: "",


        /* DELETE */

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
      Cleanup expired requests first.
    */

    await cleanupExpiredBuyCars();


    const userId =
      getUserId(req);


    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }


    /* ========================================================
       ACTIVE
    ======================================================== */

    const active =
      await BuyCar.find({
        user: userId,

        /*
          $ne handles:

          isDeleted: false
          OR old records where field doesn't exist.
        */

        isDeleted: {
          $ne: true,
        },

      }).sort({
        createdAt: -1,
      });


    /* ========================================================
       DELETED
    ======================================================== */

    const deletedRaw =
      await BuyCar.find({
        user: userId,

        isDeleted: true,

      }).sort({
        deletedAt: -1,
      });


    const deleted = [];

    const now =
      new Date();


    /* ========================================================
       MAKE SURE EXPIRY EXISTS
    ======================================================== */

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

        expiresAt =
          new Date(
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
        No expiry = don't show
      */

      if (!expiresAt) {
        continue;
      }


      /*
        Still recoverable
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


    /* ========================================================
       RESPONSE
    ======================================================== */

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

        user: getUserId(req),

        isDeleted: {
          $ne: true,
        },
      });


    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
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

        user: getUserId(req),

        isDeleted: {
          $ne: true,
        },
      });


    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }


    /* ========================================================
       EXACT DELETE TIME
    ======================================================== */

    const deletedAt =
      new Date();


    /* ========================================================
       EXACT +24 HOURS
    ======================================================== */

    const deleteExpiresAt =
      new Date(
        deletedAt.getTime() +
          RECOVERY_MS
      );


    /* ========================================================
       SOFT DELETE ONLY
    ======================================================== */

    car.isDeleted =
      true;

    car.deletedAt =
      deletedAt;

    car.deleteExpiresAt =
      deleteExpiresAt;


    /*
      IMPORTANT:

      DO NOT delete Mongo document here.

      DO NOT delete R2 audio here.

      User has 24 hours to recover.
    */


    await car.save();


    return res.json({

      success: true,

      message:
        "Request moved to Recently Deleted",

      data: car,

      deletedAt:
        deletedAt.toISOString(),

      deleteExpiresAt:
        deleteExpiresAt.toISOString(),

      recoverUntil:
        deleteExpiresAt.toISOString(),
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

        user: getUserId(req),

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


    /* ========================================================
       OLD RECORD FIX
    ======================================================== */

    if (
      !expiresAt &&
      car.deletedAt
    ) {

      expiresAt =
        new Date(
          new Date(
            car.deletedAt
          ).getTime() +
            RECOVERY_MS
        );

      car.deleteExpiresAt =
        expiresAt;

      await car.save();
    }


    /* ========================================================
       NO EXPIRY
    ======================================================== */

    if (!expiresAt) {

      return res.status(410).json({
        success: false,

        message:
          "Recovery period information unavailable",
      });
    }


    /* ========================================================
       EXPIRED
    ======================================================== */

    if (
      new Date(
        expiresAt
      ).getTime() <=
      now.getTime()
    ) {

      /*
        Delete R2 audio only now.
      */

      if (car.audioNote) {

        try {

          await deleteBuyCarAudio(
            car.audioNote
          );

        } catch (audioError) {

          console.error(
            "R2 AUDIO DELETE ERROR 👉",
            audioError
          );
        }
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

      /*
        Admin sees active requests only.
      */

      isDeleted: {
        $ne: true,
      },
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
        message: "Request not found",
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
          message: "Invalid status",
        });
      }


      const car =
        await BuyCar.findOne({
          _id: req.params.id,

          isDeleted: {
            $ne: true,
          },
        });


      if (!car) {

        return res.status(404).json({
          success: false,
          message: "Request not found",
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
        message: "Request not found",
      });
    }


    /* ========================================================
       DELETE R2 AUDIO
    ======================================================== */

    if (car.audioNote) {

      try {

        await deleteBuyCarAudio(
          car.audioNote
        );

      } catch (audioError) {

        console.error(
          "R2 AUDIO DELETE ERROR 👉",
          audioError
        );
      }
    }


    /* ========================================================
       PERMANENT MONGO DELETE
    ======================================================== */

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