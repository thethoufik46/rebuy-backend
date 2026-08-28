// ============================================================
// server.js
// FINAL RE2BUY BACKEND SERVER
// ============================================================

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";

// ================= DATABASE & ADMIN =================

import { connectDB } from "./config/db.js";
import { createAdminUser } from "./config/createAdmin.js";

// ================= ROUTES =================

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import adminUserRoutes from "./routes/admin.user.routes.js";

import reportRoutes from "./routes/report.routes.js";
import chatRoutes from "./routes/chat.routes.js";

import brandRoutes from "./routes/car_brand.routes.js";
import bikeBrandRoutes from "./routes/bike_brand.routes.js";
import mobileBrandRoutes from "./routes/mobile_brand.routes.js";
import pcBrandRoutes from "./routes/pc_brand.routes.js";
import laptopBrandRoutes from "./routes/laptop_brand.routes.js";
import electronicsRoutes from "./routes/electronics.routes.js";

import variantRoutes from "./routes/car_variant.routes.js";
import bikeModelRoutes from "./routes/bike.model.routes.js";

import carRoutes from "./routes/car.routes.js";
import bikeRoutes from "./routes/bike.routes.js";

import wishlistRoutes from "./routes/wishlist.routes.js";
import searchRoutes from "./routes/search.routes.js";

// ============================================================
// COMMON ORDER ROUTE
// CAR + BIKE + PROPERTY + ELECTRONICS
// ============================================================

import orderRoutes from "./routes/order.routes.js";

import sellCarRoutes from "./routes/sellcar.routes.js";
import buyCarRoutes from "./routes/buycar.routes.js";

import sellPropertyRoutes from "./routes/sellproperty.routes.js";
import buyPropertyRoutes from "./routes/buyproperty.routes.js";

import propertyRoutes from "./routes/property.routes.js";
import locationRoutes from "./routes/location.routes.js";

import linkRoutes from "./routes/link.routes.js";
import notificationRoutes from "./routes/notification.route.js";
import testimonialRoutes from "./routes/testimonial.route.js";
import storyRoutes from "./routes/story.route.js";

import youtubeAuthRoutes from "./routes/youtubeAuth.routes.js";

import recentlyViewedRoutes from "./routes/recently.viewed.routes.js";

import leadRoutes from "./routes/lead.routes.js";

/*
============================================================
SURVEY ROUTES
============================================================
*/

import surveyRoutes from "./routes/survey.routes.js";

// ================= ENV =================

dotenv.config();

const app = express();

// ============================================================
// HTTP SERVER
// ============================================================

const server = http.createServer(app);

// ============================================================
// SOCKET.IO
// ============================================================

export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: [
      "GET",
      "POST",
    ],
  },
});

// ============================================================
// FIX __dirname
// ============================================================

const __filename = fileURLToPath(
  import.meta.url
);

const __dirname = path.dirname(
  __filename
);

// ============================================================
// CORS
// ============================================================

app.use(
  cors({
    origin: "*",

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

app.options(
  "*",
  cors()
);

// ============================================================
// BODY PARSER
// ============================================================

app.use(
  express.json({
    limit: "30mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

// ============================================================
// STATIC FILES
// ============================================================

app.use(
  express.static(
    path.join(
      __dirname,
      "../public"
    )
  )
);

// ============================================================
// LEGAL PAGES
// ============================================================

app.get(
  "/privacy-policy",
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "../public/privacy-policy.html"
      )
    );
  }
);

app.get(
  "/terms",
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "../public/terms-and-conditions.html"
      )
    );
  }
);

app.get(
  "/refund-policy",
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "../public/refund-cancellation-policy.html"
      )
    );
  }
);

// ============================================================
// YOUTUBE AUTH
// ============================================================

app.use(
  "/",
  youtubeAuthRoutes
);

// ============================================================
// DATABASE
// ============================================================

connectDB()
  .then(() => {
    console.log(
      "✅ MongoDB Connected"
    );

    createAdminUser();
  })
  .catch((err) => {
    console.error(
      "❌ MongoDB Error:",
      err
    );

    process.exit(1);
  });

// ============================================================
// API ROUTES
// ============================================================

// ------------------------------------------------------------
// AUTH
// ------------------------------------------------------------

app.use(
  "/api/auth",
  authRoutes
);

// ------------------------------------------------------------
// USERS
// ------------------------------------------------------------

app.use(
  "/api/users",
  userRoutes
);

// ------------------------------------------------------------
// ADMIN USERS
// ------------------------------------------------------------

app.use(
  "/api/admin",
  adminUserRoutes
);

// ------------------------------------------------------------
// REPORTS
// ------------------------------------------------------------

app.use(
  "/api/reports",
  reportRoutes
);

// ------------------------------------------------------------
// CHAT
// ------------------------------------------------------------

app.use(
  "/api/chat",
  chatRoutes
);

// ------------------------------------------------------------
// CAR BRANDS
// ------------------------------------------------------------

app.use(
  "/api/brands",
  brandRoutes
);

// ------------------------------------------------------------
// MOBILE BRANDS
// ------------------------------------------------------------

app.use(
  "/api/mobile-brands",
  mobileBrandRoutes
);

// ------------------------------------------------------------
// LAPTOP BRANDS
// ------------------------------------------------------------

app.use(
  "/api/laptop-brands",
  laptopBrandRoutes
);

// ------------------------------------------------------------
// PC BRANDS
// ------------------------------------------------------------

app.use(
  "/api/pc-brands",
  pcBrandRoutes
);

// ------------------------------------------------------------
// ELECTRONICS
// ------------------------------------------------------------

app.use(
  "/api/electronics",
  electronicsRoutes
);

