// ======================= user.car.routes.js =======================
// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
import express from "express";
import mongoose from "mongoose";
import Car from "../../models/car/car_model.js";
import CarBrand from "../../models/car/brand/car_brand_model.js";
import CarVariant from "../../models/car/variant/car_variant_model.js";
import CarModel from "../../models/car/model/car_model_model.js";
import { verifyToken } from "../../middleware/auth.js";
import { verifyTokenOptional } from "../../middleware/verifyTokenOptional.js";
import uploadCar from "../../middleware/car/uploadCar.js";
import { uploadCarImage, deleteCarImage } from "../../utils/car/carUpload.js";
import { encryptSeller, decryptSeller } from "../../utils/sellerCrypto.js";

const router = express.Router();

/* ============================================================
   FEATURES MASTER LIST
============================================================ */
const CAR_FEATURES = [
  "ABS","ABS with EBD","EBD","Airbags","Driver Airbag","Passenger Airbag","Side Airbags","Curtain Airbags","Vehicle Stability Control","Electronic Stability Control","Traction Control","Hill Start Assist","Hill Descent Control","Brake Assist","ISOFIX Child Seat Mounts","Child Safety Lock","Engine Immobilizer","Central Locking","Tyre Pressure Monitoring System","Rear Parking Sensors","Front Parking Sensors","Rear Parking Camera","360° Camera","Blind Spot Monitoring","Lane Departure Warning","Lane Keep Assist","Adaptive Cruise Control","Automatic Emergency Braking","Power Steering","Power Windows","Air Conditioning","Manual Air Conditioning","Automatic Climate Control","Dual Zone Climate Control","Rear AC Vents","Cruise Control","Smart Entry System","Keyless Entry","Push Button Start","Wireless Charger","Front Armrest","Rear Armrest","Cup Holders","Adjustable Steering","Tilt Steering","Telescopic Steering","Height Adjustable Driver Seat","Electrically Adjustable Driver Seat","Ventilated Seats","Heated Seats","Memory Seats","Rain-Sensing Wipers","Automatic Headlamps","Auto-Dimming IRVM","Electrically Adjustable ORVMs","Electrically Foldable ORVMs","Remote Boot Opener","Rear Defogger","Rear Wiper","Electronic Parking Brake","Paddle Shifters","Drive Modes","Fabric Seats","Leather Seats","Leather-Wrapped Steering Wheel","Premium Interior","Ambient Lighting","Rear Reading Lamps","Adjustable Headrests","Digital Instrument Cluster","Tachometer","Trip Meter","Multi-Information Display","Heads-Up Display","Alloy Wheels","Steel Wheels","LED Headlamps","Projector Headlamps","Halogen Headlamps","LED Tail Lamps","Fog Lamps","Daytime Running Lights (DRL)","Sunroof","Panoramic Sunroof","Roof Rails","Rear Spoiler","Shark Fin Antenna","Body-Coloured Bumpers","Chrome Door Handles","Rear Window Defogger","Touchscreen Infotainment System","Android Auto","Apple CarPlay","Wireless Android Auto","Wireless Apple CarPlay","Bluetooth Connectivity","USB Charging Port","USB Type-C Port","AUX Connectivity","Wireless Charging","Navigation System","Voice Commands","Steering-Mounted Audio Controls","Premium Sound System","Rear Entertainment System","Connected Car Technology","Wi-Fi Connectivity","Front Parking Camera","Rear Seat Centre Armrest","Third Row AC Vents","Power Tailgate","Hands-Free Tailgate","Automatic Start-Stop","Regenerative Braking","Hybrid System","Electric Powertrain","Spare Wheel","Tubeless Tyres","Run-Flat Tyres"
];

