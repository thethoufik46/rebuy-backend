import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import { createAdminUser } from "./config/createAdmin.js";
import productRoutes from "./routes/product.routes.js";
import authRoutes from "./routes/auth.routes.js";
import brandRoutes from "./routes/brand.routes.js";
import carRoutes from "./routes/car.routes.js"; 
import wishlistRoutes from "./routes/wishlist.routes.js"; // ✅ New wishlist route

dotenv.config();
const app = express();

/* -------------------------------------------------
   ✅ Middleware
---------------------------------------------------*/
app.use(cors());
app.use(express.json());

/* -------------------------------------------------
   ✅ Connect MongoDB and Create Default Admin
---------------------------------------------------*/
connectDB()
  .then(() => createAdminUser())
  .catch((err) => console.error("MongoDB Connection Error:", err));

/* -------------------------------------------------
   ✅ Routes
---------------------------------------------------*/
app.use("/api/auth", authRoutes);        // User authentication
app.use("/api/brands", brandRoutes);     // Brand management
app.use("/api/products", productRoutes); // Product management
app.use("/api/cars", carRoutes);         // Cars route (15 fields)
app.use("/api/wishlist", wishlistRoutes); // ✅ Wishlist route

/* -------------------------------------------------
   ✅ Default Route (Optional)
---------------------------------------------------*/
app.get("/", (req, res) => {
  res.send("🚗 REBUY Backend API is running successfully!");
});

/* -------------------------------------------------
   ✅ Start Server
---------------------------------------------------*/
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 REBUY server running on port ${PORT}`)
);
