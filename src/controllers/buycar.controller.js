// ======================= buycar.controller.js =======================

import BuyCar from "../models/buycar_model.js";

import {
  uploadBuyCarAudio,
  deleteBuyCarAudio,
} from "../utils/buycar_audio.js";

/* =====================================================
   CONSTANT
===================================================== */

const RECOVERY_HOURS = 24;
const RECOVERY_MS = RECOVERY_HOURS * 60 * 60 * 1000;

/* =====================================================
   HELPERS
===================================================== */

const parseObject = (value) => {
  if (!value) return null;

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

/* =====================================================
   PERMANENTLY REMOVE EXPIRED REQUESTS
===================================================== */

const cleanupExpiredDeletedRequests = async () => {
  try {
    const expiryTime = new Date(Date.now() - RECOVERY_MS);

    const expired = await BuyCar.find({
      isDeleted: true,
      deletedAt: {
        $lte: expiryTime,
      },
    });

    for (const item of expired) {
      try {
        if (item.audioNote) {
          await deleteBuyCarAudio(item.audioNote);
        }
      } catch (audioError) {
        console.error(
          "EXPIRED AUDIO DELETE ERROR 👉",
          audioError
        );
      }

      await BuyCar.deleteOne({
        _id: item._id,
      });
    }

    return expired.length;
  } catch (error) {
    console.error(
      "CLEANUP EXPIRED BUY REQUESTS ERROR 👉",
      error
    );

    return 0;
  }
};

/* =====================================================
   ADD BUY REQUEST
===================================================== */

export const addBuyCar = async (req, res) => {
  try {
    const {
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

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Type is required",
      });
    }

    if (!name || !phone || !location) {
      return res.status(400).json({
        success: false,
        message:
          "Name, phone and location are required",
      });
    }

    /* =========================
       PHONE
    ========================= */

    const cleanPhone = String(phone)
      .replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    /* =========================
       PARSE
    ========================= */

    const parsedCar = parseObject(car);
    const parsedBike = parseObject(bike);
    const parsedProperty = parseObject(property);
    const parsedElectronics =
      parseObject(electronics);

    /* =========================
       VALIDATION
    ========================= */

    if (
      type === "car" &&
      !parsedCar?.model
    ) {
      return res.status(400).json({
        success: false,
        message: "Car details required",
      });
    }

    if (
      type === "bike" &&
      !parsedBike?.model
    ) {
      return res.status(400).json({
        success: false,
        message: "Bike details required",
      });
    }

    if (
      type === "property" &&
      !parsedProperty?.category
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Property details required",
      });
    }

    if (
      type === "electronics" &&
      !parsedElectronics?.category
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Electronics details required",
      });
    }

    /* =========================
       AUDIO → R2
    ========================= */

    let audioNote = null;

    if (req.file) {
      audioNote = await uploadBuyCarAudio(
        req.file,
        "buycar/audio"
      );
    }

    /* =========================
       CREATE
    ========================= */

    const newRequest = new BuyCar({
      type,

      name: String(name).trim(),

      phone: cleanPhone,

      location: String(location).trim(),

      description:
        String(description || "").trim(),

      audioNote,

      user: req.user._id,

      userId: req.user._id.toString(),

      car:
        type === "car"
          ? parsedCar
          : undefined,

      bike:
        type === "bike"
          ? parsedBike
          : undefined,

      property:
        type === "property"
          ? parsedProperty
          : undefined,

      electronics:
        type === "electronics"
          ? parsedElectronics
          : undefined,

      status: "pending",

      isDeleted: false,

      deletedAt: null,
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

/* =====================================================
   GET MY ACTIVE REQUESTS
===================================================== */

export const getMyBuyCars = async (
  req,
  res
) => {
  try {
    await cleanupExpiredDeletedRequests();

    const cars = await BuyCar.find({
      user: req.user._id,
      isDeleted: false,
    }).sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      count: cars.length,
      cars,
    });
  } catch (error) {
    console.error(
      "GET MY BUY CARS ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   GET MY RECENTLY DELETED
===================================================== */

export const getMyDeletedBuyCars = async (
  req,
  res
) => {
  try {
    await cleanupExpiredDeletedRequests();

    const deleted = await BuyCar.find({
      user: req.user._id,
      isDeleted: true,
    }).sort({
      deletedAt: -1,
    });

    const now = Date.now();

    const data = deleted.map((item) => {
      const deletedTime = item.deletedAt
        ? new Date(item.deletedAt).getTime()
        : now;

      const remainingMs =
        Math.max(
          0,
          deletedTime +
            RECOVERY_MS -
            now
        );

      return {
        ...item.toObject(),

        recoveryAvailable:
          remainingMs > 0,

        remainingMs,

        remainingHours:
          Math.ceil(
            remainingMs /
              (60 * 60 * 1000)
          ),
      };
    });

    return res.json({
      success: true,
      count: data.length,
      cars: data,
    });
  } catch (error) {
    console.error(
      "GET DELETED BUY CARS ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   UPDATE MY REQUEST
===================================================== */

export const updateMyBuyCar = async (
  req,
  res
) => {
  try {
    const car = await BuyCar.findOne({
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

    /* =========================
       AUDIO UPDATE
    ========================= */

    if (req.file) {
      if (car.audioNote) {
        await deleteBuyCarAudio(
          car.audioNote
        );
      }

      car.audioNote =
        await uploadBuyCarAudio(
          req.file,
          "buycar/audio"
        );
    }

    /* =========================
       BASIC FIELDS
    ========================= */

    if (
      req.body.name !== undefined
    ) {
      car.name = String(
        req.body.name
      ).trim();
    }

    if (
      req.body.phone !== undefined
    ) {
      const cleanPhone =
        String(req.body.phone)
          .replace(/\D/g, "");

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

      car.phone = cleanPhone;
    }

    if (
      req.body.location !== undefined
    ) {
      car.location = String(
        req.body.location
      ).trim();
    }

    if (
      req.body.description !==
      undefined
    ) {
      car.description =
        String(
          req.body.description
        ).trim();
    }

    /* =========================
       NESTED
    ========================= */

    if (
      req.body.car !== undefined
    ) {
      car.car = parseObject(
        req.body.car
      );
    }

    if (
      req.body.bike !== undefined
    ) {
      car.bike = parseObject(
        req.body.bike
      );
    }

    if (
      req.body.property !==
      undefined
    ) {
      car.property =
        parseObject(
          req.body.property
        );
    }

    if (
      req.body.electronics !==
      undefined
    ) {
      car.electronics =
        parseObject(
          req.body.electronics
        );
    }

    await car.save();

    return res.json({
      success: true,
      car,
    });
  } catch (error) {
    console.error(
      "UPDATE MY BUY CAR ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   SOFT DELETE — USER
===================================================== */

export const deleteMyBuyCar = async (
  req,
  res
) => {
  try {
    const car = await BuyCar.findOne({
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

    car.isDeleted = true;
    car.deletedAt = new Date();

    await car.save();

    /*
      IMPORTANT:
      DO NOT delete audio here.
      It must remain available for recovery.
    */

    return res.json({
      success: true,
      message:
        "Request moved to Recently Deleted",
      recoveryHours: 24,
      deletedAt: car.deletedAt,
      car,
    });
  } catch (error) {
    console.error(
      "SOFT DELETE BUY CAR ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   RESTORE MY REQUEST
===================================================== */

export const restoreMyBuyCar = async (
  req,
  res
) => {
  try {
    const car = await BuyCar.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: true,
    });

    if (!car) {
      return res.status(404).json({
        success: false,
        message:
          "Recovery period expired or request was not found.",
      });
    }

    const deletedTime =
      car.deletedAt
        ? new Date(
            car.deletedAt
          ).getTime()
        : 0;

    const expiry =
      deletedTime + RECOVERY_MS;

    if (
      !deletedTime ||
      Date.now() > expiry
    ) {
      if (car.audioNote) {
        await deleteBuyCarAudio(
          car.audioNote
        );
      }

      await BuyCar.deleteOne({
        _id: car._id,
      });

      return res.status(410).json({
        success: false,
        message:
          "Recovery period expired or request was not found.",
      });
    }

    car.isDeleted = false;
    car.deletedAt = null;

    await car.save();

    return res.json({
      success: true,
      message:
        "Request recovered successfully",
      car,
    });
  } catch (error) {
    console.error(
      "RESTORE BUY CAR ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   ADMIN — GET ALL ACTIVE
===================================================== */

export const getBuyCars = async (
  req,
  res
) => {
  try {
    await cleanupExpiredDeletedRequests();

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

    const cars = await BuyCar.find(
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
      message: error.message,
    });
  }
};

/* =====================================================
   ADMIN — GET SINGLE
===================================================== */

export const getBuyCarById = async (
  req,
  res
) => {
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
      "GET BUY CAR ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   ADMIN — UPDATE STATUS
===================================================== */

export const updateBuyCarStatus = async (
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
          status,
          adminNote:
            adminNote || "",
        },
        {
          new: true,
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
  } catch (error) {
    console.error(
      "UPDATE BUY CAR STATUS ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   ADMIN — PERMANENT DELETE
===================================================== */

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

    if (car.audioNote) {
      await deleteBuyCarAudio(
        car.audioNote
      );
    }

    await BuyCar.deleteOne({
      _id: car._id,
    });

    return res.json({
      success: true,
      message:
        "Deleted permanently",
    });
  } catch (error) {
    console.error(
      "PERMANENT DELETE BUY CAR ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   ADMIN — GET DELETED
===================================================== */

export const getDeletedBuyCars = async (
  req,
  res
) => {
  try {
    await cleanupExpiredDeletedRequests();

    const cars = await BuyCar.find({
      isDeleted: true,
    })
      .populate(
        "user",
        "name email"
      )
      .sort({
        deletedAt: -1,
      });

    return res.json({
      success: true,
      count: cars.length,
      cars,
    });
  } catch (error) {
    console.error(
      "GET DELETED BUY CARS ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};