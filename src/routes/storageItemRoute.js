import express from "express";
import * as storageItemController from "../controllers/storageItemController.js";
import authorization from "../middlewares/authorizationMiddleware.js";
import authenticate from "../middlewares/jwtMiddlewares.js";

const router = express.Router();

router.post(
	"/",
	authenticate,
	authorization(["user", "admin"]),
	storageItemController.create
);
router.get(
	"/",
	authenticate,
	authorization(["user", "admin"]),
	storageItemController.list
);
router.get(
	"/synced",
	authenticate,
	authorization(["user", "admin"]),
	storageItemController.listStorageItems
);
router.get(
	"/new-sync",
	authenticate,
	authorization(["user", "admin"]),
	storageItemController.listNewSyncItem
);
router.get(
	"/names-units",
	authenticate,
	authorization(["user", "admin"]),
	storageItemController.namesAndUnits
);
router.post(
	"/id-by-name",
	authenticate,
	authorization(["user", "admin"]),
	storageItemController.getIdByName
);
router.get(
	"/get-by-id/:id",
	authenticate,
	authorization(["user", "admin"]),
	storageItemController.getByIdFromBody
);
router.get(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	storageItemController.getById
);
router.put(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	storageItemController.update
);

router.post(
	"/sync-from-invoices",
	authenticate,
	authorization(["user", "admin"]),
	storageItemController.syncStorageItems
);

router.post(
	"/:id/gen-type",
	authenticate,
	authorization(["user", "admin"]),
	storageItemController.genTypeItem
);

router.put(
	"/:id/unit-conversion",
	authenticate,
	authorization(["user", "admin"]),
	storageItemController.updateUnitConversion
);

router.delete(
	"/:id",
	authenticate,
	authorization(["user", "admin"]),
	storageItemController.remove
);

export default router;
