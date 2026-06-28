import Lead from "../models/lead_model.js";

/* =====================================================
   ADD LEAD
===================================================== */
export const addLead = async (req, res) => {
  try {
    const {
      phone,
      district,
      address,
      type,
      payment,
      buyer,
      board,
      transmission,
      status,
      review,
      description,
      reason,
      adminNote,
    } = req.body;

    if (
      !phone ||
      !district ||
      !type ||
      !payment ||
      !buyer ||
      !board ||
      !transmission
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    const lead = await Lead.create({
      phone,
      district,
      address: address || "NA",
      type,
      payment,
      buyer,
      board,
      transmission,
      status: status || "pending",
      review: review || "",
      description: description || "",
      reason: reason || "",
      adminNote: adminNote || "",
    });

    res.status(201).json({
      success: true,
      message: "Lead added successfully",
      lead,
    });
  } catch (err) {
    console.log("ADD LEAD ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   GET ALL LEADS
===================================================== */
export const getLeads = async (req, res) => {
  try {
    const leads = await Lead.find().sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      total: leads.length,
      leads,
    });
  } catch (err) {
    console.log("GET LEADS ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   GET SINGLE LEAD
===================================================== */
export const getLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.json({
      success: true,
      lead,
    });
  } catch (err) {
    console.log("GET LEAD ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   UPDATE LEAD
===================================================== */
export const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    const fields = [
      "phone",
      "district",
      "address",
      "type",
      "payment",
      "buyer",
      "board",
      "transmission",
      "status",
      "review",
      "description",
      "reason",
      "adminNote",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        lead[field] = req.body[field];
      }
    });

    await lead.save();

    res.json({
      success: true,
      message: "Lead updated successfully",
      lead,
    });
  } catch (err) {
    console.log("UPDATE LEAD ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   DELETE LEAD
===================================================== */
export const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    await lead.deleteOne();

    res.json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (err) {
    console.log("DELETE LEAD ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};