"use strict";

import * as storageItemService from "../services/storageItemService.js";
import InvoicesInService from "../services/invoicesInService.js";
import { StatusCodes } from "http-status-codes";

import { getBusinessOwnerByUserId } from "../services/businessOwnerService.js";

const create = async (req, res, next) => {
	try {
		// Assume req.user._id is set by auth middleware
		const userId = req.user.userId;
		console.log("User ID:", userId); // Debugging line
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}
		const result = await storageItemService.createStorageItem(
			req.body,
			owner._id
		);
		res.status(StatusCodes.CREATED).json(result);
	} catch (err) {
		next(err);
	}
};

const getById = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}
		const result = await storageItemService.getStorageItemById(
			req.params.id,
			owner._id
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const list = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}
		const { page, limit, sortBy, sortOrder, ...filter } = req.query;
		const options = {
			page: parseInt(page) || 1,
			limit: parseInt(limit) || 10,
			sortBy: sortBy || "createdAt",
			sortOrder: sortOrder ? parseInt(sortOrder) : -1,
		};
		const result = await storageItemService.listStorageItems(
			owner._id,
			filter,
			options
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const listStorageItems = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}
		const { page, limit, sortBy, sortOrder, ...filter } = req.query;
		const options = {
			page: parseInt(page) || 1,
			limit: parseInt(limit) || 10,
			sortBy: sortBy || "createdAt",
			sortOrder: sortOrder ? parseInt(sortOrder) : -1,
		};
		const syncedFilter = { ...filter, syncStatus: true };
		const result = await storageItemService.listStorageItems(
			owner._id,
			syncedFilter,
			options
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const listNewSyncItem = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}
		const { page, limit, sortBy, sortOrder, ...filter } = req.query;
		const options = {
			page: parseInt(page) || 1,
			limit: parseInt(limit) || 10,
			sortBy: sortBy || "createdAt",
			sortOrder: sortOrder ? parseInt(sortOrder) : -1,
		};
		const newSyncFilter = { ...filter, syncStatus: false };
		const result = await storageItemService.listStorageItems(
			owner._id,
			newSyncFilter,
			options
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const update = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}
		const result = await storageItemService.updateStorageItem(
			req.params.id,
			req.body,
			owner._id
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const remove = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}
		const result = await storageItemService.deleteStorageItem(
			req.params.id,
			owner._id
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const namesAndUnits = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);

		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}

		const items = await storageItemService.listStorageItems(
			owner._id,
			{},
			{ limit: 1000 }
		);
		const names = items.data.map((item) => item.name);
		const units = [...new Set(items.data.map((item) => item.unit))];

		res.status(StatusCodes.OK).json({ names, units });
	} catch (err) {
		next(err);
	}
};

const syncStorageItems = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		const invoices = await InvoicesInService.getInvoices({
			isStorageSynced: false,
		});

		let successCount = 0;
		let failCount = 0;

		for (const invoice of invoices) {
			if (Array.isArray(invoice.hdhhdvu)) {
				for (const item of invoice.hdhhdvu) {
					const data = {
						name: item.ten,
						stock: item.sluong,
						unit: item.dvtinh,
						price: item.dgia,
					};
					try {
						const existingItems = await storageItemService.listStorageItems(
							owner._id, // <-- FIXED: owner._id first
							{ name: data.name }, // filter
							{ limit: 1 } // options
						);

						if (existingItems.data.length > 0) {
							const existingItem = existingItems.data[0];
							await storageItemService.updateStorageItem(
								existingItem._id,
								{ stock: existingItem.stock + data.stock },
								owner._id
							);
						} else {
							await storageItemService.createStorageItem(data, owner._id);
						}
						successCount++;
					} catch (err) {
						failCount++;
						console.error("Sync failed for item:", data, err);
					}
				}
			}
			// Đánh dấu hóa đơn đã sync
			try {
				await InvoicesInService.updateInvoice(invoice._id, {
					isStorageSynced: true,
				});
			} catch (err) {
				console.error(
					"Không thể cập nhật trạng thái đồng bộ cho hóa đơn:",
					invoice._id,
					err
				);
			}
		}

		res.status(200).json({
			message: "Storage items synced successfully",
			successCount,
			failCount,
		});
	} catch (error) {
		next(error);
	}
};

const genTypeItem = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}
		if (!req.body.category) {
			return res
				.status(StatusCodes.BAD_REQUEST)
				.json({ message: "Missing category" });
		}
		const result = await storageItemService.generateTypeItems(
			req.params.id,
			req.body,
			owner._id
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const updateUnitConversion = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}

		const { from, to } = req.body;

		// Validate required fields
		if (!from || !to) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "Missing required fields: from, to",
			});
		}

		// Validate from object
		if (!from.itemQuantity) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "from must contain itemQuantity",
			});
		}

		// Validate to is array
		if (!Array.isArray(to) || to.length === 0) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "to must be a non-empty array of conversion units",
			});
		}

		// Validate each item in to array
		for (let i = 0; i < to.length; i++) {
			const toItem = to[i];
			if (!toItem.itemName || !toItem.itemQuantity) {
				return res.status(StatusCodes.BAD_REQUEST).json({
					message: `to[${i}] must contain itemName and itemQuantity`,
				});
			}

			if (typeof toItem.itemQuantity !== "number" || toItem.itemQuantity <= 0) {
				return res.status(StatusCodes.BAD_REQUEST).json({
					message: `to[${i}].itemQuantity must be a positive number`,
				});
			}
		}

		// Validate from quantity
		if (typeof from.itemQuantity !== "number" || from.itemQuantity <= 0) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "from.itemQuantity must be a positive number",
			});
		}

		const conversionData = {
			from,
			to,
		};

		const result = await storageItemService.updateUnitConversion(
			req.params.id,
			conversionData,
			owner._id
		);

		res.status(StatusCodes.OK).json({
			message: "Unit conversion updated successfully",
			data: result,
		});
	} catch (err) {
		next(err);
	}
};

const getIdByName = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}
		const { name } = req.body;
		if (!name) {
			return res
				.status(StatusCodes.BAD_REQUEST)
				.json({ message: "Name parameter is required" });
		}
		const result = await storageItemService.getStorageItemIdByName(
			name,
			owner._id
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const getByIdFromBody = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}
		const { id } = req.params;
		if (!id) {
			return res
				.status(StatusCodes.BAD_REQUEST)
				.json({ message: "ID parameter is required" });
		}
		const result = await storageItemService.getStorageItemByIdFromBody(
			id,
			owner._id
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

export {
	create,
	getById,
	list,
	listStorageItems,
	listNewSyncItem,
	update,
	remove,
	namesAndUnits,
	syncStorageItems,
	genTypeItem,
	updateUnitConversion,
	getIdByName,
	getByIdFromBody,
};
