import express from "express";
import * as easyInvoiceController from "../controllers/easyInvoiceController.js";
import authorization from "../middlewares/authorizationMiddleware.js";
import authenticate from "../middlewares/jwtMiddlewares.js";

const router = express.Router();

router.post(
	"/getInvoiceByArisingDateRange",
	authenticate,
	authorization(["user", "admin"]),
	easyInvoiceController.getInvoiceByArisingDateRange
);

router.post(
	"/importInvoice",
	authenticate,
	authorization(["user", "admin"]),
	easyInvoiceController.importInvoice
);

router.post(
	"/import-and-issue-invoice",
	authenticate,
	authorization(["user", "admin"]),
	easyInvoiceController.importAndIssueInvoice
);

router.post(
	"/cancel-invoice",
	authenticate,
	authorization(["user", "admin"]),
	easyInvoiceController.cancelInvoice
);

export default router;
