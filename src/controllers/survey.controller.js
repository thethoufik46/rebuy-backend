// ======================= survey.controller.js =======================

import Survey from "../models/survey_model.js";

/* ============================================================
   HELPER
============================================================ */

const cleanString = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
};

/* ============================================================
   CREATE SURVEY
   POST /api/survey/add
============================================================ */

export const addSurvey = async (
  req,
  res
) => {
  try {
    const {
      name,
      phone,
      district,

      latitude,
      longitude,

      propertyType,
      surveyType,

      approximateArea,
      areaUnit,

      surveyNumber,
      subdivisionNumber,
      pattaNumber,

      boundaryStatus,
      requirement,

      description,

      preferredDate,
      preferredTime,
    } = req.body;

    /* ========================================================
       REQUIRED
       Only:
       - name
       - phone
       - district
    ======================================================== */

    const cleanName =
      cleanString(name);

    const cleanPhone =
      cleanString(phone);

    const cleanDistrict =
      cleanString(district);

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message:
          "Name is required",
      });
    }

    if (!cleanPhone) {
      return res.status(400).json({
        success: false,
        message:
          "Phone is required",
      });
    }

    if (!cleanDistrict) {
      return res.status(400).json({
        success: false,
        message:
          "District is required",
      });
    }

    /* ========================================================
       PHONE VALIDATION
       India mobile number
    ======================================================== */

    const normalizedPhone =
      cleanPhone.replace(
        /[\s-]/g,
        ""
      );

    if (
      !/^(?:\+91|91)?[6-9]\d{9}$/.test(
        normalizedPhone
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid Indian mobile number",
      });
    }

    /* ========================================================
       OPTIONAL MAP VALUES
    ======================================================== */

    let cleanLatitude = null;
    let cleanLongitude = null;

    if (
      latitude !== undefined &&
      latitude !== null &&
      latitude !== ""
    ) {
      const parsedLatitude =
        Number(latitude);

      if (
        !Number.isFinite(
          parsedLatitude
        ) ||
        parsedLatitude < -90 ||
        parsedLatitude > 90
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid latitude",
        });
      }

      cleanLatitude =
        parsedLatitude;
    }

    if (
      longitude !== undefined &&
      longitude !== null &&
      longitude !== ""
    ) {
      const parsedLongitude =
        Number(longitude);

      if (
        !Number.isFinite(
          parsedLongitude
        ) ||
        parsedLongitude < -180 ||
        parsedLongitude > 180
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid longitude",
        });
      }

      cleanLongitude =
        parsedLongitude;
    }

    /* ========================================================
       AREA
       Optional
    ======================================================== */

    let cleanArea = null;

    if (
      approximateArea !==
        undefined &&
      approximateArea !== null &&
      approximateArea !== ""
    ) {
      const parsedArea =
        Number(
          approximateArea
        );

      if (
        !Number.isFinite(
          parsedArea
        ) ||
        parsedArea < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid approximate area",
        });
      }

      cleanArea =
        parsedArea;
    }

    /* ========================================================
       DATE
       Optional
    ======================================================== */

    let cleanPreferredDate =
      null;

    if (
      preferredDate !==
        undefined &&
      preferredDate !== null &&
      preferredDate !== ""
    ) {
      const parsedDate =
        new Date(
          preferredDate
        );

      if (
        Number.isNaN(
          parsedDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid preferred date",
        });
      }

      cleanPreferredDate =
        parsedDate;
    }

    /* ========================================================
       CREATE SURVEY
    ======================================================== */

    const survey =
      new Survey({
        name: cleanName,

        phone:
          normalizedPhone,

        district:
          cleanDistrict,

        latitude:
          cleanLatitude,

        longitude:
          cleanLongitude,

        propertyType:
          cleanString(
            propertyType
          ) || undefined,

        surveyType:
          cleanString(
            surveyType
          ) || undefined,

        approximateArea:
          cleanArea,

        areaUnit:
          cleanString(
            areaUnit
          ) || undefined,

        surveyNumber:
          cleanString(
            surveyNumber
          ),

        subdivisionNumber:
          cleanString(
            subdivisionNumber
          ),

        pattaNumber:
          cleanString(
            pattaNumber
          ),

        boundaryStatus:
          cleanString(
            boundaryStatus
          ) || undefined,

        requirement:
          cleanString(
            requirement
          ) || undefined,

        description:
          cleanString(
            description
          ),

        preferredDate:
          cleanPreferredDate,

        preferredTime:
          cleanString(
            preferredTime
          ),

        status:
          "pending",

        adminNote:
          "",

        isDeleted:
          false,

        deletedAt:
          null,
      });

    await survey.save();

    /* ========================================================
       RESPONSE
    ======================================================== */

    return res.status(201).json({
      success: true,

      message:
        "Survey request submitted successfully",

      survey,
    });

  } catch (error) {
    console.error(
      "ADD SURVEY ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        error?.message ||
        "Failed to submit survey request",
    });
  }
};

/* ============================================================
   GET ALL SURVEYS
   ADMIN
   GET /api/survey
============================================================ */

