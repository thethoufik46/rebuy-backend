// ======================= buyrequest.controller.js =======================

import BuyRequest from "../models/buyrequest_model.js";

import {
  deleteBuyRequestAudio,
} from "../utils/buyRequestAudio.js";


// ============================================================
// CONSTANTS
// ============================================================

const RECOVERY_MS =
  24 * 60 * 60 * 1000;


// ============================================================
// USER ID
// ============================================================

const getUserId = (req) => {
  return req.user?._id;
};


// ============================================================
// PERMANENT CLEANUP
// ============================================================
//
// This function:
//
// 1. Finds soft-deleted requests.
// 2. Fixes old records without deleteExpiresAt.
// 3. Checks 24 hour expiry.
// 4. Deletes R2 audio.
// 5. Permanently deletes Mongo document.
//
// ============================================================

export const cleanupExpiredBuyRequests = async () => {
  try {

    const now =
      new Date();


    const deletedRequests =
      await BuyRequest.find({
        isDeleted: true,
      }).select(
        "_id audioNote deletedAt deleteExpiresAt"
      );


    if (!deletedRequests.length) {
      return;
    }


    let deletedCount = 0;


    for (
      const request of deletedRequests
    ) {

      let expiresAt =
        request.deleteExpiresAt;


      // ========================================================
      // OLD RECORD FIX
      // ========================================================

      if (
        !expiresAt &&
        request.deletedAt
      ) {

        expiresAt =
          new Date(
            new Date(
              request.deletedAt
            ).getTime() +
              RECOVERY_MS
          );


        request.deleteExpiresAt =
          expiresAt;


        await request.save();
      }


      // ========================================================
      // NO EXPIRY INFORMATION
      // ========================================================

      if (!expiresAt) {
        continue;
      }


      // ========================================================
      // NOT EXPIRED
      // ========================================================

      if (
        new Date(
          expiresAt
        ).getTime() >
        now.getTime()
      ) {
        continue;
      }


      // ========================================================
      // EXPIRED
      // ========================================================

      try {

        // ------------------------------------------------------
        // Delete audio from Cloudflare R2
        // ------------------------------------------------------

        if (request.audioNote) {

          await deleteBuyRequestAudio(
            request.audioNote
          );
        }

      } catch (audioError) {

        // ------------------------------------------------------
        // Audio deletion failure should NOT
        // stop Mongo cleanup.
        // ------------------------------------------------------

        console.error(
          "R2 AUDIO DELETE ERROR 👉",
          audioError
        );
      }


      // ========================================================
      // PERMANENT MONGO DELETE
      // ========================================================

      await BuyRequest.findByIdAndDelete(
        request._id
      );


      deletedCount++;
    }


    if (deletedCount > 0) {

      console.log(
        `BUY REQUEST CLEANUP 👉 ${deletedCount} expired request(s) permanently deleted`
      );
    }

  } catch (error) {

    console.error(
      "BUY REQUEST CLEANUP ERROR 👉",
      error
    );
  }
};


// ============================================================
// 🟢 ADD BUY REQUEST
// ============================================================

export const addBuyRequest = async (
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


    // ========================================================
    // TYPE
    // ========================================================

    if (!type) {

      return res.status(400).json({
        success: false,
        message: "Type is required",
      });
    }


    // ========================================================
    // TYPE VALIDATION
    // ========================================================

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


    // ========================================================
    // USER
    // ========================================================

    const userId =
      getUserId(req);


    if (!userId) {

      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }


    // ========================================================
    // CREATE BUY REQUEST
    // ========================================================

    const newRequest =
      new BuyRequest({

        type,

        user:
          userId,

        userId:
          userId.toString(),


        // ------------------------------------------------------
        // USER DETAILS
        // ------------------------------------------------------

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


        // ------------------------------------------------------
        // AUDIO
        //
        // Must be R2 public URL.
        // ------------------------------------------------------

        audioNote:
          audioNote || null,


        // ------------------------------------------------------
        // TYPE DATA
        // ------------------------------------------------------

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


        // ------------------------------------------------------
        // ADMIN
        // ------------------------------------------------------

        status:
          "pending",

        adminNote:
          "",


        // ------------------------------------------------------
        // DELETE
        // ------------------------------------------------------

        isDeleted:
          false,

        deletedAt:
          null,

        deleteExpiresAt:
          null,
      });


    await newRequest.save();


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(201).json({

      success:
        true,

      message:
        "Buy request submitted successfully",

      data:
        newRequest,
    });

  } catch (error) {

    console.error(
      "ADD BUY REQUEST ERROR 👉",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        error.message ||
        "Failed to submit buy request",
    });
  }
};


