"use strict";

import Accountant from "../models/Accountant.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";

const createAccountant = async (userId, data) => {
	const existed = await Accountant.findOne({ userId });
	if (existed)
		throw new ApiError(StatusCodes.BAD_REQUEST, "Profile already exists");
	const accountant = new Accountant({ userId, ...data });
	await accountant.save();
	return accountant;
};

const getAccountantByUserId = async (userId) => {
	const profile = await Accountant.findOne({ userId });
	if (!profile) throw new ApiError(StatusCodes.NOT_FOUND, "Profile not found");
	return profile;
};

const updateAccountant = async (userId, data) => {
	const updated = await Accountant.findOneAndUpdate(
		{ userId },
		{ $set: data },
		{ new: true, runValidators: true }
	);
	if (!updated) throw new ApiError(StatusCodes.NOT_FOUND, "Profile not found");
	return updated;
};

const deleteAccountant = async (userId) => {
	const deleted = await Accountant.findOneAndDelete({ userId });
	if (!deleted) throw new ApiError(StatusCodes.NOT_FOUND, "Profile not found");
	return { message: "Profile deleted" };
};

const listAccountants = async (filter = {}, options = {}) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = -1,
	} = options;
	const skip = (page - 1) * limit;
	const query = Accountant.find(filter)
		.sort({ [sortBy]: sortOrder })
		.skip(skip)
		.limit(limit);
	const [results, total] = await Promise.all([
		query.exec(),
		Accountant.countDocuments(filter),
	]);
	return {
		data: results,
		pagination: {
			page,
			limit,
			total,
			pages: Math.ceil(total / limit),
		},
	};
};

export {
	createAccountant,
	getAccountantByUserId,
	updateAccountant,
	deleteAccountant,
	listAccountants,
};