const parseFeatures = (value) => {
  if (value === undefined || value === null || value === "") return [];
  let arr = value;
  if (typeof value === "string") {
    try { arr = JSON.parse(value); } catch (_) {
      arr = value.split(",").map((v) => v.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr.map((v) => String(v).trim()).filter((v) => CAR_FEATURES.includes(v));
};

const parseMultiValues = (value) => {
  if (value === undefined || value === null || value === "") return [];
  let arr = value;
  if (typeof value === "string") arr = value.split(",");
  else if (!Array.isArray(value)) arr = [value];
  return [...new Set(arr.map((v) => String(v).trim()).filter(Boolean))];
};

const parseObjectIds = (value) => {
  if (value === undefined || value === null || value === "") return [];
  const values = Array.isArray(value) ? value : String(value).split(",");
  return values
    .map((item) => String(item).trim())
    .filter((item) => mongoose.Types.ObjectId.isValid(item))
    .map((item) => new mongoose.Types.ObjectId(item));
};

/* ============================================================
   SELLER RESPONSE
============================================================ */
const prepareSellerForResponse = (car, isAdminUser) => {
  if (!car) return car;
  if (!isAdminUser) { delete car.seller; return car; }
  if (typeof car.seller === "string" && car.seller.includes(":")) {
    try { car.seller = decryptSeller(car.seller); } catch (_) {}
  }
  return car;
};

/* ============================================================
   REGISTRATION VALIDATION
============================================================ */
const REGISTRATION_STATES = [
  "TN","AP","AR","AS","BR","CG","GA","GJ","HR","HP","JH","KA","KL","MP","MH","MN","ML","MZ","NL","OD","PB","RJ","SK","TS","TR","UP","UK","WB","AN","CH","DN","DL","JK","LA","LD","PY",
];

const validateRegistration = (state, number) => {
  const registrationState = String(state || "TN").trim().toUpperCase();
  const registrationNumber = String(number || "").trim();
  if (!REGISTRATION_STATES.includes(registrationState)) throw new Error("Invalid registration state");
  if (!/^[0-9]{2}$/.test(registrationNumber)) throw new Error("Registration number must contain exactly 2 digits");
  return { registrationState, registrationNumber };
};

/* ============================================================
   BRAND / MODEL / VARIANT VALIDATION
============================================================ */
const validateCarHierarchy = async (brand, model, variant = null) => {
  if (!mongoose.Types.ObjectId.isValid(brand)) throw new Error("Invalid brand id");
  const brandDoc = await CarBrand.findById(brand).select("_id").lean();
  if (!brandDoc) throw new Error("Brand not found");

  if (!model) {
    if (variant) throw new Error("Variant cannot be selected without a model");
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(model)) throw new Error("Invalid model id");
  const modelDoc = await CarModel.findById(model).select("_id brand brandId carBrand").lean();
  if (!modelDoc) throw new Error("Model not found");
  const modelBrandId = modelDoc.brand || modelDoc.brandId || modelDoc.carBrand;
  if (modelBrandId && modelBrandId.toString() !== brand.toString()) {
    throw new Error("Selected model does not belong to selected brand");
  }

  if (variant) {
    if (!mongoose.Types.ObjectId.isValid(variant)) throw new Error("Invalid variant id");
    const variantDoc = await CarVariant.findById(variant).select("_id carModel model modelId").lean();
    if (!variantDoc) throw new Error("Variant not found");
    const variantModelId = variantDoc.model || variantDoc.modelId || variantDoc.carModel;
    if (variantModelId && variantModelId.toString() !== model.toString()) {
      throw new Error("Selected variant does not belong to selected model");
    }
  }
};

/* ============================================================
   MEDIA UPLOAD
============================================================ */
const uploadCarMedia = async (files) => {
  const bannerImage = files?.banner?.length ? await uploadCarImage(files.banner[0], "cars/banner") : null;
  const galleryImages = files?.gallery?.length ? await Promise.all(files.gallery.map((file) => uploadCarImage(file, "cars/gallery"))) : [];
  const audioNote = files?.audio?.length ? await uploadCarImage(files.audio[0], "cars/audio") : null;
  const videoFiles = [...(files?.video || []), ...(files?.videos || [])];
  const videos = videoFiles.length ? await Promise.all(videoFiles.map((file) => uploadCarImage(file, "cars/videos"))) : [];
  return { bannerImage, galleryImages, audioNote, videos };
};

const safeDeleteMedia = async (media) => {
  if (typeof media !== "string" || !media.trim()) return;
  try { await deleteCarImage(media); } catch (error) {
    console.error("MEDIA DELETE ERROR:", error.message);
  }
};

/* ============================================================
   GET /api/cars/brands — MASTER BRANDS
============================================================ */
router.get("/brands", async (req, res) => {
  try {
    const brands = await CarBrand.find({}).select("_id name logoUrl").sort({ name: 1 }).lean();
    return res.json({ success: true, count: brands.length, brands });
  } catch (error) {
    console.error("GET BRANDS ERROR:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to get brands" });
  }
});

/* ============================================================
   GET /api/cars/carmodels — ALL MODELS
============================================================ */
router.get("/carmodels", async (req, res) => {
  try {
    const models = await CarModel.find({}).select("_id brand title imageUrl").sort({ title: 1 }).lean();
    return res.json({ success: true, count: models.length, models });
  } catch (error) {
    console.error("GET MODELS ERROR:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to get models" });
  }
});

/* ============================================================
   GET /api/cars/features — MASTER FEATURES
============================================================ */
router.get("/features", async (req, res) => {
  try {
    return res.json({ success: true, count: CAR_FEATURES.length, features: CAR_FEATURES });
  } catch (error) {
    console.error("GET FEATURES ERROR:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to get features" });
  }
});

