
// ============================================================
// oldspare.controller.js
// OLD SPARE WANT CONTROLLER
// ============================================================

import OldSpare from "../models/oldspare_model.js";

import {
  uploadOldSpareImage,
  deleteOldSpareImage,
} from "../utils/oldSpareImage.js";

// ============================================================
// USER ID
// ============================================================

const getUserId = (req) => {
  return req.user?._id;
};

// ============================================================
// ADD OLD SPARE WANT
// ============================================================

export const addOldSpare = async (req, res) => {
  try {
    const {
      spareName,
      category,
      description,
    } = req.body;

    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // ========================================================
    // USER DETAILS
    // ========================================================

    const cleanName = String(
      req.user?.name || ""
    ).trim();

    const cleanPhone = String(
      req.user?.phone ||
        req.user?.mobile ||
        ""
    ).replace(/\D/g, "");

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: "User name not found",
      });
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message:
          "User phone number not found or invalid",
      });
    }

    // ========================================================
    // SPARE NAME
    // ========================================================

    const cleanSpareName = String(
      spareName || ""
    ).trim();

    if (!cleanSpareName) {
      return res.status(400).json({
        success: false,
        message: "Spare name is required",
      });
    }

    if (cleanSpareName.length > 30) {
      return res.status(400).json({
        success: false,
        message:
          "Spare name maximum 30 characters",
      });
    }

    // ========================================================
    // CATEGORY
    // ========================================================

    const cleanCategory = String(
      category || ""
    )
      .trim()
      .toLowerCase();

    const allowedCategories = [
      "car",
      "bike",
      "load_vehicle",
    ];

    if (!allowedCategories.includes(cleanCategory)) {
      return res.status(400).json({
        success: false,
        message: "Invalid spare category",
      });
    }

    // ========================================================
    // DESCRIPTION
    // ========================================================

    const cleanDescription = String(
      description || ""
    ).trim();

    if (cleanDescription.length > 200) {
      return res.status(400).json({
        success: false,
        message:
          "Description maximum 200 characters",
      });
    }

    // ========================================================
    // IMAGE REQUIRED
    // ========================================================

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Old spare image is required",
      });
    }

    // ========================================================
    // UPLOAD IMAGE TO R2
    // ========================================================

    let imageUrl;

    try {
      imageUrl = await uploadOldSpareImage(
        req.file,
        "oldspare/images"
      );
    } catch (uploadError) {
      console.error(
        "OLD SPARE IMAGE UPLOAD ERROR 👉",
        uploadError
      );

      return res.status(500).json({
        success: false,
        message:
          "Old spare image upload failed",
      });
    }

    // ========================================================
    // CREATE DATABASE DOCUMENT
    // ========================================================

    const oldSpare = new OldSpare({
      user: userId,

      userId: userId.toString(),

      name: cleanName,

      phone: cleanPhone,

      spareName: cleanSpareName,

      category: cleanCategory,

      description: cleanDescription,

      // ======================================================
      // IMPORTANT
      // R2 PUBLIC URL SAVED HERE
      // ======================================================

      oldSpareImage: imageUrl,

      status: "pending",

      adminNote: "",

      isDeleted: false,

      deletedAt: null,
    });

    try {
      await oldSpare.save();
    } catch (dbError) {
      // ======================================================
      // DATABASE SAVE FAILED
      // DELETE JUST-UPLOADED R2 IMAGE
      // ======================================================

      if (imageUrl) {
        await deleteOldSpareImage(
          imageUrl
        );
      }

      throw dbError;
    }

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(201).json({
      success: true,
      message:
        "Old spare want submitted successfully",
      data: oldSpare,
    });
  } catch (error) {
    console.error(
      "ADD OLD SPARE ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to submit old spare want",
    });
  }
};

// ============================================================
// GET MY OLD SPARES
// ============================================================

export const getMyOldSpares = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const spares = await OldSpare.find({
      user: userId,
      isDeleted: {
        $ne: true,
      },
    }).sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      count: spares.length,
      spares,
    });
  } catch (error) {
    console.error(
      "GET MY OLD SPARES ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch old spare wants",
    });
  }
};

