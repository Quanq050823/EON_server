"use strict";

import express from "express";
import * as accountantController from "../controllers/accountantController.js";
import authorization from "../middlewares/authorizationMiddleware.js";
import authenticate from "../middlewares/jwtMiddlewares.js";

const router = express.Router();

router.post(
	"/",
	authenticate,
	authorization(["user", "admin"]),
	accountantController.create
);

router.get(
	"/me",
	authenticate,
	authorization(["user", "admin"]),
	accountantController.getByUserId
);

router.get(
	"/:userId",
	authenticate,
	authorization(["admin"]),
	accountantController.getByUserId
);

router.put(
	"/",
	authenticate,
	authorization(["user", "admin"]),
	accountantController.update
);

router.delete(
	"/",
	authenticate,
	authorization(["user", "admin"]),
	accountantController.remove
);

router.get(
	"/",
	authenticate,
	authorization(["admin"]),
	accountantController.list
);

export default router;
