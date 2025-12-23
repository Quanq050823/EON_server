"use strict";

import express from "express";
import * as adminController from "../controllers/adminController.js";
import authorization from "../middlewares/authorizationMiddleware.js";
import authenticate from "../middlewares/jwtMiddlewares.js";

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorization(["admin"]));

// User Management Routes
router.get("/users", adminController.getAllUsers);
router.get("/users/:userId", adminController.getUserById);
router.post("/users", adminController.createUser);
router.put("/users/:userId", adminController.updateUser);
router.delete("/users/:userId", adminController.deleteUser);
router.patch("/users/:userId/role", adminController.updateUserRole);

// Business Owner Management Routes
router.get("/business-owners", adminController.getAllBusinessOwners);
router.get("/business-owners/:ownerId", adminController.getBusinessOwnerById);

// Accountant Management Routes
router.get("/accountants", adminController.getAllAccountants);
router.get("/accountants/:accountantId", adminController.getAccountantById);

// Statistics & Dashboard Routes
router.get("/stats/system", adminController.getSystemStats);
router.get("/stats/users", adminController.getUserStats);
router.get("/stats/invoices", adminController.getInvoiceStats);

export default router;
