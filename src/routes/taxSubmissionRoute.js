import express from "express";
import * as taxSubmissionController from "../controllers/taxSubmissionController.js";
import authorization from "../middlewares/authorizationMiddleware.js";
import authenticate from "../middlewares/jwtMiddlewares.js";

const router = express.Router();
router.post(
	"/",
	authenticate,
	authorization(["user", "admin"]),
	taxSubmissionController.create
);

router.get(
	"/",
	authenticate,
	authorization(["user", "admin"]),
	taxSubmissionController.getAllByOwner
);

router.get(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	taxSubmissionController.getById
);

router.put(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	taxSubmissionController.update
);

router.delete(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	taxSubmissionController.remove
);
export default router;