export const getSurveys = async (
  req,
  res
) => {
  try {
    const {
      status,
      district,
      surveyType,
      propertyType,
    } = req.query;

    const filter = {
      isDeleted: false,
    };

    if (
      status &&
      String(status).trim()
    ) {
      filter.status =
        String(
          status
        ).trim();
    }

    if (
      district &&
      String(district).trim()
    ) {
      filter.district =
        String(
          district
        ).trim();
    }

    if (
      surveyType &&
      String(
        surveyType
      ).trim()
    ) {
      filter.surveyType =
        String(
          surveyType
        ).trim();
    }

    if (
      propertyType &&
      String(
        propertyType
      ).trim()
    ) {
      filter.propertyType =
        String(
          propertyType
        ).trim();
    }

    const surveys =
      await Survey.find(
        filter
      ).sort({
        createdAt: -1,
      });

    return res.json({
      success: true,

      count:
        surveys.length,

      surveys,
    });

  } catch (error) {
    console.error(
      "GET SURVEYS ERROR 👉",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        error?.message ||
        "Failed to fetch survey requests",
    });
  }
};

/* ============================================================
   GET SINGLE SURVEY
   ADMIN
   GET /api/survey/:id
============================================================ */

export const getSurveyById =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      const survey =
        await Survey.findById(
          id
        );

      if (!survey) {
        return res.status(404).json({
          success: false,

          message:
            "Survey request not found",
        });
      }

      return res.json({
        success: true,

        survey,
      });

    } catch (error) {
      console.error(
        "GET SURVEY BY ID ERROR 👉",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to fetch survey request",
      });
    }
  };

/* ============================================================
   UPDATE SURVEY
   ADMIN
   PUT /api/survey/:id
============================================================ */

export const updateSurvey =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      const survey =
        await Survey.findById(
          id
        );

      if (!survey) {
        return res.status(404).json({
          success: false,

          message:
            "Survey request not found",
        });
      }

      const allowedFields = [
        "name",
        "phone",
        "district",

        "latitude",
        "longitude",

        "propertyType",
        "surveyType",

        "approximateArea",
        "areaUnit",

        "surveyNumber",
        "subdivisionNumber",
        "pattaNumber",

        "boundaryStatus",
        "requirement",

        "description",

        "preferredDate",
        "preferredTime",

        "adminNote",
      ];

      allowedFields.forEach(
        (field) => {
          if (
            Object.prototype.hasOwnProperty.call(
              req.body,
              field
            )
          ) {
            survey[field] =
              req.body[field];
          }
        }
      );

      await survey.save();

      return res.json({
        success: true,

        message:
          "Survey request updated successfully",

        survey,
      });

    } catch (error) {
      console.error(
        "UPDATE SURVEY ERROR 👉",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to update survey request",
      });
    }
  };

/* ============================================================
   UPDATE STATUS
   ADMIN
   PUT /api/survey/:id/status
============================================================ */

export const updateSurveyStatus =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      const {
        status,
        adminNote,
      } = req.body;

      const allowedStatuses = [
        "pending",
        "approved",
        "rejected",
        "completed",
      ];

      const cleanStatus =
        cleanString(
          status
        );

      if (
        !allowedStatuses.includes(
          cleanStatus
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid survey status",
        });
      }

      const survey =
        await Survey.findById(
          id
        );

      if (!survey) {
        return res.status(404).json({
          success: false,

          message:
            "Survey request not found",
        });
      }

      survey.status =
        cleanStatus;

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "adminNote"
        )
      ) {
        survey.adminNote =
          cleanString(
            adminNote
          );
      }

      await survey.save();

      return res.json({
        success: true,

        message:
          "Survey status updated successfully",

        survey,
      });

    } catch (error) {
      console.error(
        "UPDATE SURVEY STATUS ERROR 👉",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to update survey status",
      });
    }
  };

/* ============================================================
   SOFT DELETE
   ADMIN
   DELETE /api/survey/:id
============================================================ */

export const deleteSurvey =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      const survey =
        await Survey.findById(
          id
        );

      if (!survey) {
        return res.status(404).json({
          success: false,

          message:
            "Survey request not found",
        });
      }

      if (
        survey.isDeleted
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Survey request is already deleted",
        });
      }

      survey.isDeleted =
        true;

      survey.deletedAt =
        new Date();

      await survey.save();

      return res.json({
        success: true,

        message:
          "Survey request deleted successfully",
      });

    } catch (error) {
      console.error(
        "DELETE SURVEY ERROR 👉",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to delete survey request",
      });
    }
  };

/* ============================================================
   RESTORE
   ADMIN
   PUT /api/survey/:id/restore
============================================================ */

export const restoreSurvey =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      const survey =
        await Survey.findById(
          id
        );

      if (!survey) {
        return res.status(404).json({
          success: false,

          message:
            "Survey request not found",
        });
      }

      if (
        !survey.isDeleted
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Survey request is not deleted",
        });
      }

      survey.isDeleted =
        false;

      survey.deletedAt =
        null;

      await survey.save();

      return res.json({
        success: true,

        message:
          "Survey request restored successfully",

        survey,
      });

    } catch (error) {
      console.error(
        "RESTORE SURVEY ERROR 👉",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to restore survey request",
      });
    }
  };

/* ============================================================
   PERMANENT DELETE
   ADMIN
   DELETE /api/survey/:id/permanent
============================================================ */

export const permanentlyDeleteSurvey =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      const survey =
        await Survey.findById(
          id
        );

      if (!survey) {
        return res.status(404).json({
          success: false,

          message:
            "Survey request not found",
        });
      }

      await Survey.findByIdAndDelete(
        id
      );

      return res.json({
        success: true,

        message:
          "Survey request permanently deleted",
      });

    } catch (error) {
      console.error(
        "PERMANENT DELETE SURVEY ERROR 👉",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to permanently delete survey",
      });
    }
  };