import express from "express";
import {
	getCaptchaImage,
	loginWithCredentials,
} from "../controllers/invoiceSyncController.js";
import authenticate from "../middlewares/jwtMiddlewares.js";
import authorization from "../middlewares/authorizationMiddleware.js";

const router = express.Router();

router.post(
	"/captcha",
	authenticate,
	authorization(["user", "admin"]),
	getCaptchaImage
);

router.post(
	"/login",
	authenticate,
	authorization(["user", "admin"]),
	loginWithCredentials
);

export default router;
