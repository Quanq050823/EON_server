"use strict";

import { StatusCodes } from "http-status-codes";
import ApiError from "../utils/ApiError.js";
import BusinessOwner from "../models/BusinessOwner.js";
import SyncHistory from "../models/SyncHistory.js";

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
	{ page = 1, limit = 20, startDate, endDate } = {},
) => {
	const ownerExists = await BusinessOwner.exists({ _id: ownerId });
	if (!ownerExists) {
		throw new ApiError(StatusCodes.NOT_FOUND, "Business owner not found");
	}

	const normalizedPage = Math.max(Number.parseInt(page, 10) || 1, 1);
	const normalizedLimit = Math.min(
		Math.max(Number.parseInt(limit, 10) || 20, 1),
		100,
	);
	const start = parseDate(startDate, "startDate");
	const end = parseDate(endDate, "endDate");
	if (start && end && start > end) {
		throw new ApiError(
			StatusCodes.BAD_REQUEST,
			"startDate must be before endDate",
		);
	}

	const filter = { businessOwnerId: ownerId };
	if (start || end) {
		filter.createdAt = {};
		if (start) filter.createdAt.$gte = start;
		if (end) filter.createdAt.$lte = end;
	}

	const skip = (normalizedPage - 1) * normalizedLimit;
	const [data, total] = await Promise.all([
		SyncHistory.find(filter)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(normalizedLimit)
			.lean(),
		SyncHistory.countDocuments(filter),
	]);

	return {
		data,
		total,
		page: normalizedPage,
		totalPages: Math.ceil(total / normalizedLimit),
	};
};

export { listByOwner };
