import express from "express";
import * as employeeController from "../controllers/employeeController.js";
import authorization from "../middlewares/authorizationMiddleware.js";
import authenticate from "../middlewares/jwtMiddlewares.js";

const router = express.Router();
router.post(
	"/",
	authenticate,
	authorization(["user", "admin"]),
	employeeController.create
);

router.get(
	"/",
	authenticate,
	authorization(["user", "admin"]),
	employeeController.getAllByOwner
);

router.get(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	employeeController.getById
);

router.put(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	employeeController.update
);

router.delete(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	employeeController.remove
);
export default router;
