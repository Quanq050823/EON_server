"use strict";

import * as storageItemService from "../services/storageItemService.js";
import InvoicesInService from "../services/invoicesInService.js";
import { StatusCodes } from "http-status-codes";
import SyncHistory from "../models/SyncHistory.js";
import StockLog from "../models/StockLog.js";

import { getBusinessOwnerByUserId } from "../services/businessOwnerService.js";

const create = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}
		const result = await storageItemService.createStorageItem(
			req.body,
			owner._id,
		);
		// Lưu log tồn kho thủ công
		StockLog.create({
			businessOwnerId: owner._id,
			storageItemId: result._id,
			itemName: result.name,
			unit: result.unit,
			quantityChanged: result.stock ?? 0,
			stockAfter: result.stock ?? 0,
			pricePerUnit: result.price ?? 0,
			source: "manual_add",
			label: "Thêm tồn kho",
			triggeredBy: userId,
		}).catch((e) => console.error("StockLog create error:", e));
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
			owner._id,
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
			options,
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
			options,
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
			options,
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const TRACKED_FIELDS = ["name", "unit", "stock", "price"];

const buildChanges = (oldItem, body) => {
	const changes = [];
	for (const field of TRACKED_FIELDS) {
		if (body[field] !== undefined && String(body[field]) !== String(oldItem[field])) {
			changes.push({ field, oldValue: oldItem[field], newValue: body[field] });
		}
	}
	return changes;
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
		// Lấy doc cũ để so sánh
		const oldItem = await storageItemService.getStorageItemById(
			req.params.id,
			owner._id,
		);
		const result = await storageItemService.updateStorageItem(
			req.params.id,
			req.body,
			owner._id,
		);
		// Tính diff và lưu log
		const changes = oldItem ? buildChanges(oldItem, req.body) : [];
		if (changes.length > 0) {
			StockLog.create({
				businessOwnerId: owner._id,
				storageItemId: result._id,
				itemName: result.name,
				unit: result.unit,
				quantityChanged: req.body.stock,
				stockAfter: result.stock,
				pricePerUnit: result.price ?? 0,
				source: "manual_update",
				label: "Cập nhật tồn kho",
				changes,
				triggeredBy: userId,
			}).catch((e) => console.error("StockLog update error:", e));
		}
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
		const oldItem = await storageItemService.getStorageItemById(
			req.params.id,
			owner._id,
		);
		const result = await storageItemService.deleteStorageItem(
			req.params.id,
			owner._id,
		);
		if (oldItem) {
			StockLog.create({
				businessOwnerId: owner._id,
				storageItemId: oldItem._id,
				itemName: oldItem.name,
				unit: oldItem.unit,
				quantityChanged: oldItem.stock ?? 0,
				stockAfter: 0,
				pricePerUnit: oldItem.price ?? 0,
				source: "manual_delete",
				label: "Xoá khỏi kho",
				triggeredBy: userId,
			}).catch((e) => console.error("StockLog delete error:", e));
		}
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
			{ limit: 1000 },
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
		const syncedItems = [];
		const invoicesProcessed = [];

		for (const invoice of invoices) {
			invoicesProcessed.push(invoice.shdon || invoice._id?.toString());
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
							owner._id,
							{ name: data.name },
							{ limit: 1 },
						);

						let action = "created";
						if (existingItems.data.length > 0) {
							const existingItem = existingItems.data[0];
							await storageItemService.updateStorageItem(
								existingItem._id,
								{ stock: existingItem.stock + data.stock },
								owner._id,
							);
							action = "updated";
						} else {
							await storageItemService.createStorageItem(data, owner._id);
						}
						syncedItems.push({
							name: data.name,
							unit: data.unit,
							stock: data.stock,
							price: data.price,
							action,
							invoiceNumber: invoice.shdon || "",
							invoiceDate: invoice.ntao || invoice.createdAt,
							sellerName: invoice.nbten || "",
						});
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
					err,
				);
			}
		}

		// Lưu lịch sử đồng bộ
		if (syncedItems.length > 0 || failCount > 0) {
			await SyncHistory.create({
				businessOwnerId: owner._id,
				triggeredBy: userId,
				successCount,
				failCount,
				invoicesProcessed,
				items: syncedItems,
			});
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
			owner._id,
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
			owner._id,
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
			owner._id,
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
			owner._id,
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const getStockLogs = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}

		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 50;
		const skip = (page - 1) * limit;

		const [logs, total] = await Promise.all([
			StockLog.find({ businessOwnerId: owner._id })
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			StockLog.countDocuments({ businessOwnerId: owner._id }),
		]);

		res.status(StatusCodes.OK).json({
			data: logs,
			total,
			page,
			totalPages: Math.ceil(total / limit),
		});
	} catch (error) {
		next(error);
	}
};

