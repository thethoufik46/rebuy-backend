import Lead from "../models/lead_model.js";
import {
  uploadLeadAudio,
  deleteLeadAudio,
} from "../utils/sendLeads.js";

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
    } = req.body;

    if (!phone || !description) {
      return res.status(400).json({
        success: false,
        message: "Phone and description are required",
      });
    }

    const cleanPhone = phone.toString().replace(/\D/g, "");

    // Check duplicate phone
    const existingLead = await Lead.findOne({ phone: cleanPhone });

    if (existingLead) {
      return res.status(400).json({
        success: false,
        message: "Phone number already registered",
      });
    }

    let audioNote = null;

    if (req.file) {
      audioNote = await uploadLeadAudio(req.file);
    }

    const lead = await Lead.create({
      phone: cleanPhone,
      description,
      district: district || "",
      address: address || "",
      type: type || null,
      payment: payment || null,
      buyer: buyer || null,
      board: board || null,
      transmission: transmission || null,
      status: status || "pending",
      review: review || "",
      reason: reason || "",
      audioNote,
    });

    return res.status(201).json({
      success: true,
      message: "Lead added successfully",
      lead,
    });
  } catch (err) {
    console.error("ADD LEAD ERROR 👉", err);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Phone number already registered",
      });
    }

    return res.status(500).json({
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

    return res.json({
      success: true,
      total: leads.length,
      leads,
    });
  } catch (err) {
    console.log("GET LEADS ERROR 👉", err);

    return res.status(500).json({
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

    return res.json({
      success: true,
      lead,
    });
  } catch (err) {
    console.log("GET LEAD ERROR 👉", err);

    return res.status(500).json({
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

    // Duplicate phone check
    if (req.body.phone !== undefined) {
      const cleanPhone = req.body.phone.toString().replace(/\D/g, "");

      const existingLead = await Lead.findOne({
        phone: cleanPhone,
        _id: { $ne: lead._id },
      });

      if (existingLead) {
        return res.status(400).json({
          success: false,
          message: "Phone number already registered",
        });
      }

      lead.phone = cleanPhone;
    }

    const fields = [
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
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        lead[field] = req.body[field];
      }
    });

    if (req.file) {
      if (lead.audioNote) {
        await deleteLeadAudio(lead.audioNote);
      }

      lead.audioNote = await uploadLeadAudio(req.file);
    }

    await lead.save();

    return res.json({
      success: true,
      message: "Lead updated successfully",
      lead,
    });
  } catch (err) {
    console.log("UPDATE LEAD ERROR 👉", err);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Phone number already registered",
      });
    }

    return res.status(500).json({
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

    if (lead.audioNote) {
      await deleteLeadAudio(lead.audioNote);
    }

    await lead.deleteOne();

    return res.json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (err) {
    console.log("DELETE LEAD ERROR 👉", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};