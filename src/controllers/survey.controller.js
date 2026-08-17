// ======================= survey.controller.js =======================

import Survey from "../models/survey_model.js";


/* ============================================================
   HELPERS
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
   OPTIONAL USER ID

   Login is NOT required.

   If another middleware has already attached req.user,
   we will store the user ID.

   Otherwise null.
============================================================ */

const getOptionalUserId = (req) => {

  return (
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    null
  );

};


/* ============================================================
   CREATE SURVEY

   POST /api/survey/add

   PUBLIC
   LOGIN NOT REQUIRED
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

    } = req.body || {};


    /* ========================================================
       REQUIRED FIELDS
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
          "Name is required.",

      });

    }


    if (!cleanPhone) {

      return res.status(400).json({
        success: false,

        message:
          "Phone number is required.",

      });

    }


    if (!cleanDistrict) {

      return res.status(400).json({
        success: false,

        message:
          "District is required.",

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
          "Please enter a valid Indian mobile number.",

      });

    }


    /* ========================================================
       LATITUDE
    ======================================================== */

    let cleanLatitude = null;


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
            "Invalid latitude.",

        });

      }


      cleanLatitude =
        parsedLatitude;

    }


    /* ========================================================
       LONGITUDE
    ======================================================== */

    let cleanLongitude = null;


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
            "Invalid longitude.",

        });

      }


      cleanLongitude =
        parsedLongitude;

    }


    /* ========================================================
       AREA
    ======================================================== */

    let cleanArea = null;


    if (
      approximateArea !== undefined &&
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
            "Invalid approximate area.",

        });

      }


      cleanArea =
        parsedArea;

    }


    /* ========================================================
       DATE
    ======================================================== */

    let cleanPreferredDate =
      null;


    if (
      preferredDate !== undefined &&
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
            "Invalid preferred date.",

        });

      }


      cleanPreferredDate =
        parsedDate;

    }


    /* ========================================================
       OPTIONAL USER

       NO LOGIN REQUIRED
    ======================================================== */

    const optionalUserId =
      getOptionalUserId(req);


    /* ========================================================
       CREATE SURVEY
    ======================================================== */

    const survey =
      new Survey({

        // If logged in through another middleware,
        // save the user.
        //
        // If not logged in:
        // null
        user:
          optionalUserId || null,


        name:
          cleanName,


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
          ) || null,


        surveyType:
          cleanString(
            surveyType
          ) || null,


        approximateArea:
          cleanArea,


        areaUnit:
          cleanString(
            areaUnit
          ) || null,


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
          ) ||
          "Not Sure - தெரியவில்லை",


        requirement:
          cleanString(
            requirement
          ) ||
          "General Measurement - பொதுவான அளவீடு",


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


    /* ========================================================
       SAVE
    ======================================================== */

    await survey.save();


    /* ========================================================
       SUCCESS
    ======================================================== */

    return res.status(201).json({

      success: true,

      message:
        "Survey request submitted successfully.",

      survey,

    });


  } catch (error) {

    console.error(
      "❌ ADD SURVEY ERROR 👉",
      error
    );


    /* ========================================================
       MONGOOSE VALIDATION ERROR
    ======================================================== */

    if (
      error?.name ===
      "ValidationError"
    ) {

      const messages =
        Object.values(
          error.errors || {}
        )
          .map(
            (item) =>
              item.message
          )
          .filter(Boolean);


      return res.status(400).json({

        success: false,

        message:
          messages.length > 0
            ? messages.join(", ")
            : "Invalid survey details.",

      });

    }


    /* ========================================================
       NORMAL ERROR
    ======================================================== */

    return res.status(500).json({

      success: false,

      message:
        error?.message ||
        "Failed to submit survey request.",

    });

  }

};


/* ============================================================
   GET MY SURVEYS

   OPTIONAL FEATURE

   This endpoint still requires login because it is
   specifically for the user's own surveys.

   POST /api/survey/my
============================================================ */

export const getMySurveys =
  async (
    req,
    res
  ) => {

    try {

      const userId =
        getOptionalUserId(req);


      if (!userId) {

        return res.status(401).json({

          success: false,

          message:
            "Login is required to view your survey history.",

          surveys: [],

        });

      }


      const surveys =
        await Survey.find({

          user: userId,

          isDeleted: false,

        })
          .sort({
            createdAt: -1,
          })
          .lean();


      return res.status(200).json({

        success: true,

        count:
          surveys.length,

        surveys,

      });


    } catch (error) {

      console.error(
        "❌ GET MY SURVEYS ERROR 👉",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Failed to fetch your survey requests.",

        surveys: [],

      });

    }

  };


/* ============================================================
   GET ALL SURVEYS

   ADMIN
   GET /api/survey
============================================================ */

