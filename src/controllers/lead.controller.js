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

    // Check if phone exists (including soft‑deleted)
    const existingLead = await Lead.findOne({ phone: cleanPhone });

    if (existingLead) {
      if (existingLead.isDeleted) {
        return res.status(400).json({
          success: false,
          message: "Phone number already exists in Recently Deleted. Please restore it instead.",
          leadId: existingLead._id,
        });
      }
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
   GET ALL ACTIVE LEADS (excludes soft‑deleted)
===================================================== */
export const getLeads = async (req, res) => {
  try {
    const leads = await Lead.find({ isDeleted: false })
      .sort({ createdAt: -1 });

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
   GET RECENTLY DELETED LEADS
===================================================== */
export const getDeletedLeads = async (req, res) => {
  try {
    const leads = await Lead.find({ isDeleted: true })
      .sort({ deletedAt: -1 });

    return res.json({
      success: true,
      total: leads.length,
      leads,
    });
  } catch (err) {
    console.log("GET DELETED LEADS ERROR 👉", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   GET SINGLE LEAD (any – including deleted)
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
   UPDATE LEAD (active leads only)
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

    if (lead.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot update a deleted lead. Restore it first.",
      });
    }

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
   SOFT DELETE LEAD (move to trash)
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

    if (lead.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Lead is already deleted",
      });
    }

    // ⚠️ Soft delete – keep audio for restore
    lead.isDeleted = true;
    lead.deletedAt = new Date();
    await lead.save();

    return res.json({
      success: true,
      message: "Lead moved to trash",
      lead,
    });
  } catch (err) {
    console.log("DELETE LEAD ERROR 👉", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   RESTORE SINGLE LEAD
===================================================== */
export const restoreLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (!lead.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Lead is not deleted",
      });
    }

    lead.isDeleted = false;
    lead.deletedAt = null;
    await lead.save();

    return res.json({
      success: true,
      message: "Lead restored successfully",
      lead,
    });
  } catch (err) {
    console.log("RESTORE LEAD ERROR 👉", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   RESTORE MULTIPLE LEADS (returns restored IDs)
===================================================== */
export const restoreManyLeads = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of lead IDs",
      });
    }

    const leads = await Lead.find({
      _id: { $in: ids },
      isDeleted: true,
    });

    if (leads.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No deleted leads found for the provided IDs",
      });
    }

    const restoredIds = leads.map((lead) => lead._id);

    await Lead.updateMany(
      { _id: { $in: restoredIds } },
      { isDeleted: false, deletedAt: null }
    );

    return res.json({
      success: true,
      message: `${restoredIds.length} leads restored successfully`,
      restoredIds,
      modifiedCount: restoredIds.length,
    });
  } catch (err) {
    console.log("RESTORE MANY LEADS ERROR 👉", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   PERMANENT DELETE SINGLE LEAD (removes audio)
===================================================== */
export const permanentDeleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (!lead.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot permanently delete an active lead. Delete it first.",
      });
    }

    if (lead.audioNote) {
      await deleteLeadAudio(lead.audioNote);
    }

    await lead.deleteOne();

    return res.json({
      success: true,
      message: "Lead permanently deleted",
    });
  } catch (err) {
    console.log("PERMANENT DELETE LEAD ERROR 👉", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   PERMANENT DELETE MULTIPLE LEADS (only soft‑deleted)
===================================================== */
export const permanentDeleteManyLeads = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of lead IDs",
      });
    }

    // ✅ Only fetch soft‑deleted leads
    const leads = await Lead.find({
      _id: { $in: ids },
      isDeleted: true,
    });

    if (leads.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No deleted leads found for the provided IDs",
      });
    }

    const deleteIds = leads.map((lead) => lead._id);

    const audioDeletions = leads
      .filter((lead) => lead.audioNote)
      .map((lead) => deleteLeadAudio(lead.audioNote));

    await Promise.all(audioDeletions);

    const result = await Lead.deleteMany({
      _id: { $in: deleteIds },
      isDeleted: true,
    });

    return res.json({
      success: true,
      message: `${result.deletedCount} leads permanently deleted`,
      deletedIds: deleteIds,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.log("PERMANENT DELETE MANY LEADS ERROR 👉", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   RESTORE ALL LEADS (emergency utility)
===================================================== */
export const restoreAllLeads = async (req, res) => {
  try {
    const result = await Lead.updateMany(
      { isDeleted: true },
      { isDeleted: false, deletedAt: null }
    );

    return res.json({
      success: true,
      message: `${result.modifiedCount} leads restored from trash`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.log("RESTORE ALL LEADS ERROR 👉", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};