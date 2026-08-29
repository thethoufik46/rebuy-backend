// ================================================================
// ORDER ROUTES — FINAL
// booking → verification → advance → finance → delivery
// cancel_requested → cancelled
// ================================================================

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

// ================================================================
// FINAL ORDER STATUS
// ================================================================

const ALLOWED_STATUS = [
  "booking",
  "verification",
  "advance",
  "finance",
  "delivery",
  "cancel_requested",
  "cancelled",
];

// ================================================================
// HELPERS
// ================================================================

function getItemModel(itemType) {
  return ITEM_MODELS[itemType];
}

function validId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ================================================================
// CREATE ORDER
// POST /api/orders
// USER
// ================================================================

router.post("/", verifyToken, async (req, res) => {
  try {
    const { itemId, itemType } = req.body;

    if (
      !itemType ||
      !ALLOWED_ITEM_TYPES.includes(itemType)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid itemType. Use car, bike, property or electronics",
      });
    }

    if (!itemId || !validId(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Valid itemId is required",
      });
    }

    const ItemModel =
      getItemModel(itemType);

    if (!ItemModel) {
      return res.status(400).json({
        success: false,
        message: "Invalid item type",
      });
    }

    const item =
      await ItemModel.findById(itemId).lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `${itemType} not found`,
      });
    }

    if (
      item.status === "draft" ||
      item.status === "delete_requested"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This item is not available for ordering",
      });
    }

    // ============================================================
    // ONE USER → ONE ITEM → ONE ACTIVE ORDER
    // ============================================================

    const existingOrder =
      await Order.findOne({
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
        message:
          `You already ordered this ${itemType}`,
        order: existingOrder,
      });
    }

    // ============================================================
    // CREATE
    // ============================================================

    const order =
      await Order.create({
        user: req.userId,
        item: itemId,
        itemType,
        status: "booking",
        isUserVisible: true,
      });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (err) {
    console.error(
      "CREATE ORDER ERROR:",
      err,
    );

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "You already ordered this item",
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
// ================================================================

router.get(
  "/my",
  verifyToken,
  async (req, res) => {
    try {
      const orders =
        await Order.find({
          user: req.userId,
          isUserVisible: true,
        })
          .sort({
            createdAt: -1,
          })
          .lean();

      const finalOrders =
        await Promise.all(
          orders.map(
            async (order) => {
              try {
                const ItemModel =
                  getItemModel(
                    order.itemType,
                  );

                if (!ItemModel) {
                  return {
                    ...order,
                    item: null,
                  };
                }

                let itemQuery =
                  ItemModel.findById(
                    order.item,
                  );

                // ==================================================
                // CAR
                // ==================================================

                if (
                  order.itemType === "car"
                ) {
                  itemQuery = itemQuery
                    .populate(
                      "brand",
                      "name logoUrl",
                    )
                    .populate(
                      "variant",
                      "title imageUrl",
                    );
                }

                // ==================================================
                // BIKE
                // ==================================================

                if (
                  order.itemType === "bike"
                ) {
                  itemQuery = itemQuery
                    .populate(
                      "brand",
                      "name logoUrl",
                    )
                    .populate(
                      "model",
                      "title",
                    );
                }

                // ==================================================
                // ELECTRONICS
                // ==================================================

                if (
                  order.itemType ===
                  "electronics"
                ) {
                  itemQuery =
                    itemQuery.populate(
                      "brand",
                      "name logoUrl",
                    );
                }

                const item =
                  await itemQuery.lean();

                return {
                  ...order,
                  item: item || null,
                };
              } catch (err) {
                console.error(
                  `MY ORDER ITEM ERROR [${order._id}]:`,
                  err.message,
                );

                return {
                  ...order,
                  item: null,
                };
              }
            },
          ),
        );

      return res.json({
        success: true,
        count: finalOrders.length,
        orders: finalOrders,
      });
    } catch (err) {
      console.error(
        "GET MY ORDERS ERROR:",
        err,
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

// ================================================================
// ADMIN - GET ALL ORDERS
// GET /api/orders
// ================================================================

router.get(
  "/",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const orders =
        await Order.find()
          .populate(
            "user",
            "name phone email",
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      const finalOrders =
        await Promise.all(
          orders.map(
            async (order) => {
              try {
                const ItemModel =
                  getItemModel(
                    order.itemType,
                  );

                if (!ItemModel) {
                  return {
                    ...order,
                    item: null,
                  };
                }

                let itemQuery =
                  ItemModel.findById(
                    order.item,
                  );

                if (
                  order.itemType === "car"
                ) {
                  itemQuery = itemQuery
                    .populate(
                      "brand",
                      "name logoUrl",
                    )
                    .populate(
                      "variant",
                      "title imageUrl",
                    );
                }

                if (
                  order.itemType === "bike"
                ) {
                  itemQuery = itemQuery
                    .populate(
                      "brand",
                      "name logoUrl",
                    )
                    .populate(
                      "model",
                      "title",
                    );
                }

                if (
                  order.itemType ===
                  "electronics"
                ) {
                  itemQuery =
                    itemQuery.populate(
                      "brand",
                      "name logoUrl",
                    );
                }

                const item =
                  await itemQuery.lean();

                return {
                  ...order,
                  item: item || null,
                };
              } catch (err) {
                console.error(
                  `ADMIN ORDER ITEM ERROR [${order._id}]:`,
                  err.message,
                );

                return {
                  ...order,
                  item: null,
                };
              }
            },
          ),
        );

      return res.json({
        success: true,
        count: finalOrders.length,
        orders: finalOrders,
      });
    } catch (err) {
      console.error(
        "GET ALL ORDERS ERROR:",
        err,
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

// ================================================================
// USER - GET SINGLE ORDER
// GET /api/orders/:id
// IMPORTANT FOR LIVE BIKE/CAR TRACKING
// ================================================================

router.get(
  "/:id",
  verifyToken,
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order id",
        });
      }

      const order =
        await Order.findOne({
          _id: req.params.id,
          user: req.userId,
          isUserVisible: true,
        }).lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      const ItemModel =
        getItemModel(
          order.itemType,
        );

      let item = null;

      if (ItemModel) {
        let itemQuery =
          ItemModel.findById(
            order.item,
          );

        if (
          order.itemType === "car"
        ) {
          itemQuery = itemQuery
            .populate(
              "brand",
              "name logoUrl",
            )
            .populate(
              "variant",
              "title imageUrl",
            );
        }

        if (
          order.itemType === "bike"
        ) {
          itemQuery = itemQuery
            .populate(
              "brand",
              "name logoUrl",
            )
            .populate(
              "model",
              "title",
            );
        }

        if (
          order.itemType ===
          "electronics"
        ) {
          itemQuery =
            itemQuery.populate(
              "brand",
              "name logoUrl",
            );
        }

        item =
          await itemQuery.lean();
      }

      return res.json({
        success: true,
        order: {
          ...order,
          item,
        },
      });
    } catch (err) {
      console.error(
        "GET SINGLE ORDER ERROR:",
        err,
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

// ================================================================
// USER - CANCEL REQUEST
// PUT /api/orders/:id/cancel
// ================================================================

router.put(
  "/:id/cancel",
  verifyToken,
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order id",
        });
      }

      const order =
        await Order.findOne({
          _id: req.params.id,
          user: req.userId,
        });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (
        order.status === "cancelled"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Order is already cancelled",
        });
      }

      if (
        order.status ===
        "cancel_requested"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cancel request already sent",
        });
      }

      if (
        order.status === "delivery"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Delivered order cannot be cancelled",
        });
      }

      order.status =
        "cancel_requested";

      await order.save();

      return res.json({
        success: true,
        message:
          "Cancel request sent. Waiting for admin approval",
        order,
      });
    } catch (err) {
      console.error(
        "CANCEL ORDER ERROR:",
        err,
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

// ================================================================
// ADMIN - UPDATE ORDER STATUS
// PUT /api/orders/:id/status
//
// booking
// verification
// advance
// finance
// delivery
// cancel_requested
// cancelled
// ================================================================

router.put(
  "/:id/status",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const {
        status,
      } = req.body;

      // ==========================================================
      // VALIDATE STATUS
      // ==========================================================

      if (
        !ALLOWED_STATUS.includes(
          status,
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
          allowedStatus:
            ALLOWED_STATUS,
        });
      }

      // ==========================================================
      // VALIDATE ORDER ID
      // ==========================================================

      if (
        !validId(req.params.id)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid order id",
        });
      }

      // ==========================================================
      // FIND ORDER
      // ==========================================================

      const order =
        await Order.findById(
          req.params.id,
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // ==========================================================
      // UPDATE STATUS
      // ==========================================================

      order.status = status;

      // ==========================================================
      // CANCELLED → HIDE FROM USER
      // ==========================================================

      if (
        status === "cancelled"
      ) {
        order.isUserVisible = false;
      } else {
        order.isUserVisible = true;
      }

      await order.save();

      return res.json({
        success: true,
        message:
          "Order status updated successfully",
        order,
      });
    } catch (err) {
      console.error(
        "UPDATE ORDER STATUS ERROR:",
        err,
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

// ================================================================
// ADMIN - HARD DELETE
// DELETE /api/orders/:id
// ONLY CANCELLED
// ================================================================

router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      if (
        !validId(req.params.id)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid order id",
        });
      }

      const order =
        await Order.findById(
          req.params.id,
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (
        order.status !==
        "cancelled"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only cancelled orders can be deleted",
        });
      }

      await order.deleteOne();

      return res.json({
        success: true,
        message:
          "Order permanently deleted",
      });
    } catch (err) {
      console.error(
        "DELETE ORDER ERROR:",
        err,
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

// ================================================================
// EXPORT
// ================================================================

export default router;