export const getSurveys =
  async (
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
        String(surveyType).trim()
      ) {

        filter.surveyType =
          String(
            surveyType
          ).trim();

      }


      if (
        propertyType &&
        String(propertyType).trim()
      ) {

        filter.propertyType =
          String(
            propertyType
          ).trim();

      }


      const surveys =
        await Survey.find(
          filter
        )
          .populate(
            "user",
            "name phone district"
          )
          .sort({
            createdAt: -1,
          });


      return res.status(200).json({

        success: true,

        count:
          surveys.length,

        surveys,

      });


    } catch (error) {

      console.error(
        "❌ GET SURVEYS ERROR 👉",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          error?.message ||
          "Failed to fetch survey requests.",

        surveys: [],

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


      if (!id) {

        return res.status(400).json({

          success: false,

          message:
            "Survey ID is required.",

        });

      }


      const survey =
        await Survey.findById(
          id
        )
          .populate(
            "user",
            "name phone district"
          );


      if (!survey) {

        return res.status(404).json({

          success: false,

          message:
            "Survey request not found.",

        });

      }


      return res.status(200).json({

        success: true,

        survey,

      });


    } catch (error) {

      console.error(
        "❌ GET SURVEY BY ID ERROR 👉",
        error
      );


      if (
        error?.name ===
        "CastError"
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid survey ID.",

        });

      }


      return res.status(500).json({

        success: false,

        message:
          error?.message ||
          "Failed to fetch survey request.",

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


      if (!id) {

        return res.status(400).json({

          success: false,

          message:
            "Survey ID is required.",

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
            "Survey request not found.",

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


      for (
        const field
        of allowedFields
      ) {

        if (
          Object.prototype.hasOwnProperty.call(
            req.body || {},
            field
          )
        ) {

          survey[field] =
            req.body[field];

        }

      }


      /* ========================================================
         CLEAN PHONE IF UPDATED
      ======================================================== */

      if (
        Object.prototype.hasOwnProperty.call(
          req.body || {},
          "phone"
        )
      ) {

        const phone =
          cleanString(
            req.body.phone
          ).replace(
            /[\s-]/g,
            ""
          );


        if (
          !/^(?:\+91|91)?[6-9]\d{9}$/.test(
            phone
          )
        ) {

          return res.status(400).json({

            success: false,

            message:
              "Please enter a valid Indian mobile number.",

          });

        }


        survey.phone =
          phone;

      }


      /* ========================================================
         CLEAN DATE
      ======================================================== */

      if (
        Object.prototype.hasOwnProperty.call(
          req.body || {},
          "preferredDate"
        )
      ) {

        const value =
          req.body.preferredDate;


        if (
          value === null ||
          value === ""
        ) {

          survey.preferredDate =
            null;

        } else {

          const date =
            new Date(value);


          if (
            Number.isNaN(
              date.getTime()
            )
          ) {

            return res.status(400).json({

              success: false,

              message:
                "Invalid preferred date.",

            });

          }


          survey.preferredDate =
            date;

        }

      }


      await survey.save();


      return res.status(200).json({

        success: true,

        message:
          "Survey request updated successfully.",

        survey,

      });


    } catch (error) {

      console.error(
        "❌ UPDATE SURVEY ERROR 👉",
        error
      );


      if (
        error?.name ===
        "ValidationError"
      ) {

        const messages =
          Object.values(
            error.errors || {}
          )
            .map(
              (item) =>
                item.message
            )
            .filter(Boolean);


        return res.status(400).json({

          success: false,

          message:
            messages.join(", ") ||
            "Invalid survey details.",

        });

      }


      return res.status(500).json({

        success: false,

        message:
          error?.message ||
          "Failed to update survey request.",

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
      } = req.body || {};


      const allowedStatuses = [

        "pending",

        "approved",

        "rejected",

        "completed",

      ];


      const cleanStatus =
        cleanString(
          status
        ).toLowerCase();


      if (
        !allowedStatuses.includes(
          cleanStatus
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid survey status.",

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
            "Survey request not found.",

        });

      }


      survey.status =
        cleanStatus;


      if (
        Object.prototype.hasOwnProperty.call(
          req.body || {},
          "adminNote"
        )
      ) {

        survey.adminNote =
          cleanString(
            adminNote
          );

      }


      await survey.save();


      return res.status(200).json({

        success: true,

        message:
          "Survey status updated successfully.",

        survey,

      });


    } catch (error) {

      console.error(
        "❌ UPDATE SURVEY STATUS ERROR 👉",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          error?.message ||
          "Failed to update survey status.",

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
            "Survey request not found.",

        });

      }


      if (
        survey.isDeleted
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Survey request is already deleted.",

        });

      }


      survey.isDeleted =
        true;


      survey.deletedAt =
        new Date();


      await survey.save();


      return res.status(200).json({

        success: true,

        message:
          "Survey request deleted successfully.",

      });


    } catch (error) {

      console.error(
        "❌ DELETE SURVEY ERROR 👉",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          error?.message ||
          "Failed to delete survey request.",

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
            "Survey request not found.",

        });

      }


      if (
        !survey.isDeleted
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Survey request is not deleted.",

        });

      }


      survey.isDeleted =
        false;


      survey.deletedAt =
        null;


      await survey.save();


      return res.status(200).json({

        success: true,

        message:
          "Survey request restored successfully.",

        survey,

      });


    } catch (error) {

      console.error(
        "❌ RESTORE SURVEY ERROR 👉",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          error?.message ||
          "Failed to restore survey request.",

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
            "Survey request not found.",

        });

      }


      await Survey.findByIdAndDelete(
        id
      );


      return res.status(200).json({

        success: true,

        message:
          "Survey request permanently deleted.",

      });


    } catch (error) {

      console.error(
        "❌ PERMANENT DELETE SURVEY ERROR 👉",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          error?.message ||
          "Failed to permanently delete survey.",

      });

    }

  };