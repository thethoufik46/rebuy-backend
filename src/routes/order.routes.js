import express from "express";
import mongoose from "mongoose";

import Order from "../models/order_model.js";

import Car from "../models/car_model.js";
import Bike from "../models/bike_model.js";
import Property from "../models/property_model.js";
import Electronics from "../models/electronics_model.js";

import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// ================================================================
// COMMON ITEM MODELS
// ================================================================

const ITEM_MODELS = {
  car: Car,
  bike: Bike,
  property: Property,
  electronics: Electronics,
};

const ALLOWED_ITEM_TYPES = [
  "car",
  "bike",
  "property",
  "electronics",
];

const ALLOWED_STATUS = [
  "booking",
  "verification",
  "advance",
  "delivery",
  "cancel_requested",
  "cancelled",
];

// ================================================================
// HELPER
// ================================================================

function getItemModel(itemType) {
  return ITEM_MODELS[itemType];
}

function validId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ================================================================
// CREATE ORDER
// USER
// POST /api/orders
//
// BODY:
// {
//   "itemId": "...",
//   "itemType": "car"
// }
//
// itemType:
// car
// bike
// property
// electronics
// ================================================================

router.post("/", verifyToken, async (req, res) => {
  try {
    const { itemId, itemType } = req.body;

    // ------------------------------------------------------------
    // VALIDATE ITEM TYPE
    // ------------------------------------------------------------

    if (!itemType || !ALLOWED_ITEM_TYPES.includes(itemType)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid itemType. Use car, bike, property or electronics",
      });
    }

    // ------------------------------------------------------------
    // VALIDATE ITEM ID
    // ------------------------------------------------------------

    if (!itemId || !validId(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Valid itemId is required",
      });
    }

    // ------------------------------------------------------------
    // GET MODEL
    // ------------------------------------------------------------

    const ItemModel = getItemModel(itemType);

    if (!ItemModel) {
      return res.status(400).json({
        success: false,
        message: "Invalid item type",
      });
    }

    // ------------------------------------------------------------
    // CHECK ITEM EXISTS
    // ------------------------------------------------------------

    const item = await ItemModel.findById(itemId).lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `${itemType} not found`,
      });
    }

    // ------------------------------------------------------------
    // CHECK ITEM STATUS
    // ------------------------------------------------------------

    if (
      item.status === "draft" ||
      item.status === "delete_requested"
    ) {
      return res.status(400).json({
        success: false,
        message: "This item is not available for ordering",
      });
    }

    // ------------------------------------------------------------
    // ONE USER → ONE ITEM → ONE ACTIVE ORDER
    //
    // Cancelled order can be ordered again.
    // ------------------------------------------------------------

    const existingOrder = await Order.findOne({
      user: req.userId,
      item: itemId,
      itemType,
      status: {
        $ne: "cancelled",
      },
    });

    if (existingOrder) {
      return res.status(400).json({
        success: false,
        message: `You already ordered this ${itemType}`,
        order: existingOrder,
      });
    }

    // ------------------------------------------------------------
    // CREATE ORDER
    // DEFAULT STATUS = BOOKING
    // ------------------------------------------------------------

    const order = await Order.create({
      user: req.userId,
      item: itemId,
      itemType,
      status: "booking",
      isUserVisible: true,
    });

    // ------------------------------------------------------------
    // RESPONSE
    // ------------------------------------------------------------

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);

    // Duplicate key protection
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You already ordered this item",
      });
    }

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ================================================================
// USER - MY ORDERS
// GET /api/orders/my
//
// OLD OPTION:
// GET LOGGED-IN USER ORDERS
//
// Now works for:
// Car + Bike + Property + Electronics
// ================================================================