/* ============================================================
   GET /api/cars/carmodels/brand/:brandId
============================================================ */
router.get("/carmodels/brand/:brandId", async (req, res) => {
  try {
    const { brandId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(brandId)) return res.status(400).json({ success: false, message: "Invalid brand id" });
    const models = await CarModel.find({ brand: brandId }).select("_id brand title imageUrl").sort({ title: 1 }).lean();
    return res.json({ success: true, count: models.length, models });
  } catch (error) {
    console.error("GET MODELS BY BRAND ERROR:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to get models by brand" });
  }
});

/* ============================================================
   GET /api/cars/carvariants — ALL VARIANTS
============================================================ */
router.get("/carvariants", async (req, res) => {
  try {
    const variants = await CarVariant.find({}).select("_id carModel title imageUrl").sort({ title: 1 }).lean();
    return res.json({ success: true, count: variants.length, variants });
  } catch (error) {
    console.error("GET VARIANTS ERROR:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to get variants" });
  }
});

/* ============================================================
   GET /api/cars/carvariants/model/:modelId
============================================================ */
router.get("/carvariants/model/:modelId", async (req, res) => {
  try {
    const { modelId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(modelId)) return res.status(400).json({ success: false, message: "Invalid model id" });
    const variants = await CarVariant.find({ carModel: modelId }).select("_id carModel title imageUrl").sort({ title: 1 }).lean();
    return res.json({ success: true, count: variants.length, variants });
  } catch (error) {
    console.error("GET VARIANTS BY MODEL ERROR:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to get variants by model" });
  }
});

/* ============================================================
   GET /api/cars/carvariants/brand/:brandId
============================================================ */
router.get("/carvariants/brand/:brandId", async (req, res) => {
  try {
    const { brandId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(brandId)) return res.status(400).json({ success: false, message: "Invalid brand id" });
    const models = await CarModel.find({ brand: brandId }).select("_id").lean();
    const modelIds = models.map((item) => item._id);
    const variants = modelIds.length
      ? await CarVariant.find({ carModel: { $in: modelIds } }).select("_id carModel title imageUrl").sort({ title: 1 }).lean()
      : [];
    return res.json({ success: true, count: variants.length, variants });
  } catch (error) {
    console.error("GET VARIANTS BY BRAND ERROR:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to get variants by brand" });
  }
});

