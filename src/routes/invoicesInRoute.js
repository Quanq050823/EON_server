import express from "express";
import {
	syncInvoicesFromThirdParty,
	syncListInvoicesDetailsFromThirdParty,
	createInvoice,
	getInvoices,
	getInvoiceById,
	updateInvoice,
	deleteInvoice,
	getInvoiceDetailFromThirdParty,
} from "../controllers/invoicesInController.js";
import authorization from "../middlewares/authorizationMiddleware.js";
import authenticate from "../middlewares/jwtMiddlewares.js";
import auth from "../middlewares/jwtMiddlewares.js";
import * as invoicesInController from "../controllers/invoicesInController.js";

const router = express.Router();

router.post("/", authenticate, authorization(["user", "admin"]), createInvoice);
router.get("/", authenticate, authorization(["user", "admin"]), getInvoices);
// Route lấy chi tiết hóa đơn từ API bên thứ 3 (đặt trước route :id để tránh lỗi ObjectId)
router.get(
	"/invoice-detail",
	authenticate,
	authorization(["user", "admin"]),
	getInvoiceDetailFromThirdParty
);
// Route test Postman đồng bộ hóa đơn từ API bên thứ 3
router.post(
	"/sync-from-third-party",
	authenticate,
	authorization(["user", "admin"]),
	syncInvoicesFromThirdParty
);
router.post(
	"/sync-list-invoice-detail",
	authenticate,
	authorization(["user", "admin"]),
	syncListInvoicesDetailsFromThirdParty
);
router.get(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	getInvoiceById
);
router.put(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	updateInvoice
);
router.delete(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	deleteInvoice
);

export default router;
