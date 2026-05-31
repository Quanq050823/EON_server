"use strict";

import * as storageItemService from "../services/storageItemService.js";
import InvoicesInService from "../services/invoicesInService.js";
import { StatusCodes } from "http-status-codes";
import SyncHistory from "../models/SyncHistory.js";
import StockLog from "../models/StockLog.js";
import StorageItem from "../models/StorageItem.js";

import { getBusinessOwnerByUserId } from "../services/businessOwnerService.js";

const ACCOUNT_CODES = "1521,156,1561,155,002,152";

const toNumber = (value, fallback = 0) => {
	const num = Number(value);
	return Number.isFinite(num) ? num : fallback;
};

const getDayBounds = (startDate, endDate) => {
	if (!startDate || !endDate) {
		return null;
	}
	const start = new Date(startDate);
	const end = new Date(endDate);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
		return null;
	}
	start.setHours(0, 0, 0, 0);
	end.setHours(23, 59, 59, 999);
	return { start, end };
};

const getFullAddress = (owner) =>
	[
		owner?.address?.street,
		owner?.address?.ward,
		owner?.address?.district,
		owner?.address?.city,
	].filter(Boolean).join(", ");

const getDirection = (signedQuantity) => {
	if (signedQuantity > 0) return "in";
	if (signedQuantity < 0) return "out";
	return "neutral";
};

const getSignedQuantityFromLog = (log) => {
	if (log.signedQuantity !== undefined && log.signedQuantity !== null) {
		return toNumber(log.signedQuantity);
	}
	if (log.source === "manual_add" || log.source === "invoice_in") {
		return toNumber(log.quantityChanged);
	}
	if (log.source === "manual_delete" || log.source === "invoice_out") {
		return -toNumber(log.quantityChanged);
	}
	return 0;
};

const getLogDate = (log) => new Date(log.documentDate || log.createdAt);

const compareLogDateDesc = (a, b) => {
	const dateDiff = getLogDate(b) - getLogDate(a);
	if (dateDiff !== 0) return dateDiff;
	return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
};

const compareLogDateAsc = (a, b) => -compareLogDateDesc(a, b);

const isLogBefore = (log, date) => getLogDate(log) < date;

const isLogBetween = (log, startDate, endDate) => {
	const logDate = getLogDate(log);
	return logDate >= startDate && logDate <= endDate;
};

const getOpeningQuantityForPeriod = (itemLogs, startDate) => {
	const openingBalanceLogs = itemLogs
		.filter((log) => log.source === "opening_balance" && getLogDate(log) <= startDate)
		.sort(compareLogDateAsc);

	if (openingBalanceLogs.length > 0) {
		let openingQuantity = 0;
		let movementStartDate = getLogDate(openingBalanceLogs[0]);

		for (const log of openingBalanceLogs) {
			const signedQuantity = getSignedQuantityFromLog(log);
			if (signedQuantity === 0) {
				openingQuantity = toNumber(log.stockAfter);
				movementStartDate = getLogDate(log);
			} else {
				openingQuantity += signedQuantity;
			}
		}

		const movementAfterOpeningBeforePeriod = itemLogs
			.filter((log) => {
				const logDate = getLogDate(log);
				const isReportable = log.reportable === true || log.reportable === undefined;
				return isReportable && logDate > movementStartDate && logDate < startDate;
			})
			.reduce((sum, log) => sum + getSignedQuantityFromLog(log), 0);

		return openingQuantity + movementAfterOpeningBeforePeriod;
	}

	const openingLog = itemLogs
		.filter((log) => isLogBefore(log, startDate))
		.sort(compareLogDateDesc)[0];

	return toNumber(openingLog?.stockAfter);
};

const getLatestUnitPrice = (item, itemLogs, endDate) => {
	const latestPriceLog = itemLogs
		.filter((log) => log.pricePerUnit !== undefined && log.pricePerUnit !== null && getLogDate(log) <= endDate)
		.sort(compareLogDateDesc)[0];

	return toNumber(latestPriceLog?.pricePerUnit ?? item.price);
};

