router.post("/", verifyToken, async (req, res) => {
  try {
    const { carId } = req.body;

    // 🔒 EXTRA SAFETY (OPTIONAL BUT NICE)
    const exists = await Order.findOne({
      user: req.userId,
      car: carId,
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "You already ordered this car",
      });
    }

    const order = await Order.create({
      user: req.userId,
      car: carId,
      status: "booking",
      isUserVisible: true,
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    // 🔥 HANDLE DUPLICATE KEY ERROR
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You already ordered this car",
      });
    }

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
