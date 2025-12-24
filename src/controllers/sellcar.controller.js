import SellCar from "../models/sellcar_model.js";

/* =========================
   🟢 CREATE SELL CAR
========================= */
export const addSellCar = async (req, res) => {
  try {
    const {
      name,
      email,
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
    } = req.body;

    // ✅ basic validation
    if (
      !name ||
      !email ||
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
      return res.status(400).json({
        message: "All required fields must be filled",
      });
    }

    const sellCar = await SellCar.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
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
    });

    res.status(201).json({
      success: true,
      message: "Sell car request submitted successfully",
      sellCar,
    });
  } catch (error) {
    console.error("Error adding sell car:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🔵 GET ALL SELL CARS
   (Admin)
========================= */
export const getSellCars = async (req, res) => {
  try {
    const sellCars = await SellCar.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sellCars.length,
      sellCars,
    });
  } catch (error) {
    console.error("Error fetching sell cars:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🔵 GET SINGLE SELL CAR
========================= */
export const getSellCarById = async (req, res) => {
  try {
    const { id } = req.params;

    const sellCar = await SellCar.findById(id);
    if (!sellCar) {
      return res.status(404).json({ message: "Sell car not found" });
    }

    res.status(200).json({
      success: true,
      sellCar,
    });
  } catch (error) {
    console.error("Error fetching sell car:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🟡 UPDATE STATUS
   (Admin approve / reject)
========================= */
export const updateSellCarStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        message: "Status is required",
      });
    }

    const sellCar = await SellCar.findById(id);
    if (!sellCar) {
      return res.status(404).json({ message: "Sell car not found" });
    }

    sellCar.status = status;
    await sellCar.save();

    res.status(200).json({
      success: true,
      message: "Sell car status updated successfully",
      sellCar,
    });
  } catch (error) {
    console.error("Error updating sell car status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🔴 DELETE SELL CAR
========================= */
export const deleteSellCar = async (req, res) => {
  try {
    const { id } = req.params;

    const sellCar = await SellCar.findById(id);
    if (!sellCar) {
      return res.status(404).json({ message: "Sell car not found" });
    }

    await sellCar.deleteOne();

    res.status(200).json({
      success: true,
      message: "Sell car deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting sell car:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