const buildStockLogPayload = ({
	ownerId,
	userId,
	item,
	stockBefore,
	stockAfter,
	source,
	label,
	quantityChanged,
	pricePerUnit,
	changes,
	documentType,
	documentNumber,
	documentDate,
	counterpartyName,
	reportable,
}) => {
	const signedQuantity = toNumber(stockAfter) - toNumber(stockBefore);
	const absoluteQuantity =
		quantityChanged !== undefined ? Math.abs(toNumber(quantityChanged)) : Math.abs(signedQuantity);
	const unitPrice = toNumber(pricePerUnit ?? item?.price);

	return {
		businessOwnerId: ownerId,
		storageItemId: item?._id,
		itemName: item?.name,
		unit: item?.unit,
		quantityChanged: absoluteQuantity,
		stockBefore: toNumber(stockBefore),
		stockAfter: toNumber(stockAfter),
		signedQuantity,
		direction: getDirection(signedQuantity),
		amount: Math.abs(signedQuantity) * unitPrice,
		pricePerUnit: unitPrice,
		source,
		label,
		changes,
		documentType,
		documentNumber: documentNumber ? String(documentNumber) : undefined,
		documentDate: documentDate ? new Date(documentDate) : undefined,
		counterpartyName,
		reportable: reportable ?? signedQuantity !== 0,
		triggeredBy: userId,
	};
};

const createStockLog = (payload) =>
	StockLog.create(payload).catch((e) => console.error("StockLog create error:", e));

const upsertOpeningBalance = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}

		const documentDate = new Date(req.body.documentDate);
		if (Number.isNaN(documentDate.getTime())) {
			return res
				.status(StatusCodes.BAD_REQUEST)
				.json({ message: "documentDate is required" });
		}

		const items = Array.isArray(req.body.items) ? req.body.items : [];
		if (items.length === 0) {
			return res
				.status(StatusCodes.BAD_REQUEST)
				.json({ message: "items must be a non-empty array" });
		}

		const results = [];
		for (const row of items) {
			const name = String(row.name ?? "").trim();
			const unit = String(row.unit ?? "").trim();
			const openingQuantity = toNumber(row.openingQuantity, NaN);
			const unitPrice = toNumber(row.unitPrice, 0);
			if (!name || !unit || !Number.isFinite(openingQuantity) || openingQuantity < 0) {
				return res.status(StatusCodes.BAD_REQUEST).json({
					message: "Each item requires name, unit, and openingQuantity >= 0",
				});
			}

			const query = row.storageItemId
				? { _id: row.storageItemId, businessOwnerId: owner._id }
				: {
					businessOwnerId: owner._id,
					name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
				};

			let item = await StorageItem.findOne(query);
			const existingItem = Boolean(item);
			const stockBefore = existingItem ? toNumber(item.stock) : 0;
			const stockAfter = stockBefore + openingQuantity;
			if (!item) {
				item = new StorageItem({
					code: row.code,
					name,
					unit,
					stock: stockAfter,
					price: unitPrice,
					category: row.category ? Number(row.category) : 1,
					syncStatus: true,
					businessOwnerId: owner._id,
				});
				await item.save();
			} else {
				item.code = row.code ?? item.code;
				item.name = name;
				item.unit = unit;
				item.price = unitPrice;
				item.category = row.category ? Number(row.category) : item.category || 1;
				item.syncStatus = true;
				item.stock = stockAfter;
				await item.save();
			}

			if (existingItem) {
				await StockLog.updateMany(
					{
						businessOwnerId: owner._id,
						storageItemId: item._id,
						source: "manual_add",
						stockBefore: 0,
						$or: [{ reportable: true }, { reportable: { $exists: false } }],
					},
					{ $set: { reportable: false } },
				);
			}

			const openingPayload = {
				businessOwnerId: owner._id,
				storageItemId: item._id,
				itemName: item.name,
				unit: item.unit,
				quantityChanged: openingQuantity,
				stockBefore,
				stockAfter,
				signedQuantity: openingQuantity,
				direction: openingQuantity > 0 ? "in" : "neutral",
				amount: openingQuantity * unitPrice,
				pricePerUnit: unitPrice,
				source: "opening_balance",
				label: "Số dư đầu kỳ",
				documentType: "opening_balance",
				documentDate,
				reportable: false,
				triggeredBy: userId,
			};

			await StockLog.create(openingPayload);

			results.push({
				storageItemId: item._id,
				name: item.name,
				unit: item.unit,
				openingQuantity,
				currentStock: stockAfter,
			});
		}

		res.status(StatusCodes.OK).json({
			message: "Opening balance saved successfully",
			documentDate: documentDate.toISOString(),
			data: results,
		});
	} catch (error) {
		next(error);
	}
};

