import express from "express";
import * as payslipController from "../controllers/payslipController.js";
import authorization from "../middlewares/authorizationMiddleware.js";
import authenticate from "../middlewares/jwtMiddlewares.js";

const router = express.Router();
router.post(
	"/",
	authenticate,
	authorization(["user", "admin"]),
	payslipController.create
);

router.get(
	"/",
	authenticate,
	authorization(["user", "admin"]),
	payslipController.getAllByOwner
);

router.get(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	payslipController.getById
);

router.put(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	payslipController.update
);

router.delete(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	payslipController.remove
);
export default router;
