import express from "express";
import * as easyInvoiceController from "../controllers/easyInvoiceController.js";
import authorization from "../middlewares/authorizationMiddleware.js";
import authenticate from "../middlewares/jwtMiddlewares.js";

const router = express.Router();

router.post(
	"/getInvoiceByArisingDateRange",
	authenticate,
	authorization(["user", "admin"]),
	easyInvoiceController.getInvoiceByArisingDateRange,
);

router.post(
	"/importInvoice",
	authenticate,
	authorization(["user", "admin"]),
	easyInvoiceController.importInvoice,
);

router.post(
	"/import-and-issue-invoice",
	authenticate,
	authorization(["user", "admin"]),
	easyInvoiceController.importAndIssueInvoice,
);

router.post(
	"/cancel-invoice",
	authenticate,
	authorization(["user", "admin"]),
	easyInvoiceController.cancelInvoice,
);

router.post(
	"/remove-unsigned-invoice",
	authenticate,
	authorization(["user", "admin"]),
	easyInvoiceController.removeUnsignedInvoice,
);

router.post(
	"/adjustInvoice",
	authenticate,
	authorization(["user", "admin"]),
	easyInvoiceController.adjustInvoice,
);

router.get(
	"/getInvoiceAuto",
	authenticate,
	authorization(["user", "admin"]),
	easyInvoiceController.getInvoiceAuto,
);

router.post("/viewInvoice", authenticate, easyInvoiceController.viewInvoice);

export default router;
