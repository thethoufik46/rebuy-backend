import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// 🔹 DB & Admin
import { connectDB } from "./config/db.js";
import { createAdminUser } from "./config/createAdmin.js";

// 🔹 Routes
import authRoutes from "./routes/auth.routes.js";
import brandRoutes from "./routes/brand.routes.js";
import productRoutes from "./routes/product.routes.js";
import carRoutes from "./routes/car.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import searchRoutes from "./routes/search.routes.js";

dotenv.config();

const app = express();

/* -------------------------------------------------
   ✅ GLOBAL MIDDLEWARE
---------------------------------------------------*/
app.use(
  cors({
    origin: "*", // ⚠️ restrict in production
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

/* -------------------------------------------------
   ✅ DATABASE CONNECTION
---------------------------------------------------*/
connectDB()
  .then(() => {
    console.log("✅ MongoDB Connected");
    createAdminUser(); // create admin if not exists
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

/* -------------------------------------------------
   ✅ API ROUTES
---------------------------------------------------*/
app.use("/api/auth", authRoutes);          // 🔐 Auth (login, register, profile)
app.use("/api/brands", brandRoutes);       // 🏷️ Brands
app.use("/api/products", productRoutes);   // 📦 Products
app.use("/api/cars", carRoutes);           // 🚗 Cars
app.use("/api/search", searchRoutes);      // 🔍 Search
app.use("/api/wishlist", wishlistRoutes);  // ❤️ Wishlist

/* -------------------------------------------------
   ✅ HEALTH CHECK
---------------------------------------------------*/
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚗 REBUY Backend API is running successfully!",
  });
});

/* -------------------------------------------------
   ❌ 404 HANDLER (KEEP LAST)
---------------------------------------------------*/
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "❌ API route not found",
  });
});

/* -------------------------------------------------
   ❌ GLOBAL ERROR HANDLER
---------------------------------------------------*/
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

/* -------------------------------------------------
   🚀 START SERVER
---------------------------------------------------*/
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 REBUY server running on port ${PORT}`);
});