// ============================================================
// 🟢 GET MY BUY REQUESTS
// ============================================================

export const getMyBuyRequests = async (
  req,
  res
) => {

  try {

    // --------------------------------------------------------
    // Cleanup expired requests first.
    // --------------------------------------------------------

    await cleanupExpiredBuyRequests();


    const userId =
      getUserId(req);


    if (!userId) {

      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }


    // ========================================================
    // ACTIVE REQUESTS
    // ========================================================

    const active =
      await BuyRequest.find({

        user:
          userId,

        /*
          $ne handles:

          isDeleted: false

          OR

          old records where field doesn't exist.
        */

        isDeleted: {
          $ne: true,
        },

      }).sort({
        createdAt: -1,
      });


    // ========================================================
    // DELETED REQUESTS
    // ========================================================

    const deletedRaw =
      await BuyRequest.find({

        user:
          userId,

        isDeleted:
          true,

      }).sort({
        deletedAt: -1,
      });


    const deleted = [];


    const now =
      new Date();


    // ========================================================
    // MAKE SURE EXPIRY EXISTS
    // ========================================================

    for (
      const request of deletedRaw
    ) {

      let expiresAt =
        request.deleteExpiresAt;


      // ------------------------------------------------------
      // OLD RECORD FIX
      // ------------------------------------------------------

      if (
        !expiresAt &&
        request.deletedAt
      ) {

        expiresAt =
          new Date(
            new Date(
              request.deletedAt
            ).getTime() +
              RECOVERY_MS
          );


        request.deleteExpiresAt =
          expiresAt;


        await request.save();
      }


      // ------------------------------------------------------
      // No expiry = don't show
      // ------------------------------------------------------

      if (!expiresAt) {
        continue;
      }


      // ------------------------------------------------------
      // Still recoverable
      // ------------------------------------------------------

      if (
        new Date(
          expiresAt
        ).getTime() >
        now.getTime()
      ) {

        deleted.push(
          request
        );
      }
    }


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.json({

      success:
        true,

      count:
        active.length,

      active,

      deleted,
    });

  } catch (error) {

    console.error(
      "GET MY BUY REQUESTS ERROR 👉",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        error.message ||
        "Failed to fetch buy requests",
    });
  }
};


// ============================================================
// 🟢 UPDATE MY BUY REQUEST
// ============================================================

export const updateMyBuyRequest = async (
  req,
  res
) => {

  try {

    const request =
      await BuyRequest.findOne({

        _id:
          req.params.id,

        user:
          getUserId(req),

        isDeleted: {
          $ne: true,
        },
      });


    if (!request) {

      return res.status(404).json({

        success:
          false,

        message:
          "Buy request not found",
      });
    }


    // ========================================================
    // ALLOWED FIELDS
    // ========================================================

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


    // ========================================================
    // UPDATE
    // ========================================================

    for (
      const field of allowedFields
    ) {

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          field
        )
      ) {

        request[field] =
          req.body[field];
      }
    }


    await request.save();


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.json({

      success:
        true,

      message:
        "Buy request updated successfully",

      data:
        request,
    });

  } catch (error) {

    console.error(
      "UPDATE MY BUY REQUEST ERROR 👉",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        error.message ||
        "Buy request update failed",
    });
  }
};


// ============================================================
// 🔴 SOFT DELETE MY BUY REQUEST
// ============================================================

