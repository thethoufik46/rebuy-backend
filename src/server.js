// ======================= server.js =======================

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ================= DATABASE & ADMIN =================
import { connectDB } from "./config/db.js";
import { createAdminUser } from "./config/createAdmin.js";

// ================= ROUTES =================
import authRoutes from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";

import brandRoutes from "./routes/brand.routes.js";
import bikeBrandRoutes from "./routes/bike.brand.routes.js";

import productRoutes from "./routes/product.routes.js";

import carRoutes from "./routes/car.routes.js";
import bikeRoutes from "./routes/bike.routes.js";

import wishlistRoutes from "./routes/wishlist.routes.js";
import searchRoutes from "./routes/search.routes.js";

import orderRoutes from "./routes/car.order.routes.js";
import bikeOrderRoutes from "./routes/bike_order.routes.js";

import sellCarRoutes from "./routes/sellcar.routes.js";
import buyCarRoutes from "./routes/buycar.routes.js";
import sellPropertyRoutes from "./routes/sellproperty.routes.js";

// 🏠 REAL ESTATE
import propertyRoutes from "./routes/property.routes.js";

// 📍 LOCATION (Tamil Nadu dropdown)
import locationRoutes from "./routes/location.routes.js";
// 🔗 LINKS
import linkRoutes from "./routes/link.routes.js";

// 🔔 NOTIFICATIONS
import notificationRoutes from "./routes/notification.route.js";

// ⭐ TESTIMONIALS
import testimonialRoutes from "./routes/testimonial.route.js";

// ⭐ STORIES
import storyRoutes from "./routes/story.route.js";

// ================= ENV =================
dotenv.config();

const app = express();

/* =========================
   FIX __dirname (ES MODULE)
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
   STATIC FILES (PUBLIC)
========================= */
app.use(express.static(path.join(__dirname, "../public")));

// 🔐 Privacy Policy
app.get("/privacy-policy", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/privacy-policy.html"));
});

// 📄 Terms & Conditions
app.get("/terms", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/terms-and-conditions.html"));
});

// 💸 Refund & Cancellation
app.get("/refund-policy", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/refund-cancellation-policy.html")
  );
});

/* =========================
   DATABASE CONNECTION
========================= */
connectDB()
  .then(() => {
    console.log("✅ MongoDB Connected");
    createAdminUser();
  })
  .catch((err) => {
    console.error("❌ MongoDB Error:", err);
    process.exit(1);
  });

/* =========================
   API ROUTES
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

app.use("/api/brands", brandRoutes);
app.use("/api/bike-brands", bikeBrandRoutes);

app.use("/api/products", productRoutes);

app.use("/api/cars", carRoutes);
app.use("/api/bikes", bikeRoutes);

app.use("/api/search", searchRoutes);
app.use("/api/wishlist", wishlistRoutes);

app.use("/api/orders", orderRoutes);
app.use("/api/bike-orders", bikeOrderRoutes);

app.use("/api/sellcar", sellCarRoutes);
app.use("/api/buycar", buyCarRoutes);

app.use("/sellproperty", sellPropertyRoutes);

// 🏠 REAL ESTATE
app.use("/api/properties", propertyRoutes);

// 📍 LOCATION DROPDOWN
app.use("/api/locations", locationRoutes);
app.use("/api/links", linkRoutes);


app.use("/api/notifications", notificationRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/stories", storyRoutes);

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 RE2BUY Backend API running successfully",
  });
});

/* =========================
   404 HANDLER (ALWAYS LAST)
========================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

/* =========================
   GLOBAL ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
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
  console.log(`✅ Server running on port ${PORT}`);
});
