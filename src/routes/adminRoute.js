"use strict";

import express from "express";
import * as adminController from "../controllers/adminController.js";
import * as invoiceSyncController from "../controllers/invoiceSyncController.js";
import authorization from "../middlewares/authorizationMiddleware.js";
import authenticate from "../middlewares/jwtMiddlewares.js";

const router = express.Router();

// All routes require authentication. Authorization is applied per resource.
router.use(authenticate);

const adminOnly = authorization(["admin"]);
const businessOwnerAccess = authorization(["admin", "user"]);

// User Management Routes
router.get("/users", adminOnly, adminController.getAllUsers);
router.get("/users/:userId", adminOnly, adminController.getUserById);
router.post("/users", adminOnly, adminController.createUser);
router.put("/users/:userId", adminOnly, adminController.updateUser);
router.delete("/users/:userId", adminOnly, adminController.deleteUser);
router.patch("/users/:userId/role", adminOnly, adminController.updateUserRole);

// Business Owner Management Routes
router.get("/business-owners", businessOwnerAccess, adminController.getAllBusinessOwners);
router.get("/business-owners/:ownerId", businessOwnerAccess, adminController.getBusinessOwnerById);
router.get(
	"/business-owners/:ownerId/invoices-in",
	businessOwnerAccess,
	adminController.getInvoicesInByBusinessOwner,
);
router.post(
	"/business-owners/:ownerId/invoice-sync/captcha",
	businessOwnerAccess,
	invoiceSyncController.getBusinessOwnerSyncCaptcha,
);
router.post(
	"/business-owners/:ownerId/invoice-sync",
	businessOwnerAccess,
	invoiceSyncController.syncBusinessOwnerInvoices,
);
router.get(
	"/business-owners/:ownerId/output-invoices",
	businessOwnerAccess,
	adminController.getOutputInvoicesByBusinessOwner,
);
router.get(
	"/business-owners/:ownerId/storage-items",
	businessOwnerAccess,
	adminController.getStorageItemsByBusinessOwner,
);
router.get(
	"/business-owners/:ownerId/storage-items/synced",
	businessOwnerAccess,
	adminController.getSyncedStorageItemsByBusinessOwner,
);
router.get(
	"/business-owners/:ownerId/storage-items/sync-history",
	businessOwnerAccess,
	adminController.getSyncHistoryByBusinessOwner,
);
router.get(
	"/business-owners/:ownerId/storage-items/stock-summary",
	businessOwnerAccess,
	adminController.getStockSummaryByBusinessOwner,
);
router.get(
	"/business-owners/:ownerId/storage-items/inventory-report",
	businessOwnerAccess,
	adminController.getInventoryReportByBusinessOwner,
);
router.post(
	"/business-owners/:ownerId/storage-items/opening-balance",
	businessOwnerAccess,
	adminController.upsertOpeningBalanceByBusinessOwner,
);
router.get(
	"/business-owners/:ownerId/storage-items/unclassified",
	businessOwnerAccess,
	adminController.getUnclassifiedStorageItemsByBusinessOwner,
);
router.post(
	"/business-owners/:ownerId/storage-items/:itemId/classify",
	businessOwnerAccess,
	adminController.classifyStorageItemByBusinessOwner,
);
router.put(
	"/business-owners/:ownerId/storage-items/:itemId/unit-conversion",
	businessOwnerAccess,
	adminController.updateStorageItemConversionByBusinessOwner,
);
router.get(
	"/business-owners/:ownerId/products",
	businessOwnerAccess,
	adminController.getProductsByBusinessOwner,
);
router.get(
	"/business-owners/:ownerId/tax-statistics",
	businessOwnerAccess,
	adminController.getTaxStatisticsByBusinessOwner,
);
router.get(
	"/business-owners/:ownerId/tax-deadline",
	businessOwnerAccess,
	adminController.getTaxDeadlineByBusinessOwner,
);
router.get(
	"/business-owners/:ownerId/easy-invoices",
	businessOwnerAccess,
	adminController.getEasyInvoicesByBusinessOwner,
);
router.post(
	"/business-owners/:ownerId/easy-invoices/view",
	businessOwnerAccess,
	adminController.viewInvoiceByBusinessOwner,
);
router.post(
	"/business-owners/:ownerId/easy-invoices/import-and-issue",
	businessOwnerAccess,
	adminController.importAndIssueInvoiceByBusinessOwner,
);

// Accountant Management Routes
router.get("/accountants", adminOnly, adminController.getAllAccountants);
router.get("/accountants/:accountantId", adminOnly, adminController.getAccountantById);

// Statistics & Dashboard Routes
router.get("/stats/system", adminOnly, adminController.getSystemStats);
router.get("/stats/users", adminOnly, adminController.getUserStats);
router.get("/stats/invoices", adminOnly, adminController.getInvoiceStats);

export default router;
