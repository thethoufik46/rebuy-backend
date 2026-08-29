import mongoose from "mongoose";

// ================================================================
// ORDER SCHEMA
// COMMON ORDER MODEL
// CAR + BIKE + PROPERTY + ELECTRONICS
// ================================================================

const orderSchema = new mongoose.Schema(
  {
    // ============================================================
    // USER
    // ============================================================

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ============================================================
    // ITEM
    // ============================================================

    item: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // ============================================================
    // ITEM TYPE
    // ============================================================

    itemType: {
      type: String,
      enum: [
        "car",
        "bike",
        "property",
        "electronics",
      ],
      required: true,
      index: true,
    },

    // ============================================================
    // ORDER STATUS
    // ============================================================

status: {
  type: String,
  enum: [
    "booking",
    "verification",
    "advance",
    "finance",
    "delivery",
    "cancel_requested",
    "cancelled",
  ],
  default: "booking",
  required: true,
  index: true,
},

    // ============================================================
    // USER VISIBILITY
    //
    // true  → user can see order
    // false → hidden from user
    // ============================================================

    isUserVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ================================================================
// INDEXES
// ================================================================

// Fast user order lookup
orderSchema.index({
  user: 1,
  createdAt: -1,
});

// Fast item lookup
orderSchema.index({
  item: 1,
  itemType: 1,
});

// Prevent duplicate active order
//
// Same user + same item + same category
// can have only one active order.
//
// Cancelled orders can be created again.
//
// ================================================================

orderSchema.index(
  {
    user: 1,
    item: 1,
    itemType: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $ne: "cancelled",
      },
    },
  }
);

// ================================================================
// MODEL
// ================================================================

export default mongoose.model("Order", orderSchema);