const getInventoryReport = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}

		const bounds = getDayBounds(req.query.startDate, req.query.endDate);
		if (!bounds) {
			return res
				.status(StatusCodes.BAD_REQUEST)
				.json({ message: "startDate and endDate are required" });
		}

		const category = req.query.category ?? "all";
		const itemFilter = { businessOwnerId: owner._id, syncStatus: true };
		if (category !== "all") {
			const categoryNumber = Number(category);
			if (![1, 2].includes(categoryNumber)) {
				return res
					.status(StatusCodes.BAD_REQUEST)
					.json({ message: "category must be all, 1, or 2" });
			}
			itemFilter.category = categoryNumber;
		}

		const items = await StorageItem.find(itemFilter).sort({ name: 1 }).lean();
		const rows = await Promise.all(
			items.map(async (item) => {
				const itemLogs = await StockLog.find({
					businessOwnerId: owner._id,
					storageItemId: item._id,
				}).lean();
				const movements = itemLogs.filter((log) => {
					const isReportable = log.reportable === true || log.reportable === undefined;
					return isReportable && isLogBetween(log, bounds.start, bounds.end);
				});

				const openingQuantity = getOpeningQuantityForPeriod(itemLogs, bounds.start);
				const inQuantity = movements.reduce(
					(sum, log) => sum + Math.max(getSignedQuantityFromLog(log), 0),
					0,
				);
				const outQuantity = movements.reduce(
					(sum, log) => sum + Math.abs(Math.min(getSignedQuantityFromLog(log), 0)),
					0,
				);
				const closingQuantity = openingQuantity + inQuantity - outQuantity;
				const unitPrice = getLatestUnitPrice(item, itemLogs, bounds.end);

				return {
					itemId: item._id.toString(),
					itemCode: item.code ?? "",
					itemName: item.name,
					unit: item.unit,
					unitPrice,
					openingQuantity,
					openingValue: openingQuantity * unitPrice,
					inQuantity,
					inValue: inQuantity * unitPrice,
					outQuantity,
					outValue: outQuantity * unitPrice,
					closingQuantity,
					closingValue: closingQuantity * unitPrice,
				};
			}),
		);

		const totals = rows.reduce(
			(acc, row) => ({
				openingQuantity: acc.openingQuantity + row.openingQuantity,
				openingValue: acc.openingValue + row.openingValue,
				inQuantity: acc.inQuantity + row.inQuantity,
				inValue: acc.inValue + row.inValue,
				outQuantity: acc.outQuantity + row.outQuantity,
				outValue: acc.outValue + row.outValue,
				closingQuantity: acc.closingQuantity + row.closingQuantity,
				closingValue: acc.closingValue + row.closingValue,
			}),
			{
				openingQuantity: 0,
				openingValue: 0,
				inQuantity: 0,
				inValue: 0,
				outQuantity: 0,
				outValue: 0,
				closingQuantity: 0,
				closingValue: 0,
			},
		);

		res.status(StatusCodes.OK).json({
			profile: {
				businessName: owner.businessName,
				taxCode: owner.taxCode,
				address: owner.address,
				addressText: getFullAddress(owner),
			},
			period: {
				startDate: bounds.start.toISOString(),
				endDate: bounds.end.toISOString(),
			},
			accountCodes: ACCOUNT_CODES,
			rows,
			totals,
			generatedAt: new Date().toISOString(),
		});
	} catch (error) {
		next(error);
	}
};

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
			...buildStockLogPayload({
				ownerId: owner._id,
				userId,
				item: result,
				stockBefore: 0,
				stockAfter: result.stock ?? 0,
				source: "manual_add",
				label: "Thêm tồn kho",
			}),
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
			createStockLog(buildStockLogPayload({
				ownerId: owner._id,
				userId,
				item: result,
				stockBefore: oldItem.stock ?? 0,
				stockAfter: result.stock ?? 0,
				source: "manual_update",
				label: "Cập nhật tồn kho",
				changes,
				reportable: req.body.stock !== undefined && result.stock !== oldItem.stock,
			}));
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
			createStockLog(buildStockLogPayload({
				ownerId: owner._id,
				userId,
				item: oldItem,
				stockBefore: oldItem.stock ?? 0,
				stockAfter: 0,
				source: "manual_delete",
				label: "Xoá khỏi kho",
			}));
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
			ownerId: owner._id,
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
						// Tìm theo tên chính hoặc syncAliases (case-insensitive)
						const namePattern = new RegExp(`^${data.name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
						const existingItem = await StorageItem.findOne({
							businessOwnerId: owner._id,
							$or: [
								{ name: namePattern },
								{ "syncAliases.name": namePattern },
							],
						});

						let action = "created";
						let savedItem;
						let stockBefore = 0;
						let stockAfter = data.stock ?? 0;
						if (existingItem) {
							// Kiểm tra nếu match qua alias → cần quy đổi đơn vị
							const matchedAlias = existingItem.syncAliases.find(
								(a) => namePattern.test(a.name)
							);
							const factor = matchedAlias ? matchedAlias.conversionFactor : 1;
							const addedStock = data.stock * factor;
							stockBefore = existingItem.stock ?? 0;
							stockAfter = stockBefore + addedStock;
							savedItem = await storageItemService.updateStorageItem(
								existingItem._id,
								{ stock: stockAfter },
								owner._id,
							);
							action = "updated";
						} else {
							savedItem = await storageItemService.createStorageItem(data, owner._id);
							stockAfter = savedItem.stock ?? 0;
						}
						createStockLog(buildStockLogPayload({
							ownerId: owner._id,
							userId,
							item: savedItem,
							stockBefore,
							stockAfter,
							source: "invoice_in",
							label: "Nhập từ hóa đơn mua vào",
							quantityChanged: Math.abs(stockAfter - stockBefore),
							documentType: "invoice_in",
							documentNumber: invoice.shdon || invoice.mhdon || invoice._id?.toString(),
							documentDate: invoice.ntao || invoice.tdlap || invoice.createdAt,
							counterpartyName: invoice.nbten || "",
						}));
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
		const matchStage = {
			businessOwnerId: owner._id,
			$or: [{ reportable: true }, { reportable: { $exists: false } }],
		};
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
						$ifNull: [
							"$signedQuantity",
							{
								$switch: {
									branches: [
										{ case: { $in: ["$source", ["manual_add", "invoice_in"]] }, then: { $ifNull: ["$quantityChanged", 0] } },
										{ case: { $in: ["$source", ["manual_delete", "invoice_out"]] }, then: { $multiply: [{ $ifNull: ["$quantityChanged", 0] }, -1] } },
									],
									default: 0,
								},
							},
						],
					},
				},
			},
			{
				$group: {
					_id: "$storageItemId",
					itemName: { $last: "$itemName" },
					unit: { $last: { $ifNull: ["$unit", ""] } },
					totalAdded: {
						$sum: { $cond: [{ $gt: ["$stockDelta", 0] }, "$stockDelta", 0] },
					},
					totalDeleted: {
						$sum: { $cond: [{ $lt: ["$stockDelta", 0] }, { $abs: "$stockDelta" }, 0] },
					},
					netChange: { $sum: "$stockDelta" },
					countAdd: { $sum: { $cond: [{ $gt: ["$stockDelta", 0] }, 1, 0] } },
					countUpdate: { $sum: { $cond: [{ $eq: ["$source", "manual_update"] }, 1, 0] } },
					countDelete: { $sum: { $cond: [{ $lt: ["$stockDelta", 0] }, 1, 0] } },
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

const mergeItems = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}

		const masterId = req.params.id;
		const { duplicateId, conversionFactor } = req.body;

		if (!duplicateId) {
			return res
				.status(StatusCodes.BAD_REQUEST)
				.json({ message: "duplicateId là bắt buộc" });
		}

		const factor =
			typeof conversionFactor === "number" && conversionFactor > 0
				? conversionFactor
				: 1;

		const { updatedMaster, duplicateStockTransferred, duplicateName } =
			await storageItemService.mergeStorageItems(masterId, duplicateId, factor, owner._id);

		// Ghi StockLog cho hành động merge
		StockLog.create({
			...buildStockLogPayload({
				ownerId: owner._id,
				userId,
				item: updatedMaster,
				stockBefore: (updatedMaster.stock ?? 0) - duplicateStockTransferred,
				stockAfter: updatedMaster.stock ?? 0,
				source: "merge",
				label: `Gộp từ "${duplicateName}"`,
				quantityChanged: duplicateStockTransferred,
				reportable: false,
			}),
		}).catch((e) => console.error("StockLog merge error:", e));

		res.status(StatusCodes.OK).json(updatedMaster);
	} catch (err) {
		next(err);
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
	getInventoryReport,
	upsertOpeningBalance,
	genTypeItem,
	updateUnitConversion,
	getIdByName,
	getByIdFromBody,
	mergeItems,
};