// ============================================================
// GET SINGLE USER OLD SPARE
// ============================================================

export const getMyOldSpareById = async (
  req,
  res
) => {
  try {
    const spare =
      await OldSpare.findOne({
        _id: req.params.id,
        user: getUserId(req),
        isDeleted: {
          $ne: true,
        },
      });

    if (!spare) {
      return res.status(404).json({
        success: false,
        message:
          "Old spare want not found",
      });
    }

    return res.json({
      success: true,
      data: spare,
    });
  } catch (error) {
    console.error(
      "GET OLD SPARE ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch old spare want",
    });
  }
};

// ============================================================
// UPDATE USER OLD SPARE
// ============================================================

export const updateMyOldSpare = async (
  req,
  res
) => {
  try {
    const spare =
      await OldSpare.findOne({
        _id: req.params.id,
        user: getUserId(req),
        isDeleted: {
          $ne: true,
        },
      });

    if (!spare) {
      return res.status(404).json({
        success: false,
        message:
          "Old spare want not found",
      });
    }

    // ========================================================
    // SPARE NAME
    // ========================================================

    if (
      req.body.spareName !== undefined
    ) {
      const value = String(
        req.body.spareName
      ).trim();

      if (!value) {
        return res.status(400).json({
          success: false,
          message:
            "Spare name is required",
        });
      }

      if (value.length > 30) {
        return res.status(400).json({
          success: false,
          message:
            "Spare name maximum 30 characters",
        });
      }

      spare.spareName = value;
    }

    // ========================================================
    // CATEGORY
    // ========================================================

    if (
      req.body.category !== undefined
    ) {
      const category = String(
        req.body.category
      )
        .trim()
        .toLowerCase();

      if (
        ![
          "car",
          "bike",
          "load_vehicle",
        ].includes(category)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid spare category",
        });
      }

      spare.category = category;
    }

    // ========================================================
    // DESCRIPTION
    // ========================================================

    if (
      req.body.description !== undefined
    ) {
      const description = String(
        req.body.description
      ).trim();

      if (description.length > 200) {
        return res.status(400).json({
          success: false,
          message:
            "Description maximum 200 characters",
        });
      }

      spare.description = description;
    }

    // ========================================================
    // IMAGE UPDATE
    // ========================================================

    if (req.file) {
      const oldImage =
        spare.oldSpareImage;

      // Upload NEW image first
      const newImage =
        await uploadOldSpareImage(
          req.file,
          "oldspare/images"
        );

      // Save new URL
      spare.oldSpareImage =
        newImage;

      // Save DB first
      await spare.save();

      // Delete old image only after DB success
      if (oldImage) {
        await deleteOldSpareImage(
          oldImage
        );
      }

      // Reset status after successful image update
      spare.status = "pending";
      spare.adminNote = "";

      await spare.save();
    } else {
      // ======================================================
      // NO IMAGE UPDATE
      // ======================================================

      spare.status = "pending";
      spare.adminNote = "";

      await spare.save();
    }

    return res.json({
      success: true,
      message:
        "Old spare want updated successfully",
      data: spare,
    });
  } catch (error) {
    console.error(
      "UPDATE OLD SPARE ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Old spare want update failed",
    });
  }
};

// ============================================================
// DELETE USER OLD SPARE - SOFT DELETE
// ============================================================

export const deleteMyOldSpare = async (
  req,
  res
) => {
  try {
    const spare =
      await OldSpare.findOne({
        _id: req.params.id,
        user: getUserId(req),
        isDeleted: {
          $ne: true,
        },
      });

    if (!spare) {
      return res.status(404).json({
        success: false,
        message:
          "Old spare want not found",
      });
    }

    spare.isDeleted = true;
    spare.deletedAt = new Date();

    await spare.save();

    return res.json({
      success: true,
      message:
        "Old spare want deleted successfully",
      data: spare,
    });
  } catch (error) {
    console.error(
      "DELETE OLD SPARE ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Old spare want delete failed",
    });
  }
};

