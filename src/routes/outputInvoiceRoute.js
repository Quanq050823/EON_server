"use strict";

import express from "express";
import * as outputInvoiceController from "../controllers/outputInvoiceController.js";
import authorization from "../middlewares/authorizationMiddleware.js";
import authenticate from "../middlewares/jwtMiddlewares.js";

const router = express.Router();

router.post(
	"/",
	authenticate,
	authorization(["user", "admin"]),
	outputInvoiceController.create
);

router.get(
	"/",
	authenticate,
	authorization(["user", "admin"]),
	outputInvoiceController.list
);

router.get(
	"/taxes/total",
	authenticate,
	authorization(["user", "admin"]),
	outputInvoiceController.getTotalTaxes
);

router.get(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	outputInvoiceController.getById
);

router.put(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	outputInvoiceController.update
);

router.delete(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	outputInvoiceController.remove
);

export default router;