export const deleteMyBuyRequest = async (
  req,
  res
) => {

  try {

    const request =
      await BuyRequest.findOne({

        _id:
          req.params.id,

        user:
          getUserId(req),

        isDeleted: {
          $ne: true,
        },
      });


    if (!request) {

      return res.status(404).json({

        success:
          false,

        message:
          "Buy request not found",
      });
    }


    // ========================================================
    // EXACT DELETE TIME
    // ========================================================

    const deletedAt =
      new Date();


    // ========================================================
    // EXACT +24 HOURS
    // ========================================================

    const deleteExpiresAt =
      new Date(
        deletedAt.getTime() +
          RECOVERY_MS
      );


    // ========================================================
    // SOFT DELETE ONLY
    // ========================================================

    request.isDeleted =
      true;

    request.deletedAt =
      deletedAt;

    request.deleteExpiresAt =
      deleteExpiresAt;


    /*
      IMPORTANT:

      DO NOT delete Mongo document here.

      DO NOT delete R2 audio here.

      User has 24 hours to recover.
    */


    await request.save();


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.json({

      success:
        true,

      message:
        "Buy request moved to Recently Deleted",

      data:
        request,

      deletedAt:
        deletedAt.toISOString(),

      deleteExpiresAt:
        deleteExpiresAt.toISOString(),

      recoverUntil:
        deleteExpiresAt.toISOString(),
    });

  } catch (error) {

    console.error(
      "SOFT DELETE BUY REQUEST ERROR 👉",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        error.message ||
        "Buy request delete failed",
    });
  }
};


// ============================================================
// 🟢 RESTORE MY BUY REQUEST
// ============================================================

export const restoreMyBuyRequest = async (
  req,
  res
) => {

  try {

    const request =
      await BuyRequest.findOne({

        _id:
          req.params.id,

        user:
          getUserId(req),

        isDeleted:
          true,
      });


    if (!request) {

      return res.status(404).json({

        success:
          false,

        message:
          "Deleted buy request not found or already permanently deleted",
      });
    }


    const now =
      new Date();


    let expiresAt =
      request.deleteExpiresAt;


    // ========================================================
    // OLD RECORD FIX
    // ========================================================

    if (
      !expiresAt &&
      request.deletedAt
    ) {

      expiresAt =
        new Date(
          new Date(
            request.deletedAt
          ).getTime() +
            RECOVERY_MS
        );


      request.deleteExpiresAt =
        expiresAt;


      await request.save();
    }


    // ========================================================
    // NO EXPIRY
    // ========================================================

    if (!expiresAt) {

      return res.status(410).json({

        success:
          false,

        message:
          "Recovery period information unavailable",
      });
    }


    // ========================================================
    // EXPIRED
    // ========================================================

    if (
      new Date(
        expiresAt
      ).getTime() <=
      now.getTime()
    ) {

      // ------------------------------------------------------
      // Delete R2 audio only now.
      // ------------------------------------------------------

      if (request.audioNote) {

        try {

          await deleteBuyRequestAudio(
            request.audioNote
          );

        } catch (audioError) {

          console.error(
            "R2 AUDIO DELETE ERROR 👉",
            audioError
          );
        }
      }


      // ------------------------------------------------------
      // Permanent Mongo delete
      // ------------------------------------------------------

      await BuyRequest.findByIdAndDelete(
        request._id
      );


      return res.status(410).json({

        success:
          false,

        message:
          "Recovery period expired. Buy request was permanently deleted.",
      });
    }


    // ========================================================
    // RESTORE
    // ========================================================

    request.isDeleted =
      false;

    request.deletedAt =
      null;

    request.deleteExpiresAt =
      null;


    await request.save();


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.json({

      success:
        true,

      message:
        "Buy request recovered successfully",

      data:
        request,
    });

  } catch (error) {

    console.error(
      "RESTORE BUY REQUEST ERROR 👉",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        error.message ||
        "Buy request recovery failed",
    });
  }
};


// ============================================================
// 🔵 ADMIN GET ALL BUY REQUESTS
// ============================================================

