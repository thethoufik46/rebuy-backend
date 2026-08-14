import BuyCar from "../models/buycar_model.js";

import {
  uploadBuyCarAudio,
  deleteBuyCarAudio,
} from "../utils/buycar_audio.js";

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

    /* =====================================================
       BASIC VALIDATION
    ===================================================== */

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Type is required",
      });
    }

    if (
      !name ||
      !phone ||
      !location
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, phone and location are required",
      });
    }

    /* =====================================================
       PHONE VALIDATION
    ===================================================== */

    const cleanPhone = String(phone)
      .replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    /* =====================================================
       PARSE NESTED JSON
       Multipart fields arrive as strings.
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

    const parsedCar = parseObject(car);
    const parsedBike = parseObject(bike);
    const parsedProperty =
      parseObject(property);
    const parsedElectronics =
      parseObject(electronics);

    /* =====================================================
       TYPE VALIDATION
    ===================================================== */

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

    /* =====================================================
       AUDIO → R2
    ===================================================== */

    let audioNote = null;

    if (req.file) {
      audioNote = await uploadBuyCarAudio(
        req.file,
        "buycar/audio"
      );
    }

    /* =====================================================
       CREATE
    ===================================================== */

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
    });

    await newRequest.save();

    /* =====================================================
       RESPONSE
    ===================================================== */

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
   GET MY REQUESTS
===================================================== */

export const getMyBuyCars = async (
  req,
  res
) => {
  try {
    const cars = await BuyCar.find({
      user: req.user._id,
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
    });

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    /* =====================================================
       AUDIO UPDATE
    ===================================================== */

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

    /* =====================================================
       BASIC FIELDS
    ===================================================== */

    if (req.body.name !== undefined) {
      car.name = String(
        req.body.name
      ).trim();
    }

    if (req.body.phone !== undefined) {
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
      req.body.description !== undefined
    ) {
      car.description =
        String(
          req.body.description
        ).trim();
    }

    /* =====================================================
       NESTED DATA
    ===================================================== */

    const parseObject = (value) => {
      if (!value) return undefined;

      if (typeof value === "object") {
        return value;
      }

      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    };

    if (req.body.car !== undefined) {
      car.car = parseObject(
        req.body.car
      );
    }

    if (req.body.bike !== undefined) {
      car.bike = parseObject(
        req.body.bike
      );
    }

    if (
      req.body.property !== undefined
    ) {
      car.property = parseObject(
        req.body.property
      );
    }

    if (
      req.body.electronics !== undefined
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
   DELETE MY REQUEST
===================================================== */

export const deleteMyBuyCar = async (
  req,
  res
) => {
  try {
    const car =
      await BuyCar.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id,
      });

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (car.audioNote) {
      await deleteBuyCarAudio(
        car.audioNote
      );
    }

    return res.json({
      success: true,
      message: "Request deleted",
    });
  } catch (error) {
    console.error(
      "DELETE MY BUY CAR ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   ADMIN — GET ALL
===================================================== */

export const getBuyCars = async (
  req,
  res
) => {
  try {
    const {
      type,
      status,
    } = req.query;

    const filter = {};

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    const cars = await BuyCar.find(filter)
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
        message: "Invalid status",
      });
    }

    const car =
      await BuyCar.findByIdAndUpdate(
        req.params.id,
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
        message: "Request not found",
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
   ADMIN — DELETE
===================================================== */

export const deleteBuyCar = async (
  req,
  res
) => {
  try {
    const car =
      await BuyCar.findByIdAndDelete(
        req.params.id
      );

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (car.audioNote) {
      await deleteBuyCarAudio(
        car.audioNote
      );
    }

    return res.json({
      success: true,
      message:
        "Deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE BUY CAR ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};