// ============================================================
// RESTORE MY OLD SPARE
// ============================================================

export const restoreMyOldSpare = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    const spare =
      await OldSpare.findOne({
        _id: req.params.id,
        user: userId,
        isDeleted: true,
      });

    if (!spare) {
      return res.status(404).json({
        success: false,
        message:
          "Deleted old spare request not found",
      });
    }

    if (!spare.deletedAt) {
      return res.status(400).json({
        success: false,
        message:
          "Restore period expired",
      });
    }

    const elapsed =
      Date.now() -
      new Date(spare.deletedAt).getTime();

    const twentyFourHours =
      24 * 60 * 60 * 1000;

    if (elapsed > twentyFourHours) {
      return res.status(400).json({
        success: false,
        message:
          "Restore period expired",
      });
    }

    spare.isDeleted = false;
    spare.deletedAt = null;

    await spare.save();

    return res.json({
      success: true,
      message:
        "Old spare request restored successfully",
      data: spare,
    });
  } catch (error) {
    console.error(
      "RESTORE OLD SPARE ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to restore old spare request",
    });
  }
};

// ============================================================
// ADMIN GET ALL
// ============================================================

export const getOldSpares = async (
  req,
  res
) => {
  try {
    const filter = {
      isDeleted: {
        $ne: true,
      },
    };

    if (req.query.category) {
      filter.category = String(
        req.query.category
      )
        .trim()
        .toLowerCase();
    }

    if (req.query.status) {
      filter.status =
        req.query.status;
    }

    const spares =
      await OldSpare.find(filter)
        .populate(
          "user",
          "name email phone"
        )
        .sort({
          createdAt: -1,
        });

    return res.json({
      success: true,
      count: spares.length,
      spares,
    });
  } catch (error) {
    console.error(
      "GET OLD SPARES ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch old spares",
    });
  }
};

// ============================================================
// ADMIN GET SINGLE
// ============================================================

export const getOldSpareById = async (
  req,
  res
) => {
  try {
    const spare =
      await OldSpare.findById(
        req.params.id
      ).populate(
        "user",
        "name email phone"
      );

    if (!spare) {
      return res.status(404).json({
        success: false,
        message:
          "Old spare want not found",
      });
    }

    return res.json({
      success: true,
      data: spare,
    });
  } catch (error) {
    console.error(
      "GET OLD SPARE BY ID ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch old spare want",
    });
  }
};

// ============================================================
// ADMIN UPDATE STATUS
// ============================================================

export const updateOldSpareStatus = async (
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

    const spare =
      await OldSpare.findOne({
        _id: req.params.id,
        isDeleted: {
          $ne: true,
        },
      });

    if (!spare) {
      return res.status(404).json({
        success: false,
        message:
          "Old spare want not found",
      });
    }

    spare.status = status;

    spare.adminNote = adminNote
      ? String(adminNote).trim()
      : "";

    await spare.save();

    return res.json({
      success: true,
      message:
        "Old spare status updated successfully",
      data: spare,
    });
  } catch (error) {
    console.error(
      "UPDATE OLD SPARE STATUS ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Old spare status update failed",
    });
  }
};

// ============================================================
// ADMIN PERMANENT DELETE
// ============================================================

export const deleteOldSpare = async (
  req,
  res
) => {
  try {
    const spare =
      await OldSpare.findById(
        req.params.id
      );

    if (!spare) {
      return res.status(404).json({
        success: false,
        message:
          "Old spare want not found",
      });
    }

    // Delete R2 image
    if (spare.oldSpareImage) {
      await deleteOldSpareImage(
        spare.oldSpareImage
      );
    }

    // Delete MongoDB document
    await OldSpare.findByIdAndDelete(
      spare._id
    );

    return res.json({
      success: true,
      message:
        "Old spare want permanently deleted",
    });
  } catch (error) {
    console.error(
      "DELETE OLD SPARE ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Old spare permanent delete failed",
    });
  }
};