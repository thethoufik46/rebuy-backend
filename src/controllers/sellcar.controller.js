import SellCar from "../models/sellcar_model.js";

/* =========================
   🟢 CREATE SELL CAR
   (LOGIN USER)
========================= */
export const addSellCar = async (req, res) => {
  try {
    const {
      name,
      phone,
      location,
      brand,
      model,
      variant,
      year,
      fuelType,
      transmission,
      kmsDriven,
      seater,
      insuranceIdv,
      price,
      carImages,
    } = req.body;

    if (
      !name ||
      !phone ||
      !location ||
      !brand ||
      !model ||
      !variant ||
      !year ||
      !fuelType ||
      !transmission ||
      !kmsDriven ||
      !seater ||
      !price
    ) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled" });
    }

    const sellCar = await SellCar.create({
      user: req.user.id, // ✅ LOGIN USER ID
      name: name.trim(),
      phone: phone.trim(),
      location: location.trim(),
      brand: brand.trim(),
      model: model.trim(),
      variant: variant.trim(),
      year,
      fuelType,
      transmission,
      kmsDriven,
      seater,
      insuranceIdv,
      price,
      carImages,
    });

    res.status(201).json({
      success: true,
      sellCar,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🔵 GET ALL SELL CARS
========================= */
export const getSellCars = async (req, res) => {
  try {
    const sellCars = await SellCar.find()
      .populate("user", "name phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sellCars.length,
      sellCars,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🔵 GET SINGLE SELL CAR
========================= */
export const getSellCarById = async (req, res) => {
  try {
    const sellCar = await SellCar.findById(req.params.id).populate(
      "user",
      "name phone"
    );

    if (!sellCar) {
      return res.status(404).json({ message: "Sell car not found" });
    }

    res.status(200).json({
      success: true,
      sellCar,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🟡 UPDATE STATUS
========================= */
export const updateSellCarStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const sellCar = await SellCar.findById(req.params.id);
    if (!sellCar) {
      return res.status(404).json({ message: "Sell car not found" });
    }

    sellCar.status = status;
    await sellCar.save();

    res.status(200).json({
      success: true,
      message: "Status updated successfully",
      sellCar,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🔴 DELETE SELL CAR
========================= */
export const deleteSellCar = async (req, res) => {
  try {
    const sellCar = await SellCar.findById(req.params.id);

    if (!sellCar) {
      return res.status(404).json({ message: "Sell car not found" });
    }

    await sellCar.deleteOne();

    res.status(200).json({
      success: true,
      message: "Sell car deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
