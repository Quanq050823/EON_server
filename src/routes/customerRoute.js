"use strict";

import express from "express";
import * as customerController from "../controllers/customerController.js";
import authorization from "../middlewares/authorizationMiddleware.js";
import authenticate from "../middlewares/jwtMiddlewares.js";

const router = express.Router();

router.post(
	"/",
	authenticate,
	authorization(["user", "admin"]),
	customerController.create
);

router.get(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	customerController.getById
);

router.put(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	customerController.update
);

router.delete(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	customerController.remove
);

router.get(
	"/list/paginated",
	authenticate,
	authorization(["user", "admin"]),
	customerController.list
);

router.get("/", authenticate, customerController.listMyCustomers);

router.get(
	"/stats/overview",
	authenticate,
	authorization(["user", "admin"]),
	customerController.getStats
);

router.get(
	"/search/query",
	authenticate,
	authorization(["user", "admin"]),
	customerController.search
);

export default router;
