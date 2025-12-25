// ======================= server.js =======================
import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// DB & Admin
import { connectDB } from "./config/db.js";
import { createAdminUser } from "./config/createAdmin.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import brandRoutes from "./routes/brand.routes.js";
import bikeBrandRoutes from "./routes/bike.brand.routes.js";
import productRoutes from "./routes/product.routes.js";
import carRoutes from "./routes/car.routes.js";
import bikeRoutes from "./routes/bike.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import searchRoutes from "./routes/search.routes.js";
import orderRoutes from "./routes/order.routes.js";              // 🚗 car orders
import bikeOrderRoutes from "./routes/bike_order.routes.js";    // 🏍️ bike orders ✅
import sellCarRoutes from "./routes/sellcar.routes.js";

dotenv.config();

const app = express();

/* =========================
   GLOBAL MIDDLEWARE
========================= */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   DATABASE
========================= */
connectDB()
  .then(() => {
    console.log("MongoDB Connected");
    createAdminUser();
  })
  .catch((err) => {
    console.error("MongoDB Error:", err);
    process.exit(1);
  });

/* =========================
   ROUTES
========================= */
app.use("/api/auth", authRoutes);

app.use("/api/brands", brandRoutes);             // 🚗 car brands
app.use("/api/bike-brands", bikeBrandRoutes);    // 🏍️ bike brands

app.use("/api/products", productRoutes);

app.use("/api/cars", carRoutes);                 // 🚗 cars
app.use("/api/bikes", bikeRoutes);               // 🏍️ bikes

app.use("/api/search", searchRoutes);
app.use("/api/wishlist", wishlistRoutes);

app.use("/api/orders", orderRoutes);             // 🚗 car orders
app.use("/api/bike-orders", bikeOrderRoutes);    // 🏍️ bike orders ✅

app.use("/api/sellcar", sellCarRoutes);

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "REBUY Backend API running",
  });
});

/* =========================
   404 HANDLER
========================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

/* =========================
   ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
