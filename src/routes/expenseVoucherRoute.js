"use strict";

import express from "express";
import * as expenseVoucherController from "../controllers/expenseVoucherController.js";
import authorization from "../middlewares/authorizationMiddleware.js";
import authenticate from "../middlewares/jwtMiddlewares.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorization(["user", "admin"]),
  expenseVoucherController.create
);

router.get(
  "/:id",
  authenticate,
  authorization(["user", "admin"]),
  expenseVoucherController.getById
);

router.put(
  "/:id",
  authenticate,
  authorization(["user", "admin"]),
  expenseVoucherController.update
);

router.delete(
  "/:id",
  authenticate,
  authorization(["user", "admin"]),
  expenseVoucherController.remove
);

router.get(
  "/",
  authenticate,
  authorization(["user", "admin"]),
  expenseVoucherController.list
);

export default router;
