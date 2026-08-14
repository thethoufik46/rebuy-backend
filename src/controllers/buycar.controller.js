// ======================= buycar.controller.js =======================

import BuyCar from "../models/buycar_model.js";

/* ============================================================
   USER → ADD
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
        message: "Type is required",
      });
    }

    if (type === "car" && !car?.model) {
      return res.status(400).json({
        message: "Car details required",
      });
    }

    if (type === "bike" && !bike?.model) {
      return res.status(400).json({
        message: "Bike details required",
      });
    }

    if (type === "property" && !property?.category) {
      return res.status(400).json({
        message: "Property details required",
      });
    }

    if (type === "electronics" && !electronics?.category) {
      return res.status(400).json({
        message: "Electronics details required",
      });
    }

    const newRequest = new BuyCar({
      type,
      name,
      phone,
      location,
      description,
      audioNote: audioNote || null,

      user: req.user._id,
      userId: req.user._id.toString(),

      car,
      bike,
      property,
      electronics,

      isDeleted: false,
      deletedAt: null,
    });

    await newRequest.save();

    return res.status(201).json({
      success: true,
      message: "Request submitted successfully",
      data: newRequest,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

/* ============================================================
   USER → GET MY NEEDS
   active + recently deleted (<24 hours)
============================================================ */

export const getMyBuyCars = async (req, res) => {
  try {
    const recoveryLimit = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    );

    const [active, deleted] = await Promise.all([
      BuyCar.find({
        user: req.user._id,
        isDeleted: false,
      }).sort({
        createdAt: -1,
      }),

      BuyCar.find({
        user: req.user._id,
        isDeleted: true,
        deletedAt: {
          $gt: recoveryLimit,
        },
      }).sort({
        deletedAt: -1,
      }),
    ]);

    return res.json({
      success: true,

      // New frontend shape
      active,
      deleted,

      // Backward compatibility
      cars: active,

      count: active.length,
      deletedCount: deleted.length,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

/* ============================================================
   USER → UPDATE
============================================================ */

export const updateMyBuyCar = async (req, res) => {
  try {
    const car = await BuyCar.findOneAndUpdate(
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
        message: "Not found",
      });
    }

    return res.json({
      success: true,
      car,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

/* ============================================================
   USER → MOVE TO RECENTLY DELETED
============================================================ */

export const deleteMyBuyCar = async (req, res) => {
  try {
    const car = await BuyCar.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      },
      {
        new: true,
      }
    );

    if (!car) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    return res.json({
      success: true,
      message:
        "Request moved to Recently Deleted. You can recover it within 24 hours.",
      data: car,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

/* ============================================================
   USER → RECOVER WITHIN 24 HOURS
============================================================ */

export const restoreMyBuyCar = async (req, res) => {
  try {
    const recoveryLimit = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    );

    const car = await BuyCar.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
        isDeleted: true,
        deletedAt: {
          $gt: recoveryLimit,
        },
      },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
        },
      },
      {
        new: true,
      }
    );

    if (!car) {
      return res.status(404).json({
        message:
          "Recovery period expired or request was not found.",
      });
    }

    return res.json({
      success: true,
      message: "Request recovered successfully",
      data: car,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

/* ============================================================
   ADMIN → GET ALL ACTIVE REQUESTS
============================================================ */

export const getBuyCars = async (req, res) => {
  try {
    const { type, status } = req.query;

    const filter = {
      isDeleted: false,
    };

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    const cars = await BuyCar.find(filter)
      .populate("user", "name email")
      .sort({
        createdAt: -1,
      });

    return res.json({
      success: true,
      count: cars.length,
      cars,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

/* ============================================================
   ADMIN → GET SINGLE ACTIVE REQUEST
============================================================ */

export const getBuyCarById = async (req, res) => {
  try {
    const car = await BuyCar.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate("user", "name email");

    if (!car) {
      return res.status(404).json({
        message: "Not found",
      });
    }

    return res.json({
      success: true,
      car,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

/* ============================================================
   ADMIN → UPDATE STATUS
============================================================ */

export const updateBuyCarStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    const car = await BuyCar.findOneAndUpdate(
      {
        _id: req.params.id,
        isDeleted: false,
      },
      {
        status,
        adminNote,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!car) {
      return res.status(404).json({
        message: "Not found",
      });
    }

    return res.json({
      success: true,
      car,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

/* ============================================================
   ADMIN → PERMANENT DELETE
============================================================ */

export const deleteBuyCar = async (req, res) => {
  try {
    const car = await BuyCar.findOneAndDelete({
      _id: req.params.id,
    });

    if (!car) {
      return res.status(404).json({
        message: "Not found",
      });
    }

    return res.json({
      success: true,
      message: "Deleted permanently",
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};
