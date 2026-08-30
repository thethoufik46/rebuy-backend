// ======================= buyrequest.controller.js =======================

import BuyRequest from "../models/buyrequest_model.js";

import {
  uploadBuyRequestAudio,
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
// SAFE OBJECT PARSER
// ============================================================

const parseObject = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return undefined;
  }
};


// ============================================================
// PERMANENT CLEANUP
// ============================================================
//
// 24 hours after soft delete:
// MongoDB document -> permanently deleted
// R2 audio        -> permanently deleted
//
// ============================================================

export const cleanupExpiredBuyRequests = async () => {
  try {

    const now = new Date();

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


    for (const request of deletedRequests) {

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

        if (request.audioNote) {

          await deleteBuyRequestAudio(
            request.audioNote
          );
        }

      } catch (audioError) {

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
//
// IMPORTANT:
//
// Flutter sends multipart/form-data.
//
// type
// name
// phone
// location
// description
//
// car / bike / property / electronics
// come as JSON strings.
//
// audio comes through req.file.
//
// ============================================================

export const addBuyRequest = async (
  req,
  res
) => {

  try {

    // ========================================================
    // BODY
    // ========================================================

    let {
      type,
      name,
      phone,
      location,
      description,

      car,
      bike,
      property,
      electronics,
    } = req.body;


    // ========================================================
    // CLEAN TYPE
    // ========================================================

    type = String(
      type || ""
    )
      .trim()
      .toLowerCase();


    // ========================================================
    // TYPE REQUIRED
    // ========================================================

    if (!type) {

      return res.status(400).json({
        success: false,
        message: "Type is required",
      });
    }


    // ========================================================
    // VALID TYPES
    // ========================================================

    const allowedTypes = [
      "car",
      "bike",
      "property",
      "electronics",
    ];


    if (
      !allowedTypes.includes(type)
    ) {

      return res.status(400).json({
        success: false,
        message: "Invalid request type",
      });
    }


    // ========================================================
    // PARSE NESTED DATA
    // ========================================================

    car =
      parseObject(car);

    bike =
      parseObject(bike);

    property =
      parseObject(property);

    electronics =
      parseObject(electronics);


    // ========================================================
    // CAR VALIDATION
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


    // ========================================================
    // BIKE VALIDATION
    // ========================================================

    if (
      type === "bike" &&
      !bike?.model
    ) {

      return res.status(400).json({
        success: false,
        message: "Bike details required",
      });
    }


    // ========================================================
    // PROPERTY VALIDATION
    // ========================================================

    if (
      type === "property" &&
      !property?.category
    ) {

      return res.status(400).json({
        success: false,
        message: "Property details required",
      });
    }


    // ========================================================
    // ELECTRONICS VALIDATION
    // ========================================================

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
    // BASIC DATA
    // ========================================================

    const cleanName =
      String(
        name || ""
      ).trim();


    const cleanPhone =
      String(
        phone || ""
      ).replace(
        /\D/g,
        ""
      );


    const cleanLocation =
      String(
        location || ""
      ).trim();


    const cleanDescription =
      String(
        description || ""
      ).trim();


    // ========================================================
    // NAME
    // ========================================================

    if (!cleanName) {

      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }


    // ========================================================
    // PHONE
    // ========================================================

    if (
      !/^[6-9]\d{9}$/.test(
        cleanPhone
      )
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Invalid phone number",
      });
    }


    // ========================================================
    // LOCATION
    // ========================================================

    if (!cleanLocation) {

      return res.status(400).json({
        success: false,
        message:
          "Location is required",
      });
    }


    // ========================================================
    // AUDIO
    // ========================================================

    let audioNote = null;


    if (req.file) {

      try {

        audioNote =
          await uploadBuyRequestAudio(
            req.file,
            "buyrequest/audio"
          );

      } catch (audioError) {

        console.error(
          "BUY REQUEST AUDIO UPLOAD ERROR 👉",
          audioError
        );


        return res.status(500).json({
          success: false,
          message:
            "Audio upload failed",
        });
      }
    }


    // ========================================================
    // CREATE REQUEST
    // ========================================================

    const newRequest =
      new BuyRequest({

        // ----------------------------------------------------
        // TYPE
        // ----------------------------------------------------

        type,


        // ----------------------------------------------------
        // USER
        // ----------------------------------------------------

        user:
          userId,

        userId:
          userId.toString(),


        // ----------------------------------------------------
        // USER DETAILS
        // ----------------------------------------------------

        name:
          cleanName,

        phone:
          cleanPhone,

        location:
          cleanLocation,

        description:
          cleanDescription,


        // ----------------------------------------------------
        // AUDIO
        // ----------------------------------------------------

        audioNote:
          audioNote,


        // ----------------------------------------------------
        // TYPE DATA
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // ADMIN
        // ----------------------------------------------------

        status:
          "pending",

        adminNote:
          "",


        // ----------------------------------------------------
        // DELETE
        // ----------------------------------------------------

        isDeleted:
          false,

        deletedAt:
          null,

        deleteExpiresAt:
          null,
      });


    // ========================================================
    // SAVE
    // ========================================================

    await newRequest.save();


    // ========================================================
    // SUCCESS
    // ========================================================

    return res.status(201).json({

      success: true,

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

      success: false,

      message:
        error?.message ||
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
    // CLEANUP
    // --------------------------------------------------------

    await cleanupExpiredBuyRequests();


    // --------------------------------------------------------
    // USER
    // --------------------------------------------------------

    const userId =
      getUserId(req);


    if (!userId) {

      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }


    // ========================================================
    // ACTIVE
    // ========================================================

    const active =
      await BuyRequest.find({

        user:
          userId,

        isDeleted: {
          $ne: true,
        },

      }).sort({
        createdAt: -1,
      });


    // ========================================================
    // DELETED
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
    // RECOVERY WINDOW
    // ========================================================

    for (
      const request of deletedRaw
    ) {

      let expiresAt =
        request.deleteExpiresAt;


      // ------------------------------------------------------
      // OLD RECORD
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
      // NO EXPIRY
      // ------------------------------------------------------

      if (!expiresAt) {
        continue;
      }


      // ------------------------------------------------------
      // STILL RECOVERABLE
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

      success: true,

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

      success: false,

      message:
        error?.message ||
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

        success: false,

        message:
          "Buy request not found",
      });
    }


    // ========================================================
    // BASIC FIELDS
    // ========================================================

    if (
      req.body.type !== undefined
    ) {

      request.type =
        String(
          req.body.type
        )
          .trim()
          .toLowerCase();
    }


    if (
      req.body.name !== undefined
    ) {

      request.name =
        String(
          req.body.name
        ).trim();
    }


    if (
      req.body.phone !== undefined
    ) {

      const cleanPhone =
        String(
          req.body.phone
        ).replace(
          /\D/g,
          ""
        );


      if (
        !/^[6-9]\d{9}$/.test(
          cleanPhone
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid phone number",
        });
      }


      request.phone =
        cleanPhone;
    }


    if (
      req.body.location !== undefined
    ) {

      request.location =
        String(
          req.body.location
        ).trim();
    }


    if (
      req.body.description !== undefined
    ) {

      request.description =
        String(
          req.body.description
        ).trim();
    }


    // ========================================================
    // NESTED DATA
    // ========================================================

    if (
      req.body.car !== undefined
    ) {

      request.car =
        parseObject(
          req.body.car
        );
    }


    if (
      req.body.bike !== undefined
    ) {

      request.bike =
        parseObject(
          req.body.bike
        );
    }


    if (
      req.body.property !== undefined
    ) {

      request.property =
        parseObject(
          req.body.property
        );
    }


    if (
      req.body.electronics !== undefined
    ) {

      request.electronics =
        parseObject(
          req.body.electronics
        );
    }


    // ========================================================
    // AUDIO UPDATE
    // ========================================================

    if (req.file) {

      if (request.audioNote) {

        try {

          await deleteBuyRequestAudio(
            request.audioNote
          );

        } catch (audioError) {

          console.error(
            "OLD AUDIO DELETE ERROR 👉",
            audioError
          );
        }
      }


      request.audioNote =
        await uploadBuyRequestAudio(
          req.file,
          "buyrequest/audio"
        );
    }


    // ========================================================
    // SAVE
    // ========================================================

    await request.save();


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.json({

      success: true,

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

      success: false,

      message:
        error?.message ||
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

        success: false,

        message:
          "Buy request not found",
      });
    }


    // ========================================================
    // DELETE TIME
    // ========================================================

    const deletedAt =
      new Date();


    const deleteExpiresAt =
      new Date(
        deletedAt.getTime() +
          RECOVERY_MS
      );


    // ========================================================
    // SOFT DELETE
    // ========================================================

    request.isDeleted =
      true;

    request.deletedAt =
      deletedAt;

    request.deleteExpiresAt =
      deleteExpiresAt;


    // IMPORTANT:
//
// Mongo document is NOT deleted here.
// R2 audio is NOT deleted here.
//
// User has 24 hours to restore.

    await request.save();


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.json({

      success: true,

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

      success: false,

      message:
        error?.message ||
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

        success: false,

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

        success: false,

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
      // DELETE AUDIO
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
      // PERMANENT DELETE
      // ------------------------------------------------------

      await BuyRequest.findByIdAndDelete(
        request._id
      );


      return res.status(410).json({

        success: false,

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

      success: true,

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

      success: false,

      message:
        error?.message ||
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

    // ========================================================
    // CLEANUP
    // ========================================================

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


    // ========================================================
    // GET
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

      success: true,

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

      success: false,

      message:
        error?.message ||
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

        success: false,

        message:
          "Buy request not found",
      });
    }


    return res.json({

      success: true,

      request,
    });


  } catch (error) {

    console.error(
      "GET BUY REQUEST BY ID ERROR 👉",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        error?.message ||
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

          success: false,

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

          success: false,

          message:
            "Buy request not found",
        });
      }


      // ======================================================
      // UPDATE
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

        success: true,

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

        success: false,

        message:
          error?.message ||
          "Buy request status update failed",
      });
    }
  };


// ============================================================
// 🔴 ADMIN PERMANENT DELETE
// ============================================================

export const deleteBuyRequest = async (
  req,
  res
) => {

  try {

    // ========================================================
    // FIND
    // ========================================================

    const request =
      await BuyRequest.findById(
        req.params.id
      );


    if (!request) {

      return res.status(404).json({

        success: false,

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
    // DELETE MONGO
    // ========================================================

    await BuyRequest.findByIdAndDelete(
      request._id
    );


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.json({

      success: true,

      message:
        "Buy request permanently deleted",
    });


  } catch (error) {

    console.error(
      "ADMIN PERMANENT DELETE BUY REQUEST ERROR 👉",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        error?.message ||
        "Buy request permanent delete failed",
    });
  }
};