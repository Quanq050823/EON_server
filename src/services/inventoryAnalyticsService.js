"use strict";

import { StatusCodes } from "http-status-codes";
import ApiError from "../utils/ApiError.js";
import BusinessOwner from "../models/BusinessOwner.js";
import StockLog from "../models/StockLog.js";
import StorageItem from "../models/StorageItem.js";

const ACCOUNT_CODES = "1521,156,1561,155,002,152";

const toNumber = (value, fallback = 0) => {
	const num = Number(value);
	return Number.isFinite(num) ? num : fallback;
};

const getDayBounds = (startDate, endDate) => {
	if (!startDate || !endDate) return null;

	const start = new Date(startDate);
	const end = new Date(endDate);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

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
	]
		.filter(Boolean)
		.join(", ");

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

const getOpeningQuantityForPeriod = (itemLogs, startDate, endDate) => {
	const openingBalanceLogs = itemLogs
		.filter(
			(log) =>
				log.source === "opening_balance" && getLogDate(log) <= startDate,
		)
		.sort(compareLogDateAsc);

	const openingBalanceInPeriod = endDate
		? itemLogs
				.filter((log) => {
					const logDate = getLogDate(log);
					return (
						log.source === "opening_balance" &&
						logDate > startDate &&
						logDate <= endDate
					);
				})
				.reduce((sum, log) => sum + getSignedQuantityFromLog(log), 0)
		: 0;

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
				const isReportable =
					log.reportable === true || log.reportable === undefined;
				return (
					isReportable &&
					logDate > movementStartDate &&
					logDate < startDate
				);
			})
			.reduce((sum, log) => sum + getSignedQuantityFromLog(log), 0);

		return (
			openingQuantity +
			movementAfterOpeningBeforePeriod +
			openingBalanceInPeriod
		);
	}

	const openingLog = itemLogs
		.filter((log) => isLogBefore(log, startDate))
		.sort(compareLogDateDesc)[0];

	return toNumber(openingLog?.stockAfter) + openingBalanceInPeriod;
};

const getLatestUnitPrice = (item, itemLogs, endDate) => {
	const latestPriceLog = itemLogs
		.filter(
			(log) =>
				log.pricePerUnit !== undefined &&
				log.pricePerUnit !== null &&
				getLogDate(log) <= endDate,
		)
		.sort(compareLogDateDesc)[0];

	return toNumber(latestPriceLog?.pricePerUnit ?? item.price);
};

const requireOwner = async (ownerId) => {
	const owner = await BusinessOwner.findById(ownerId).lean();
	if (!owner) {
		throw new ApiError(StatusCodes.NOT_FOUND, "Business owner not found");
	}
	return owner;
};

const getSyncedItems = async (ownerId) => {
	await requireOwner(ownerId);
	const data = await StorageItem.find({
		businessOwnerId: ownerId,
		syncStatus: true,
	})
		.sort({ name: 1 })
		.lean();
	return { data };
};