const getStockSummary = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}

		const { startDate, endDate } = req.query;
		const matchStage = { businessOwnerId: owner._id };
		if (startDate || endDate) {
			matchStage.createdAt = {};
			if (startDate) matchStage.createdAt.$gte = new Date(startDate);
			if (endDate) matchStage.createdAt.$lte = new Date(endDate);
		}

		const pipeline = [
			{ $match: matchStage },
			{
				$addFields: {
					stockDelta: {
						$switch: {
							branches: [
								{ case: { $eq: ["$source", "manual_add"] }, then: { $ifNull: ["$quantityChanged", 0] } },
								{ case: { $eq: ["$source", "manual_delete"] }, then: { $multiply: [{ $ifNull: ["$quantityChanged", 0] }, -1] } },
							],
							default: 0,
						},
					},
				},
			},
			{
				$group: {
					_id: "$storageItemId",
					itemName: { $last: "$itemName" },
					unit: { $last: { $ifNull: ["$unit", ""] } },
					totalAdded: {
						$sum: { $cond: [{ $eq: ["$source", "manual_add"] }, { $ifNull: ["$quantityChanged", 0] }, 0] },
					},
					totalDeleted: {
						$sum: { $cond: [{ $eq: ["$source", "manual_delete"] }, { $ifNull: ["$quantityChanged", 0] }, 0] },
					},
					netChange: { $sum: "$stockDelta" },
					countAdd: { $sum: { $cond: [{ $eq: ["$source", "manual_add"] }, 1, 0] } },
					countUpdate: { $sum: { $cond: [{ $eq: ["$source", "manual_update"] }, 1, 0] } },
					countDelete: { $sum: { $cond: [{ $eq: ["$source", "manual_delete"] }, 1, 0] } },
					lastActivity: { $max: "$createdAt" },
				},
			},
			{
				$project: {
					_id: 0,
					storageItemId: { $toString: "$_id" },
					itemName: 1,
					unit: 1,
					totalAdded: 1,
					totalDeleted: 1,
					netChange: 1,
					countAdd: 1,
					countUpdate: 1,
					countDelete: 1,
					lastActivity: 1,
				},
			},
			{ $sort: { lastActivity: -1 } },
		];

		const summary = await StockLog.aggregate(pipeline);
		res.status(StatusCodes.OK).json({ data: summary });
	} catch (error) {
		next(error);
	}
};

const getSyncHistory = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}

		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 20;
		const skip = (page - 1) * limit;

		const [records, total] = await Promise.all([
			SyncHistory.find({ businessOwnerId: owner._id })
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			SyncHistory.countDocuments({ businessOwnerId: owner._id }),
		]);

		res.status(StatusCodes.OK).json({
			data: records,
			total,
			page,
			totalPages: Math.ceil(total / limit),
		});
	} catch (error) {
		next(error);
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
	getSyncHistory,
	getStockLogs,
	getStockSummary,
	genTypeItem,
	updateUnitConversion,
	getIdByName,
	getByIdFromBody,
};