/* ============================================================
   ✅ GET /api/cars/similar/:carId — SIMILAR CARS (SAME BRAND + MODEL)
============================================================ */
/* ============================================================
   ✅ SIMILAR CARS — SAME BRAND + SAME MODEL (Exclude Current Car)
============================================================ */
router.get("/similar/:carId", verifyTokenOptional, async (req, res) => {
  try {
    const { carId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(carId)) return res.status(400).json({ success: false, message: "Invalid car id" });

    // Get current car's brand and model
    const currentCar = await Car.findById(carId).select("brand model").lean();
    if (!currentCar) return res.status(404).json({ success: false, message: "Car not found" });

    // Filter: Exclude current car, Match Brand & Model
    const filter = {
      _id: { $ne: carId },
      status: { $nin: ["draft", "delete_requested"] },
    };
    if (currentCar.brand) filter.brand = currentCar.brand;
    if (currentCar.model) filter.model = currentCar.model;

    const cars = await Car.find(filter).sort({ createdAt: -1 }).lean();

    // Populate brand, model, variant details
    const brandIds = [...new Set(cars.map((c) => (c.brand ? c.brand.toString() : null)).filter(Boolean))];
    const modelIds = [...new Set(cars.map((c) => (c.model ? c.model.toString() : null)).filter(Boolean))];
    const variantIds = [...new Set(cars.map((c) => (c.variant ? c.variant.toString() : null)).filter(Boolean))];

    const [brands, models, variants] = await Promise.all([
      CarBrand.find({ _id: { $in: brandIds } }).select("_id name logoUrl").lean(),
      CarModel.find({ _id: { $in: modelIds } }).select("_id title imageUrl brand").lean(),
      CarVariant.find({ _id: { $in: variantIds } }).select("_id title imageUrl carModel").lean(),
    ]);

    const brandMap = new Map(brands.map((i) => [i._id.toString(), i]));
    const modelMap = new Map(models.map((i) => [i._id.toString(), i]));
    const variantMap = new Map(variants.map((i) => [i._id.toString(), i]));

    const isAdminUser = req.user && req.user.role === "admin";
    const responseCars = cars.map((car) => {
      const item = {
        ...car,
        brand: car.brand ? brandMap.get(car.brand.toString()) || car.brand : null,
        model: car.model ? modelMap.get(car.model.toString()) || car.model : null,
        variant: car.variant ? variantMap.get(car.variant.toString()) || car.variant : null,
      };
      prepareSellerForResponse(item, isAdminUser);
      return item;
    });

    return res.json({ success: true, count: responseCars.length, cars: responseCars });
  } catch (error) {
    console.error("SIMILAR CARS ERROR:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch similar cars" });
  }
});
/* ============================================================
   GET /api/cars — ALL PUBLIC CARS (MULTI FILTER)
============================================================ */
router.get("/", verifyTokenOptional, async (req, res) => {
  try {
    const {
      brand, model, variant, status, district, city,
      fuel, transmission, owner, board, insurance, features, search,
      minPrice, maxPrice, minYear, maxYear,
      registrationState, registrationNumber,
    } = req.query;

    const filter = {};

    const brandIds = parseObjectIds(brand);
    const modelIds = parseObjectIds(model);
    const variantIds = parseObjectIds(variant);

    if (brandIds.length) filter.brand = { $in: brandIds };
    if (modelIds.length) filter.model = { $in: modelIds };
    if (variantIds.length) filter.variant = { $in: variantIds };

    if (status) {
      filter.status = status;
    } else if (!req.user || req.user.role !== "admin") {
      filter.status = { $nin: ["draft", "delete_requested"] };
    }

    const fuelList = parseMultiValues(fuel);
    if (fuelList.length) filter.fuel = { $in: fuelList };

    const ownerList = parseMultiValues(owner);
    if (ownerList.length) filter.owner = { $in: ownerList };

    const transmissionList = parseMultiValues(transmission);
    if (transmissionList.length) filter.transmission = { $in: transmissionList };

    const boardList = parseMultiValues(board);
    if (boardList.length) filter.board = { $in: boardList };

    const districtList = parseMultiValues(district);
    if (districtList.length) filter.district = { $in: districtList };

    const cityList = parseMultiValues(city);
    if (cityList.length) filter.city = { $in: cityList };

    const insuranceList = parseMultiValues(insurance);
    if (insuranceList.length) filter.insurance = { $in: insuranceList };

    if (features) {
      const featureList = parseFeatures(features);
      if (featureList.length) filter.features = { $in: featureList };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice !== undefined && minPrice !== "") filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined && maxPrice !== "") filter.price.$lte = Number(maxPrice);
    }

    if (minYear || maxYear) {
      filter.year = {};
      if (minYear !== undefined && minYear !== "") filter.year.$gte = Number(minYear);
      if (maxYear !== undefined && maxYear !== "") filter.year.$lte = Number(maxYear);
    }

    if (registrationState) filter.registrationState = String(registrationState).trim().toUpperCase();
    if (registrationNumber) filter.registrationNumber = String(registrationNumber).trim();

    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: "i" } },
        { district: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    const cars = await Car.find(filter).sort({ createdAt: -1 }).lean();

    const brandIdsFromCars = [...new Set(cars.map((car) => (car.brand ? car.brand.toString() : null)).filter(Boolean))];
    const modelIdsFromCars = [...new Set(cars.map((car) => (car.model ? car.model.toString() : null)).filter(Boolean))];
    const variantIdsFromCars = [...new Set(cars.map((car) => (car.variant ? car.variant.toString() : null)).filter(Boolean))];

    const [brands, models, variants] = await Promise.all([
      CarBrand.find({ _id: { $in: brandIdsFromCars } }).select("_id name logoUrl").lean(),
      CarModel.find({ _id: { $in: modelIdsFromCars } }).select("_id title imageUrl brand").lean(),
      CarVariant.find({ _id: { $in: variantIdsFromCars } }).select("_id title imageUrl carModel").lean(),
    ]);

    const brandMap = new Map(brands.map((item) => [item._id.toString(), item]));
    const modelMap = new Map(models.map((item) => [item._id.toString(), item]));
    const variantMap = new Map(variants.map((item) => [item._id.toString(), item]));

    const isAdminUser = req.user && req.user.role === "admin";

    const responseCars = cars.map((car) => {
      const item = {
        ...car,
        brand: car.brand ? brandMap.get(car.brand.toString()) || car.brand : null,
        model: car.model ? modelMap.get(car.model.toString()) || car.model : null,
        variant: car.variant ? variantMap.get(car.variant.toString()) || car.variant : null,
      };
      prepareSellerForResponse(item, isAdminUser);
      return item;
    });

    return res.json({ success: true, count: responseCars.length, cars: responseCars });
  } catch (error) {
    console.error("GET CARS FILTER ERROR:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch cars" });
  }
});

