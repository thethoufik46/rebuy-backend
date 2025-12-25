router.post("/", verifyToken, async (req, res) => {
  try {
    const { bikeId } = req.body;

    /* 🔍 CHECK EXISTING ORDER */
    const existing = await BikeOrder.findOne({
      user: req.userId,
      bike: bikeId,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You have already ordered this bike",
        order: existing,
      });
    }

    const order = await BikeOrder.create({
      user: req.userId,
      bike: bikeId,
      status: "booking",
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    console.error(err);

    /* UNIQUE INDEX ERROR HANDLING */
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Bike already ordered by this user",
      });
    }

    res.status(500).json({
      success: false,
      message: "Create bike order failed",
    });
  }
});
