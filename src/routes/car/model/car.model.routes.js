// ======================= car.model.routes.js =======================
// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: KEEP 100% LOGIC & FUNCTIONALITY.
import express from "express";
import {verifyToken} from "../../../middleware/auth.js";
import uploadCarModel from "../../../middleware/car/model/uploadCarModel.js";
import {
  addCarModel,
  getAllCarModels,
  getCarModelsByBrand,
  getONEBrandhideCarModels,
  getLoadVehiclesCarModels,
  getOtherStateCarModels,
  getSelectedCarModels,
  updateCarModel,
  deleteCarModel,
} from "../../../controllers/car/model/car.model.controller.js";

const router=express.Router();

// ============================================================
// PUBLIC ROUTES 🚀
// ============================================================
router.get("/",getAllCarModels);
router.get("/visible",getONEBrandhideCarModels);
router.get("/load-vehicles",getLoadVehiclesCarModels);
router.get("/other-state",getOtherStateCarModels);
router.get("/selected",getSelectedCarModels);
router.get("/brand/:brandId",getCarModelsByBrand);

// ============================================================
// PROTECTED ROUTES 🔒
// ============================================================
router.post("/add",verifyToken,uploadCarModel.fields([{name:"image",maxCount:1},{name:"taxiImage",maxCount:1}]),addCarModel);
router.put("/:id",verifyToken,uploadCarModel.fields([{name:"image",maxCount:1},{name:"taxiImage",maxCount:1}]),updateCarModel);
router.delete("/:id",verifyToken,deleteCarModel);

export default router;