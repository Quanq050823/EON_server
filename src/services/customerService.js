"use strict";

import Customer from "../models/Customer.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";

const createCustomer = async (ownerId, data) => {
	const existed = await Customer.findOne({ ownerId, code: data.code });
	if (existed)
		throw new ApiError(
			StatusCodes.BAD_REQUEST,
			"Customer code already exists for this business owner"
		);
	const customer = new Customer({ ownerId, ...data });
	await customer.save();
	return customer;
};

const getCustomerById = async (id) => {
	const customer = await Customer.findById(id);
	if (!customer)
		throw new ApiError(StatusCodes.NOT_FOUND, "Customer not found");
	return customer;
};

const updateCustomer = async (id, data) => {
	const updated = await Customer.findByIdAndUpdate(
		id,
		{ $set: data },
		{ new: true, runValidators: true }
	);
	if (!updated) throw new ApiError(StatusCodes.NOT_FOUND, "Customer not found");
	return updated;
};

const deleteCustomer = async (id) => {
	const deleted = await Customer.findByIdAndDelete(id);
	if (!deleted) throw new ApiError(StatusCodes.NOT_FOUND, "Customer not found");
	return { message: "Customer deleted" };
};

const listCustomers = async (ownerId, filter = {}, options = {}) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = -1,
	} = options;
	const skip = (page - 1) * limit;

	// Build query with search functionality
	let query = { ownerId };

	// Add filters
	if (filter.status) {
		query.status = filter.status;
	}

	if (filter.customerType) {
		query.customerType = filter.customerType;
	}

	if (filter.search) {
		query.$text = { $search: filter.search };
	}

	if (filter.tags && filter.tags.length > 0) {
		query.tags = { $in: filter.tags };
	}

	const findQuery = Customer.find({ ...query, ...filter })
		.sort({ [sortBy]: sortOrder })
		.skip(skip)
		.limit(limit);

	const [results, total] = await Promise.all([
		findQuery.exec(),
		Customer.countDocuments({ ...query, ...filter }),
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

const getCustomerStats = async (ownerId) => {
	const stats = await Customer.aggregate([
		{ $match: { ownerId } },
		{
			$group: {
				_id: null,
				totalCustomers: { $sum: 1 },
				activeCustomers: {
					$sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
				},
				individualCustomers: {
					$sum: { $cond: [{ $eq: ["$customerType", "individual"] }, 1, 0] },
				},
				businessCustomers: {
					$sum: { $cond: [{ $eq: ["$customerType", "business"] }, 1, 0] },
				},
				totalCreditLimit: { $sum: "$creditLimit" },
				totalSpent: { $sum: "$totalSpent" },
			},
		},
	]);

	return (
		stats[0] || {
			totalCustomers: 0,
			activeCustomers: 0,
			individualCustomers: 0,
			businessCustomers: 0,
			totalCreditLimit: 0,
			totalSpent: 0,
		}
	);
};

const searchCustomers = async (ownerId, searchTerm) => {
	const customers = await Customer.find({
		ownerId,
		$or: [
			{ name: { $regex: searchTerm, $options: "i" } },
			{ email: { $regex: searchTerm, $options: "i" } },
			{ phoneNumber: { $regex: searchTerm, $options: "i" } },
			{ code: { $regex: searchTerm, $options: "i" } },
			{ companyName: { $regex: searchTerm, $options: "i" } },
		],
	}).limit(20);

	return customers;
};

export {
	createCustomer,
	getCustomerById,
	updateCustomer,
	deleteCustomer,
	listCustomers,
	getCustomerStats,
	searchCustomers,
};