// ------------------------------------------------------------
// CAR VARIANTS
// ------------------------------------------------------------

app.use(
  "/api/variants",
  variantRoutes
);

// ------------------------------------------------------------
// BIKE BRANDS
// ------------------------------------------------------------

app.use(
  "/api/bike-brands",
  bikeBrandRoutes
);

// ------------------------------------------------------------
// BIKE MODELS
// ------------------------------------------------------------

app.use(
  "/api/bike-models",
  bikeModelRoutes
);

// ------------------------------------------------------------
// CARS
// ------------------------------------------------------------

app.use(
  "/api/cars",
  carRoutes
);

// ------------------------------------------------------------
// BIKES
// ------------------------------------------------------------

app.use(
  "/api/bikes",
  bikeRoutes
);

// ------------------------------------------------------------
// SEARCH
// ------------------------------------------------------------

app.use(
  "/api/search",
  searchRoutes
);

// ------------------------------------------------------------
// WISHLIST
// ------------------------------------------------------------

app.use(
  "/api/wishlist",
  wishlistRoutes
);

// ============================================================
// COMMON ORDERS
// CAR + BIKE + PROPERTY + ELECTRONICS
// ============================================================

app.use(
  "/api/orders",
  orderRoutes
);

// ------------------------------------------------------------
// SELL CAR
// ------------------------------------------------------------

app.use(
  "/api/sellcar",
  sellCarRoutes
);

// ------------------------------------------------------------
// BUY CAR / NEED
// ------------------------------------------------------------

app.use(
  "/api/buycar",
  buyCarRoutes
);

// ------------------------------------------------------------
// SELL PROPERTY
// ------------------------------------------------------------

app.use(
  "/api/sellproperty",
  sellPropertyRoutes
);

// ------------------------------------------------------------
// BUY PROPERTY
// ------------------------------------------------------------

app.use(
  "/api/buyproperty",
  buyPropertyRoutes
);

// ------------------------------------------------------------
// PROPERTIES
// ------------------------------------------------------------

app.use(
  "/api/properties",
  propertyRoutes
);

// ------------------------------------------------------------
// LOCATIONS
// ------------------------------------------------------------

app.use(
  "/api/locations",
  locationRoutes
);

// ------------------------------------------------------------
// LINKS
// ------------------------------------------------------------

app.use(
  "/api/links",
  linkRoutes
);

// ------------------------------------------------------------
// NOTIFICATIONS
// ------------------------------------------------------------

app.use(
  "/api/notifications",
  notificationRoutes
);

// ------------------------------------------------------------
// TESTIMONIALS
// ------------------------------------------------------------

app.use(
  "/api/testimonials",
  testimonialRoutes
);

// ------------------------------------------------------------
// STORIES
// ------------------------------------------------------------

app.use(
  "/api/stories",
  storyRoutes
);

// ------------------------------------------------------------
// LEADS
// ------------------------------------------------------------

app.use(
  "/api/leads",
  leadRoutes
);

// ------------------------------------------------------------
// RECENTLY VIEWED
// ------------------------------------------------------------

app.use(
  "/api",
  recentlyViewedRoutes
);

// ============================================================
// PROPERTY SURVEY
// ============================================================
//
// Frontend:
//
// POST   /api/survey/add
// GET    /api/survey
// GET    /api/survey/:id
// PUT    /api/survey/:id/status
// DELETE /api/survey/:id
// PUT    /api/survey/:id/restore
//
// ============================================================

app.use(
  "/api/survey",
  surveyRoutes
);

// ============================================================
// APP VERSION
// ============================================================

app.get(
  "/api/app/version",
  (req, res) => {
    res.json({
      latest_version: "1.0.1",

      force_update: false,

      update_url:
        "https://play.google.com/store/apps/details?id=com.re2buy.app",
    });
  }
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
  "/",
  (req, res) => {
    res.status(200).json({
      success: true,

      message:
        "🚀 REBUY Backend API running successfully",
    });
  }
);

// ============================================================
// 404
// ============================================================

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,

      message:
        "API route not found",
    });
  }
);

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(
      "❌ Server Error:",
      err
    );

    res.status(500).json({
      success: false,

      message:
        err?.message ||
        "Internal server error",
    });
  }
);

// ============================================================
// SOCKET.IO
// ============================================================

io.on(
  "connection",
  (socket) => {
    console.log(
      "🟢 Socket Connected:",
      socket.id
    );

    // --------------------------------------------------------
    // USER ROOM
    // --------------------------------------------------------

    socket.on(
      "join",
      (userId) => {
        socket.join(
          userId
        );

        console.log(
          `User Joined: ${userId}`
        );
      }
    );

    // --------------------------------------------------------
    // ADMIN ROOM
    // --------------------------------------------------------

    socket.on(
      "join-admin",
      () => {
        socket.join(
          "admin"
        );

        console.log(
          "👨‍💼 Admin Joined"
        );
      }
    );

    // --------------------------------------------------------
    // DISCONNECT
    // --------------------------------------------------------

    socket.on(
      "disconnect",
      () => {
        console.log(
          "🔴 Socket Disconnected"
        );
      }
    );
  }
);

// ============================================================
// START SERVER
// ============================================================

const PORT =
  process.env.PORT ||
  5000;

server.listen(
  PORT,
  () => {
    console.log(
      `✅ Server running on port ${PORT}`
    );

    console.log(
      `📍 Orders API: /api/orders`
    );

    console.log(
      `📍 My Orders: GET /api/orders/my`
    );

    console.log(
      `📍 Create Order: POST /api/orders`
    );

    console.log(
      `📍 Survey API: /api/survey`
    );

    console.log(
      `📍 Add Survey: POST /api/survey/add`
    );
  }
);