/* ============================================================
   PUT /api/cars/:id/request-delete
============================================================ */
router.put("/:id/request-delete", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid car id" });
    const car = await Car.findById(id);
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });
    const isOwner = car.createdBy && car.createdBy.toString() === req.user.id.toString();
    const isSeller = car.sellerUser && car.sellerUser.toString() === req.user.id.toString();
    if (!isOwner && !isSeller) return res.status(403).json({ success: false, message: "You are not allowed to delete this car" });
    car.status = "delete_requested";
    await car.save();
    return res.json({ success: true, message: "Car delete request submitted", carId: car._id, status: car.status });
  } catch (error) {
    console.error("REQUEST DELETE CAR ERROR:", error);
    return res.status(400).json({ success: false, message: error.message || "Failed to request car deletion" });
  }
});

/* ============================================================
   GET /api/cars/my
============================================================ */
router.get("/my", verifyToken, async (req, res) => {
  try {
    const cars = await Car.find({ $or: [{ createdBy: req.user.id }, { sellerUser: req.user.id }] })
      .populate("brand", "_id name logoUrl")
      .populate("model", "_id brand title imageUrl")
      .populate("variant", "_id carModel title imageUrl")
      .sort({ createdAt: -1 })
      .lean();

    const responseCars = cars.map((car) => {
      const item = { ...car };
      if (typeof item.seller === "string" && item.seller.includes(":")) {
        try { item.seller = decryptSeller(item.seller); } catch (_) {}
      }
      return item;
    });

    return res.json({ success: true, count: responseCars.length, cars: responseCars });
  } catch (error) {
    console.error("Get my cars error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to get my cars" });
  }
});

/* ============================================================
   GET /api/cars/my-cars
============================================================ */
router.get("/my-cars", verifyToken, async (req, res) => {
  try {
    const cars = await Car.find({ $or: [{ createdBy: req.user.id }, { sellerUser: req.user.id }] })
      .populate("brand", "_id name logoUrl")
      .populate("model", "_id brand title imageUrl")
      .populate("variant", "_id carModel title imageUrl")
      .sort({ createdAt: -1 })
      .lean();
    const result = cars.map((car) => prepareSellerForResponse(car, false));
    return res.json({ success: true, count: result.length, cars: result });
  } catch (error) {
    console.error("GET MY CARS ERROR:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to get user cars" });
  }
});