export const getBuyRequests = async (
  req,
  res
) => {

  try {

    // --------------------------------------------------------
    // Cleanup expired requests
    // --------------------------------------------------------

    await cleanupExpiredBuyRequests();


    // ========================================================
    // QUERY
    // ========================================================

    const {
      type,
      status,
    } = req.query;


    // ========================================================
    // FILTER
    // ========================================================

    const filter = {

      /*
        Admin sees active requests only.
      */

      isDeleted: {
        $ne: true,
      },
    };


    // --------------------------------------------------------
    // Type filter
    // --------------------------------------------------------

    if (type) {

      filter.type =
        type;
    }


    // --------------------------------------------------------
    // Status filter
    // --------------------------------------------------------

    if (status) {

      filter.status =
        status;
    }


    // ========================================================
    // GET REQUESTS
    // ========================================================

    const requests =
      await BuyRequest.find(
        filter
      )
        .populate(
          "user",
          "name email"
        )
        .sort({
          createdAt: -1,
        });


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.json({

      success:
        true,

      count:
        requests.length,

      requests,
    });

  } catch (error) {

    console.error(
      "GET BUY REQUESTS ERROR 👉",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        error.message ||
        "Failed to fetch buy requests",
    });
  }
};


// ============================================================
// 🔵 ADMIN GET SINGLE BUY REQUEST
// ============================================================

export const getBuyRequestById = async (
  req,
  res
) => {

  try {

    const request =
      await BuyRequest.findById(
        req.params.id
      ).populate(
        "user",
        "name email"
      );


    if (!request) {

      return res.status(404).json({

        success:
          false,

        message:
          "Buy request not found",
      });
    }


    return res.json({

      success:
        true,

      request,
    });

  } catch (error) {

    console.error(
      "GET BUY REQUEST BY ID ERROR 👉",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        error.message ||
        "Failed to fetch buy request",
    });
  }
};


// ============================================================
// 🟡 ADMIN UPDATE BUY REQUEST STATUS
// ============================================================

export const updateBuyRequestStatus =
  async (
    req,
    res
  ) => {

    try {

      const {
        status,
        adminNote,
      } = req.body;


      // ======================================================
      // STATUS VALIDATION
      // ======================================================

      if (
        ![
          "pending",
          "approved",
          "rejected",
        ].includes(
          status
        )
      ) {

        return res.status(400).json({

          success:
            false,

          message:
            "Invalid status",
        });
      }


      // ======================================================
      // FIND ACTIVE REQUEST
      // ======================================================

      const request =
        await BuyRequest.findOne({

          _id:
            req.params.id,

          isDeleted: {
            $ne: true,
          },
        });


      if (!request) {

        return res.status(404).json({

          success:
            false,

          message:
            "Buy request not found",
        });
      }


      // ======================================================
      // UPDATE STATUS
      // ======================================================

      request.status =
        status;


      request.adminNote =
        adminNote
          ? String(
              adminNote
            ).trim()
          : "";


      await request.save();


      // ======================================================
      // RESPONSE
      // ======================================================

      return res.json({

        success:
          true,

        message:
          "Buy request status updated successfully",

        request,
      });

    } catch (error) {

      console.error(
        "UPDATE BUY REQUEST STATUS ERROR 👉",
        error
      );


      return res.status(500).json({

        success:
          false,

        message:
          error.message ||
          "Buy request status update failed",
      });
    }
  };


// ============================================================
// 🔴 ADMIN PERMANENT DELETE
// ============================================================
//
// Admin can permanently delete any request.
//
// MongoDB document -> deleted
// R2 audio         -> deleted
//
// ============================================================

export const deleteBuyRequest = async (
  req,
  res
) => {

  try {

    // ========================================================
    // FIND REQUEST
    // ========================================================

    const request =
      await BuyRequest.findById(
        req.params.id
      );


    if (!request) {

      return res.status(404).json({

        success:
          false,

        message:
          "Buy request not found",
      });
    }


    // ========================================================
    // DELETE R2 AUDIO
    // ========================================================

    if (request.audioNote) {

      try {

        await deleteBuyRequestAudio(
          request.audioNote
        );

      } catch (audioError) {

        console.error(
          "R2 AUDIO DELETE ERROR 👉",
          audioError
        );
      }
    }


    // ========================================================
    // PERMANENT MONGO DELETE
    // ========================================================

    await BuyRequest.findByIdAndDelete(
      request._id
    );


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.json({

      success:
        true,

      message:
        "Buy request permanently deleted",
    });

  } catch (error) {

    console.error(
      "ADMIN PERMANENT DELETE BUY REQUEST ERROR 👉",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        error.message ||
        "Buy request permanent delete failed",
    });
  }
};