const getStockSummary = async (ownerId, { startDate, endDate } = {}) => {
	const owner = await requireOwner(ownerId);

	const matchStage = {
		businessOwnerId: owner._id,
		$or: [{ reportable: true }, { reportable: { $exists: false } }],
	};
	if (startDate || endDate) {
		matchStage.createdAt = {};
		if (startDate) {
			const start = new Date(startDate);
			if (Number.isNaN(start.getTime())) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "startDate is invalid");
			}
			matchStage.createdAt.$gte = start;
		}
		if (endDate) {
			const end = new Date(endDate);
			if (Number.isNaN(end.getTime())) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "endDate is invalid");
			}
			matchStage.createdAt.$lte = end;
		}
	}

	const data = await StockLog.aggregate([
		{ $match: matchStage },
		{
			$addFields: {
				stockDelta: {
					$ifNull: [
						"$signedQuantity",
						{
							$switch: {
								branches: [
									{
										case: {
											$in: ["$source", ["manual_add", "invoice_in"]],
										},
										then: { $ifNull: ["$quantityChanged", 0] },
									},
									{
										case: {
											$in: ["$source", ["manual_delete", "invoice_out"]],
										},
										then: {
											$multiply: [
												{ $ifNull: ["$quantityChanged", 0] },
												-1,
											],
										},
									},
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
					$sum: {
						$cond: [{ $gt: ["$stockDelta", 0] }, "$stockDelta", 0],
					},
				},
				totalDeleted: {
					$sum: {
						$cond: [
							{ $lt: ["$stockDelta", 0] },
							{ $abs: "$stockDelta" },
							0,
						],
					},
				},
				netChange: { $sum: "$stockDelta" },
				countAdd: {
					$sum: { $cond: [{ $gt: ["$stockDelta", 0] }, 1, 0] },
				},
				countUpdate: {
					$sum: {
						$cond: [{ $eq: ["$source", "manual_update"] }, 1, 0],
					},
				},
				countDelete: {
					$sum: { $cond: [{ $lt: ["$stockDelta", 0] }, 1, 0] },
				},
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
	]);

	return { data };
};

const getInventoryReport = async (
	ownerId,
	{ startDate, endDate, category = "all" },
) => {
	const owner = await requireOwner(ownerId);
	const bounds = getDayBounds(startDate, endDate);
	if (!bounds) {
		throw new ApiError(
			StatusCodes.BAD_REQUEST,
			"startDate and endDate are required",
		);
	}

	const itemFilter = { businessOwnerId: ownerId, syncStatus: true };
	if (category !== "all") {
		const categoryNumber = Number(category);
		if (![1, 2].includes(categoryNumber)) {
			throw new ApiError(
				StatusCodes.BAD_REQUEST,
				"category must be all, 1, or 2",
			);
		}
		itemFilter.category = categoryNumber;
	}

	const items = await StorageItem.find(itemFilter).sort({ name: 1 }).lean();
	const rows = await Promise.all(
		items.map(async (item) => {
			const itemLogs = await StockLog.find({
				businessOwnerId: ownerId,
				storageItemId: item._id,
			}).lean();
			const movements = itemLogs.filter((log) => {
				const isReportable =
					log.reportable === true || log.reportable === undefined;
				return (
					isReportable && isLogBetween(log, bounds.start, bounds.end)
				);
			});
			const openingQuantity = getOpeningQuantityForPeriod(
				itemLogs,
				bounds.start,
				bounds.end,
			);
			const inQuantity = movements.reduce(
				(sum, log) => sum + Math.max(getSignedQuantityFromLog(log), 0),
				0,
			);
			const outQuantity = movements.reduce(
				(sum, log) =>
					sum + Math.abs(Math.min(getSignedQuantityFromLog(log), 0)),
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

	return {
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
	};
};

const upsertOpeningBalance = async (
	ownerId,
	triggeredBy,
	{ documentDate: rawDocumentDate, items: rawItems },
) => {
	await requireOwner(ownerId);

	const documentDate = new Date(rawDocumentDate);
	if (Number.isNaN(documentDate.getTime())) {
		throw new ApiError(StatusCodes.BAD_REQUEST, "documentDate is required");
	}

	const items = Array.isArray(rawItems) ? rawItems : [];
	if (items.length === 0) {
		throw new ApiError(
			StatusCodes.BAD_REQUEST,
			"items must be a non-empty array",
		);
	}

	const normalizedItems = items.map((row) => ({
		...row,
		name: String(row.name ?? "").trim(),
		unit: String(row.unit ?? "").trim(),
		openingQuantity: toNumber(row.openingQuantity, NaN),
		unitPrice: toNumber(row.unitPrice, 0),
	}));
	if (
		normalizedItems.some(
			(row) =>
				!row.name ||
				!row.unit ||
				!Number.isFinite(row.openingQuantity) ||
				row.openingQuantity < 0,
		)
	) {
		throw new ApiError(
			StatusCodes.BAD_REQUEST,
			"Each item requires name, unit, and openingQuantity >= 0",
		);
	}

	const results = [];
	for (const row of normalizedItems) {
		const query = row.storageItemId
			? { _id: row.storageItemId, businessOwnerId: ownerId }
			: {
					businessOwnerId: ownerId,
					name: {
						$regex: new RegExp(
							`^${row.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
							"i",
						),
					},
				};

		let item = await StorageItem.findOne(query);
		const existingItem = Boolean(item);
		const stockBefore = existingItem ? toNumber(item.stock) : 0;
		const stockAfter = stockBefore + row.openingQuantity;

		if (!item) {
			item = new StorageItem({
				code: row.code,
				name: row.name,
				unit: row.unit,
				stock: stockAfter,
				price: row.unitPrice,
				category: row.category ? Number(row.category) : 1,
				syncStatus: true,
				businessOwnerId: ownerId,
			});
		} else {
			item.code = row.code ?? item.code;
			item.name = row.name;
			item.unit = row.unit;
			item.price = row.unitPrice;
			item.category = row.category
				? Number(row.category)
				: item.category || 1;
			item.syncStatus = true;
			item.stock = stockAfter;
		}
		await item.save();

		if (existingItem) {
			await StockLog.updateMany(
				{
					businessOwnerId: ownerId,
					storageItemId: item._id,
					source: "manual_add",
					stockBefore: 0,
					$or: [
						{ reportable: true },
						{ reportable: { $exists: false } },
					],
				},
				{ $set: { reportable: false } },
			);
		}

		await StockLog.create({
			businessOwnerId: ownerId,
			storageItemId: item._id,
			itemName: item.name,
			unit: item.unit,
			quantityChanged: row.openingQuantity,
			stockBefore,
			stockAfter,
			signedQuantity: row.openingQuantity,
			direction: row.openingQuantity > 0 ? "in" : "neutral",
			amount: row.openingQuantity * row.unitPrice,
			pricePerUnit: row.unitPrice,
			source: "opening_balance",
			label: "Số dư đầu kỳ",
			documentType: "opening_balance",
			documentDate,
			reportable: false,
			triggeredBy,
		});

		results.push({
			storageItemId: item._id,
			name: item.name,
			unit: item.unit,
			openingQuantity: row.openingQuantity,
			currentStock: stockAfter,
		});
	}

	return {
		message: "Opening balance saved successfully",
		documentDate: documentDate.toISOString(),
		data: results,
	};
};

export {
	getSyncedItems,
	getStockSummary,
	getInventoryReport,
	upsertOpeningBalance,
};