/* ============================================================
   POST /api/cars/user-add and /api/cars/
============================================================ */
router.post(
  ["/user-add", "/"],
  verifyToken,
  uploadCar.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
    { name: "audio", maxCount: 1 },
    { name: "video", maxCount: 10 },
    { name: "videos", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const {
        brand, model, variant, videoLink,
        registrationState, registrationNumber,
        year, price, km,
        serviceRecord, csrKm, stig,
        color, fuel, transmission, owner, board, insurance,
        status, seller, sellerUser, sellerinfo,
        district, city, description, features,
      } = req.body;

      await validateCarHierarchy(brand, model || null, variant || null);

      const registration = validateRegistration(registrationState, registrationNumber);

      const carData = {
        ...req.body,
        brand,
        model: model || null,
        variant: variant || null,
        videoLink: videoLink || req.body.videoLink || null,
        registrationState: registration.registrationState,
        registrationNumber: registration.registrationNumber,
        year, price, km,
        serviceRecord: serviceRecord || null,
        csrKm: csrKm === "" || csrKm === undefined ? null : csrKm,
        stig: stig || null,
        color: color || null,
        features: parseFeatures(features),
        fuel, transmission, owner, board,
        insurance: insurance || null,
        status: status || "draft",
        seller: seller && String(seller).trim() ? encryptSeller(String(seller).trim()) : null,
        sellerUser: sellerUser || req.user.id,
        sellerinfo: sellerinfo || null,
        district,
        city: city || null,
        description: description || null,
        createdBy: req.user.id,
      };

      const { bannerImage, galleryImages, audioNote, videos } = await uploadCarMedia(req.files);

      carData.bannerImage = bannerImage;
      carData.galleryImages = galleryImages;
      carData.audioNote = audioNote;
      carData.videos = videos;

      const car = await Car.create(carData);

      const responseCar = car.toObject();
      prepareSellerForResponse(responseCar, false);

      return res.status(201).json({ success: true, message: "Car created successfully", car: responseCar });
    } catch (error) {
      console.error("User create car error:", error);
      return res.status(400).json({ success: false, message: error.message || "Failed to create car" });
    }
  }
);

/* ============================================================
   GET /api/cars/:id
============================================================ */
router.get("/:id", verifyTokenOptional, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid car id" });

    const car = await Car.findById(id)
      .populate("brand", "_id name logoUrl")
      .populate("model", "_id brand title imageUrl")
      .populate("variant", "_id carModel title imageUrl")
      .lean();

    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const isAdminUser = !!req.user && req.user.role === "admin";

    if (!isAdminUser && (car.status === "draft" || car.status === "delete_requested")) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    prepareSellerForResponse(car, isAdminUser);

    return res.json({ success: true, car });
  } catch (error) {
    console.error("GET CAR BY ID ERROR:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to get car" });
  }
});

