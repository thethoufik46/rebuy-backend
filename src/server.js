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
import userRoutes from "./routes/user.routes.js";
import reportRoutes from "./routes/report.routes.js";

import chatRoutes from "./routes/chat.routes.js";

import brandRoutes from "./routes/car_brand.routes.js";
import bikeBrandRoutes from "./routes/bike.brand.routes.js";

import carRoutes from "./routes/car.routes.js";
import bikeRoutes from "./routes/bike.routes.js";

import wishlistRoutes from "./routes/wishlist.routes.js";
import searchRoutes from "./routes/search.routes.js";

import orderRoutes from "./routes/car.order.routes.js";
import bikeOrderRoutes from "./routes/bike_order.routes.js";

import sellCarRoutes from "./routes/sellcar.routes.js";
import buyCarRoutes from "./routes/buycar.routes.js";

import sellPropertyRoutes from "./routes/sellproperty.routes.js";
import buyPropertyRoutes from "./routes/buyproperty.routes.js";

// 🏠 REAL ESTATE
import propertyRoutes from "./routes/property.routes.js";

// 📍 LOCATION
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
   GLOBAL MIDDLEWARE (FIXED FOR WEB)
========================= */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ REQUIRED FOR FLUTTER WEB PREFLIGHT
app.options("*", cors());

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   STATIC FILES
========================= */
app.use(express.static(path.join(__dirname, "../public")));

/* =========================
   LEGAL PAGES
========================= */
app.get("/privacy-policy", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/privacy-policy.html"));
});

app.get("/terms", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/terms-and-conditions.html"));
});

app.get("/refund-policy", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/refund-cancellation-policy.html")
  );
});

/* =========================
   DATABASE
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
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);

app.use("/api/chat", chatRoutes);

app.use("/api/brands", brandRoutes);
app.use("/api/bike-brands", bikeBrandRoutes);

app.use("/api/cars", carRoutes);
app.use("/api/bikes", bikeRoutes);

app.use("/api/search", searchRoutes);
app.use("/api/wishlist", wishlistRoutes);

app.use("/api/orders", orderRoutes);
app.use("/api/bike-orders", bikeOrderRoutes);

app.use("/api/sellcar", sellCarRoutes);
app.use("/api/buycar", buyCarRoutes);

app.use("/api/sellproperty", sellPropertyRoutes);
app.use("/api/buyproperty", buyPropertyRoutes);

app.use("/api/properties", propertyRoutes);
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
   404 HANDLER
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
