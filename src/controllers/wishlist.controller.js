import Wishlist from "../models/wishlist_model.js";

/* -------------------------------------------------
   ✅ Add or Remove car from wishlist (No Token)
---------------------------------------------------*/
export const toggleWishlist = async (req, res) => {
  try {
    const { userId, carId } = req.body;

    if (!userId || !carId) {
      return res.status(400).json({ message: "userId and carId are required" });
    }

    const existing = await Wishlist.findOne({ user: userId, car: carId });

    if (existing) {
      // ❌ If already exists → remove
      await Wishlist.findByIdAndDelete(existing._id);
      return res.status(200).json({ message: "Car removed from wishlist" });
    }

    // ✅ Else → add new entry
    const newItem = await Wishlist.create({ user: userId, car: carId });
    res
      .status(200)
      .json({ message: "Car added to wishlist", wishlist: newItem });
  } catch (error) {
    console.error("Wishlist toggle error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

/* -------------------------------------------------
   ✅ Get all wishlist items by userId (No Token)
---------------------------------------------------*/
export const getWishlist = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: "User ID required" });

    const items = await Wishlist.find({ user: userId }).populate("car");

    res.status(200).json({ wishlist: items });
  } catch (error) {
    console.error("Get wishlist error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
