"use strict";

import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import ApiError from "../utils/ApiError.js";
import BusinessOwner from "../models/BusinessOwner.js";
import StockLog from "../models/StockLog.js";

const SOURCES = [
	"opening_balance",
	"manual_add",
	"manual_update",
	"manual_delete",
	"invoice_in",
	"invoice_out",
	"merge",
];

const parseDate = (value, fieldName) => {
	if (!value) return undefined;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new ApiError(StatusCodes.BAD_REQUEST, `${fieldName} is invalid`);
	}
	return date;
};

const listByOwner = async (
	ownerId,
	{
		page = 1,
		limit = 50,
		startDate,
		endDate,
		storageItemId,
		itemName,
	} = {},
) => {
	const owner = await BusinessOwner.findById(ownerId).select("_id").lean();
	if (!owner) {
		throw new ApiError(StatusCodes.NOT_FOUND, "Business owner not found");
	}

	const normalizedPage = Math.max(Number.parseInt(page, 10) || 1, 1);
	const normalizedLimit = Math.max(Number.parseInt(limit, 10) || 50, 1);
	const start = parseDate(startDate, "startDate");
	const end = parseDate(endDate, "endDate");
	if (start && end && start > end) {
		throw new ApiError(
			StatusCodes.BAD_REQUEST,
			"startDate must be before endDate",
		);
	}

	const filter = { businessOwnerId: owner._id };
	if (start || end) {
		filter.createdAt = {};
		if (start) filter.createdAt.$gte = start;
		if (end) filter.createdAt.$lte = end;
	}

	const itemFilters = [];
	if (storageItemId) {
		if (!mongoose.isValidObjectId(storageItemId)) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "storageItemId is invalid");
		}
		itemFilters.push({
			storageItemId: new mongoose.Types.ObjectId(storageItemId),
		});
	}
	if (itemName) {
		itemFilters.push({ itemName: String(itemName) });
	}
	if (itemFilters.length > 0) filter.$or = itemFilters;

	const skip = (normalizedPage - 1) * normalizedLimit;
	const [data, total, sourceRows] = await Promise.all([
		StockLog.find(filter)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(normalizedLimit)
			.lean(),
		StockLog.countDocuments(filter),
		StockLog.aggregate([
			{ $match: filter },
			{ $group: { _id: "$source", count: { $sum: 1 } } },
		]),
	]);

	const sourceCounts = Object.fromEntries(
		SOURCES.map((source) => [source, 0]),
	);
	for (const row of sourceRows) {
		if (row._id) sourceCounts[row._id] = row.count;
	}

	return {
		data,
		total,
		page: normalizedPage,
		totalPages: Math.ceil(total / normalizedLimit),
		sourceCounts,
	};
};

export { listByOwner };
