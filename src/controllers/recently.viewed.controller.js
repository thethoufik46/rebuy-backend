import RecentlyViewed from "../models/recently_viewed_model.js";

/* =====================================================
   ➕ ADD RECENT ITEM
===================================================== */
export const addRecentlyViewed = async (req, res) => {
  try {
    const userId = req.userId; // 🔥 secure
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: "itemId required",
      });
    }

    let data = await RecentlyViewed.findOne({ userId });

    if (!data) {
      data = new RecentlyViewed({
        userId,
        items: [],
      });
    }

    /// 🔥 REMOVE DUPLICATE
    data.items = data.items.filter((i) => i !== itemId);

    /// 🔥 ADD TO TOP
    data.items.unshift(itemId);

    /// 🔥 LIMIT 10
    data.items = data.items.slice(0, 10);

    await data.save();

    res.json({
      success: true,
      items: data.items,
    });
  } catch (err) {
    console.error("ADD RECENT ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   📥 GET RECENT ITEMS
===================================================== */
export const getRecentlyViewed = async (req, res) => {
  try {
    const userId = req.userId; // 🔥 secure

    const data = await RecentlyViewed.findOne({ userId });

    res.json({
      success: true,
      items: data?.items || [],
    });
  } catch (err) {
    console.error("GET RECENT ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};