/* ============================================================
   PUT /api/cars/:id
============================================================ */
router.put(
  "/:id",
  verifyToken,
  uploadCar.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 20 },
    { name: "audio", maxCount: 1 },
    { name: "video", maxCount: 10 },
    { name: "videos", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid car id" });

      const car = await Car.findById(id);
      if (!car) return res.status(404).json({ success: false, message: "Car not found" });

      const isAdminUser = req.user.role === "admin";
      const isOwner = car.createdBy && car.createdBy.toString() === req.user.id.toString();
      const isSeller = car.sellerUser && car.sellerUser.toString() === req.user.id.toString();

      if (!isAdminUser && !isOwner && !isSeller) {
        return res.status(403).json({ success: false, message: "You are not allowed to update this car" });
      }

      const { brand, model, variant } = req.body;

      const nextBrand = brand || car.brand;
      const nextModel = model === undefined ? car.model : model || null;
      const nextVariant = model !== undefined && !model ? null : variant === undefined ? car.variant : variant || null;

      await validateCarHierarchy(nextBrand, nextModel, nextVariant);

      const updateData = { ...req.body, brand: nextBrand, model: nextModel, variant: nextVariant };

      if (req.body.features !== undefined) updateData.features = parseFeatures(req.body.features);

      if (updateData.seller !== undefined) {
        updateData.seller = updateData.seller && String(updateData.seller).trim()
          ? encryptSeller(String(updateData.seller).trim())
          : null;
      }

      if (req.body.csrKm === "") updateData.csrKm = null;
      if (req.body.serviceRecord === "") updateData.serviceRecord = null;
      if (req.body.insurance === "") updateData.insurance = null;
      if (req.body.stig === "") updateData.stig = null;
      if (req.body.city === "") updateData.city = null;
      if (req.body.description === "") updateData.description = null;

      const registration = validateRegistration(
        req.body.registrationState !== undefined ? req.body.registrationState : car.registrationState,
        req.body.registrationNumber !== undefined ? req.body.registrationNumber : car.registrationNumber
      );

      updateData.registrationState = registration.registrationState;
      updateData.registrationNumber = registration.registrationNumber;

      if (req.files?.banner?.length) {
        if (car.bannerImage) await safeDeleteMedia(car.bannerImage);
        updateData.bannerImage = await uploadCarImage(req.files.banner[0], "cars/banner");
      }

      let existingGallery = [];
      if (req.body.existingGallery) {
        try {
          existingGallery = JSON.parse(req.body.existingGallery);
          if (!Array.isArray(existingGallery)) existingGallery = [];
        } catch (_) { existingGallery = []; }
      } else {
        existingGallery = Array.isArray(car.galleryImages)
          ? car.galleryImages.filter((item) => typeof item === "string" && item.trim())
          : [];
      }

      if (req.files?.gallery?.length) {
        const newGallery = await Promise.all(req.files.gallery.map((file) => uploadCarImage(file, "cars/gallery")));
        const oldGallery = Array.isArray(car.galleryImages) ? car.galleryImages : [];
        for (const oldImage of oldGallery) {
          if (typeof oldImage === "string" && oldImage.trim() && !existingGallery.includes(oldImage)) {
            await safeDeleteMedia(oldImage);
          }
        }
        updateData.galleryImages = [...existingGallery, ...newGallery];
      } else {
        const oldGallery = Array.isArray(car.galleryImages) ? car.galleryImages : [];
        for (const oldImage of oldGallery) {
          if (typeof oldImage === "string" && oldImage.trim() && !existingGallery.includes(oldImage)) {
            await safeDeleteMedia(oldImage);
          }
        }
        updateData.galleryImages = existingGallery;
      }

      if (req.files?.audio?.length) {
        if (car.audioNote) await safeDeleteMedia(car.audioNote);
        updateData.audioNote = await uploadCarImage(req.files.audio[0], "cars/audio");
      }

      const videoFiles = [...(req.files?.video || []), ...(req.files?.videos || [])];
      let existingVideos = [];
      if (req.body.existingVideos) {
        try {
          existingVideos = JSON.parse(req.body.existingVideos);
          if (!Array.isArray(existingVideos)) existingVideos = [];
        } catch (_) { existingVideos = []; }
      } else {
        existingVideos = Array.isArray(car.videos)
          ? car.videos.filter((item) => typeof item === "string" && item.trim())
          : [];
      }

      if (videoFiles.length) {
        const newVideos = await Promise.all(videoFiles.map((video) => uploadCarImage(video, "cars/videos")));
        const oldVideos = Array.isArray(car.videos) ? car.videos : [];
        for (const oldVideo of oldVideos) {
          if (typeof oldVideo === "string" && oldVideo.trim() && !existingVideos.includes(oldVideo)) {
            await safeDeleteMedia(oldVideo);
          }
        }
        updateData.videos = [...existingVideos, ...newVideos];
      } else {
        const oldVideos = Array.isArray(car.videos) ? car.videos : [];
        for (const oldVideo of oldVideos) {
          if (typeof oldVideo === "string" && oldVideo.trim() && !existingVideos.includes(oldVideo)) {
            await safeDeleteMedia(oldVideo);
          }
        }
        updateData.videos = existingVideos;
      }

      const updatedCar = await Car.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
        .populate("brand", "_id name logoUrl")
        .populate("model", "_id brand title imageUrl")
        .populate("variant", "_id carModel title imageUrl")
        .lean();

      prepareSellerForResponse(updatedCar, isAdminUser);

      return res.json({ success: true, message: "Car updated successfully", car: updatedCar });
    } catch (error) {
      console.error("UPDATE CAR ERROR:", error);
      return res.status(400).json({ success: false, message: error.message || "Failed to update car" });
    }
  }
);

export default router;