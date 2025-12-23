"use strict";

import express from "express";
import * as productController from "../controllers/productController.js";
import authorization from "../middlewares/authorizationMiddleware.js";
import authenticate from "../middlewares/jwtMiddlewares.js";

const router = express.Router();

router.post(
	"/",
	authenticate,
	authorization(["user", "admin"]),
	productController.create
);

router.get(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	productController.getById
);

router.put(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	productController.update
);

router.delete(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	productController.remove
);

router.get("/", authenticate, productController.listMyProducts);

export default router;
