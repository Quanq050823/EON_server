"use strict";

import express from "express";
import * as businessOwnerController from "../controllers/businessOwnerController.js";
import authorization from "../middlewares/authorizationMiddleware.js";
import authenticate from "../middlewares/jwtMiddlewares.js";

const router = express.Router();

router.post(
	"/",
	authenticate,
	authorization(["user", "admin"]),
	businessOwnerController.create
);

router.get(
	"/me",
	authenticate,
	authorization(["user", "admin"]),
	businessOwnerController.getByUserId
);

router.get(
	"/tax-deadline",
	authenticate,
	authorization(["user", "admin"]),
	businessOwnerController.getTaxDeadline
);

router.get(
	"/:userId",
	authenticate,
	authorization(["admin"]),
	businessOwnerController.getByUserId
);

router.put(
	"/",
	authenticate,
	authorization(["user", "admin"]),
	businessOwnerController.update
);

router.delete(
	"/",
	authenticate,
	authorization(["user", "admin"]),
	businessOwnerController.remove
);

router.get(
	"/",
	authenticate,
	authorization(["admin"]),
	businessOwnerController.list
);

export default router;
