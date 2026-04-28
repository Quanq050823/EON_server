import express from "express";
import { searchBarcodeViaSerpApi } from "../controllers/barcodeController.js";

const router = express.Router();

// GET /api/barcode/search/:barcode — no auth required (public product lookup)
router.get("/search/:barcode", searchBarcodeViaSerpApi);

export default router;