router.get("/my", verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.userId,
      isUserVisible: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    // ------------------------------------------------------------
    // GET ACTUAL ITEM DATA
    // ------------------------------------------------------------

    const finalOrders = await Promise.all(
      orders.map(async (order) => {
        try {
          const ItemModel = getItemModel(order.itemType);

          if (!ItemModel) {
            return {
              ...order,
              item: null,
            };
          }

          let itemQuery = ItemModel.findById(order.item);

          // ------------------------------------------------------
          // CAR
          // ------------------------------------------------------

          if (order.itemType === "car") {
            itemQuery = itemQuery
              .populate("brand", "name logoUrl")
              .populate("variant", "title imageUrl");
          }

          // ------------------------------------------------------
          // BIKE
          // ------------------------------------------------------

          if (order.itemType === "bike") {
            itemQuery = itemQuery
              .populate("brand", "name logoUrl")
              .populate("model", "title");
          }

          // ------------------------------------------------------
          // ELECTRONICS
          // ------------------------------------------------------

          if (order.itemType === "electronics") {
            itemQuery = itemQuery.populate(
              "brand",
              "name logoUrl"
            );
          }

          // ------------------------------------------------------
          // PROPERTY
          // ------------------------------------------------------
          // Property data does not require relation population here.

          const item = await itemQuery.lean();

          return {
            ...order,
            item: item || null,
          };
        } catch (err) {
          console.error(
            `MY ORDER ITEM ERROR [${order._id}]:`,
            err.message
          );

          return {
            ...order,
            item: null,
          };
        }
      })
    );

    return res.json({
      success: true,
      count: finalOrders.length,
      orders: finalOrders,
    });
  } catch (err) {
    console.error("GET MY ORDERS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ================================================================
// ADMIN - GET ALL ORDERS
// GET /api/orders
//
// Works for all 4 categories.
// ================================================================

router.get("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name phone email")
      .sort({ createdAt: -1 })
      .lean();

    // ------------------------------------------------------------
    // FETCH ITEM DATA
    // ------------------------------------------------------------

    const finalOrders = await Promise.all(
      orders.map(async (order) => {
        try {
          const ItemModel = getItemModel(order.itemType);

          if (!ItemModel) {
            return {
              ...order,
              item: null,
            };
          }

          let itemQuery = ItemModel.findById(order.item);

          // ------------------------------------------------------
          // CAR
          // ------------------------------------------------------

          if (order.itemType === "car") {
            itemQuery = itemQuery
              .populate("brand", "name logoUrl")
              .populate("variant", "title imageUrl");
          }

          // ------------------------------------------------------
          // BIKE
          // ------------------------------------------------------

          if (order.itemType === "bike") {
            itemQuery = itemQuery
              .populate("brand", "name logoUrl")
              .populate("model", "title");
          }

          // ------------------------------------------------------
          // ELECTRONICS
          // ------------------------------------------------------

          if (order.itemType === "electronics") {
            itemQuery = itemQuery.populate(
              "brand",
              "name logoUrl"
            );
          }

          const item = await itemQuery.lean();

          return {
            ...order,
            item: item || null,
          };
        } catch (err) {
          console.error(
            `ADMIN ORDER ITEM ERROR [${order._id}]:`,
            err.message
          );

          return {
            ...order,
            item: null,
          };
        }
      })
    );

    return res.json({
      success: true,
      count: finalOrders.length,
      orders: finalOrders,
    });
  } catch (err) {
    console.error("GET ALL ORDERS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ================================================================
// USER - CANCEL REQUEST
// PUT /api/orders/:id/cancel
//
// OLD OPTION:
// USER – CANCEL REQUEST
// ================================================================

router.put("/:id/cancel", verifyToken, async (req, res) => {
  try {
    // ------------------------------------------------------------
    // VALIDATE ORDER ID
    // ------------------------------------------------------------

    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    // ------------------------------------------------------------
    // USER OWN ORDER ONLY
    // ------------------------------------------------------------

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.userId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // ------------------------------------------------------------
    // ALREADY CANCELLED
    // ------------------------------------------------------------

    if (order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled",
      });
    }

    // ------------------------------------------------------------
    // ALREADY REQUESTED
    // ------------------------------------------------------------

    if (order.status === "cancel_requested") {
      return res.status(400).json({
        success: false,
        message: "Cancel request already sent",
      });
    }

    // ------------------------------------------------------------
    // DELIVERY CANNOT BE CANCELLED
    // ------------------------------------------------------------

    if (order.status === "delivery") {
      return res.status(400).json({
        success: false,
        message: "Delivered order cannot be cancelled",
      });
    }

    // ------------------------------------------------------------
    // CANCEL REQUEST
    // ------------------------------------------------------------

    order.status = "cancel_requested";

    await order.save();

    return res.json({
      success: true,
      message:
        "Cancel request sent. Waiting for admin approval",
      order,
    });
  } catch (err) {
    console.error("CANCEL ORDER ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ================================================================
// ADMIN - UPDATE ORDER STATUS
// PUT /api/orders/:id/status
//
// OLD OPTION:
// UPDATE ORDER STATUS
//
// ONLY ADMIN CAN CHANGE STATUS.
// ================================================================

router.put(
  "/:id/status",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { status } = req.body;

      // ----------------------------------------------------------
      // VALIDATE STATUS
      // ----------------------------------------------------------

      if (!ALLOWED_STATUS.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
          allowedStatus: ALLOWED_STATUS,
        });
      }

      // ----------------------------------------------------------
      // VALIDATE ORDER ID
      // ----------------------------------------------------------

      if (!validId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order id",
        });
      }

      // ----------------------------------------------------------
      // FIND ORDER
      // ----------------------------------------------------------

      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // ----------------------------------------------------------
      // UPDATE STATUS
      // ----------------------------------------------------------

      order.status = status;

      // ----------------------------------------------------------
      // ADMIN APPROVED CANCEL
      // USER SIDE HIDE
      // ----------------------------------------------------------

      if (status === "cancelled") {
        order.isUserVisible = false;
      } else {
        order.isUserVisible = true;
      }

      await order.save();

      return res.json({
        success: true,
        message: "Order status updated successfully",
        order,
      });
    } catch (err) {
      console.error("UPDATE ORDER STATUS ERROR:", err);

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

// ================================================================
// ADMIN - HARD DELETE
// DELETE /api/orders/:id
//
// ONLY CANCELLED ORDERS
// ================================================================

router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      // ----------------------------------------------------------
      // VALIDATE ID
      // ----------------------------------------------------------

      if (!validId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order id",
        });
      }

      // ----------------------------------------------------------
      // FIND ORDER
      // ----------------------------------------------------------

      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // ----------------------------------------------------------
      // ONLY CANCELLED CAN DELETE
      // ----------------------------------------------------------

      if (order.status !== "cancelled") {
        return res.status(400).json({
          success: false,
          message:
            "Only cancelled orders can be deleted",
        });
      }

      // ----------------------------------------------------------
      // DELETE
      // ----------------------------------------------------------

      await order.deleteOne();

      return res.json({
        success: true,
        message: "Order permanently deleted",
      });
    } catch (err) {
      console.error("DELETE ORDER ERROR:", err);

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

// ================================================================
// EXPORT
// ================================================================

export default router;