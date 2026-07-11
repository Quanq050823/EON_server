"use strict";

import mongoose from "mongoose";
import User from "../models/User.js";
import BusinessOwner from "../models/BusinessOwner.js";
import Accountant from "../models/Accountant.js";
import OutputInvoice from "../models/OutputInvoice.js";
import InvoicesIn from "../models/InvoicesIn.js";
import StorageItem from "../models/StorageItem.js";
import Employee from "../models/Employee.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcryptjs";
import * as easyInvoiceService from "./easyInvoiceService.js";
import * as businessOwnerService from "./businessOwnerService.js";
import * as storageItemService from "./storageItemService.js";

// User Management
const getAllUsers = async (filter = {}, options = {}) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createDate",
		sortOrder = -1,
	} = options;
	const skip = (page - 1) * limit;

	// Exclude deleted users and passwords
	const query = { isDeleted: false, ...filter };
	const projection = { password: 0, refreshToken: 0, otp: 0 };

	const [results, total] = await Promise.all([
		User.find(query, projection)
			.sort({ [sortBy]: sortOrder })
			.skip(skip)
			.limit(limit)
			.lean(),
		User.countDocuments(query),
	]);

	return {
		success: true,
		data: results,
		pagination: {
			page,
			limit,
			total,
			pages: Math.ceil(total / limit),
		},
	};
};

const getUserById = async (userId) => {
	const user = await User.findById(userId, {
		password: 0,
		refreshToken: 0,
		otp: 0,
	}).lean();
	if (!user || user.isDeleted) {
		throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
	}
	return { success: true, data: user };
};

const createUser = async (data) => {
	const { email, password, name, role, userType } = data;

	// Check if user already exists
	const existingUser = await User.findOne({ email });
	if (existingUser) {
		throw new ApiError(StatusCodes.BAD_REQUEST, "Email already registered");
	}

	// Hash password
	const hashedPassword = await bcrypt.hash(password, 10);

	const newUser = new User({
		email,
		password: hashedPassword,
		name,
		role: role || "user",
		userType: userType || 0,
		isVerified: true, // Admin created users are auto-verified
	});

	await newUser.save();

	const userResponse = newUser.toObject();
	delete userResponse.password;
	delete userResponse.refreshToken;
	delete userResponse.otp;

	return { success: true, data: userResponse };
};

const updateUser = async (userId, data) => {
	const { password, ...updateData } = data;

	// If password is being updated, hash it
	if (password) {
		updateData.password = await bcrypt.hash(password, 10);
	}

	const updatedUser = await User.findByIdAndUpdate(
		userId,
		{ $set: updateData },
		{
			new: true,
			runValidators: true,
			projection: { password: 0, refreshToken: 0, otp: 0 },
		},
	).lean();

	if (!updatedUser) {
		throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
	}

	return { success: true, data: updatedUser };
};

const deleteUser = async (userId) => {
	// Soft delete
	const deletedUser = await User.findByIdAndUpdate(
		userId,
		{ $set: { isDeleted: true } },
		{ new: true, projection: { password: 0, refreshToken: 0, otp: 0 } },
	).lean();

	if (!deletedUser) {
		throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
	}

	return {
		success: true,
		message: "User deleted successfully",
		data: deletedUser,
	};
};

const updateUserRole = async (userId, role) => {
	if (!["admin", "user"].includes(role)) {
		throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid role");
	}

	const updatedUser = await User.findByIdAndUpdate(
		userId,
		{ $set: { role } },
		{ new: true, projection: { password: 0, refreshToken: 0, otp: 0 } },
	).lean();

	if (!updatedUser) {
		throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
	}

	return { success: true, data: updatedUser };
};

// Business Owner Management
const getAllBusinessOwners = async (options = {}, actor) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = -1,
	} = options;
	const skip = (page - 1) * limit;

	const filter = actor?.role === "admin" ? {} : { userId: actor?.userId };

	const [results, total] = await Promise.all([
		BusinessOwner.find(filter)
			.populate("userId", "name email avatar isVerified")
			.sort({ [sortBy]: sortOrder })
			.skip(skip)
			.limit(limit)
			.lean(),
		BusinessOwner.countDocuments(filter),
	]);

	return {
		success: true,
		data: results,
		pagination: {
			page,
			limit,
			total,
			pages: Math.ceil(total / limit),
		},
	};
};

const resolveAccessibleBusinessOwnerId = async (actor, requestedOwnerId) => {
	if (actor?.role === "admin") return requestedOwnerId;

	const owner = await BusinessOwner.findOne({ userId: actor?.userId })
		.select("_id")
		.lean();
	if (!owner) {
		throw new ApiError(StatusCodes.NOT_FOUND, "Business owner not found");
	}
	if (owner._id.toString() !== requestedOwnerId) {
		throw new ApiError(
			StatusCodes.FORBIDDEN,
			"You are not authorized to access this business owner",
		);
	}

	return owner._id.toString();
};

const getBusinessOwnerTaxCredentials = async (ownerId) => {
	const owner = await BusinessOwner.findById(ownerId)
		.select("taxCode password")
		.lean();
	if (!owner) {
		throw new ApiError(StatusCodes.NOT_FOUND, "Business owner not found");
	}
	if (!owner.taxCode || !owner.password) {
		throw new ApiError(
			StatusCodes.UNPROCESSABLE_ENTITY,
			"Hộ kinh doanh chưa cấu hình mã số thuế hoặc mật khẩu Cơ quan Thuế",
		);
	}
	return { username: owner.taxCode, password: owner.password };
};

const getBusinessOwnerById = async (ownerId) => {
	const owner = await BusinessOwner.findById(ownerId)
		.populate("userId", "name email avatar isVerified")
		.lean();

	if (!owner) {
		throw new ApiError(StatusCodes.NOT_FOUND, "Business owner not found");
	}

	return { success: true, data: owner };
};

// Accountant Management
const getAllAccountants = async (options = {}) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = -1,
	} = options;
	const skip = (page - 1) * limit;

	const [results, total] = await Promise.all([
		Accountant.find()
			.populate("userId", "name email avatar isVerified")
			.sort({ [sortBy]: sortOrder })
			.skip(skip)
			.limit(limit)
			.lean(),
		Accountant.countDocuments(),
	]);

	return {
		success: true,
		data: results,
		pagination: {
			page,
			limit,
			total,
			pages: Math.ceil(total / limit),
		},
	};
};

const getAccountantById = async (accountantId) => {
	const accountant = await Accountant.findById(accountantId)
		.populate("userId", "name email avatar isVerified")
		.lean();

	if (!accountant) {
		throw new ApiError(StatusCodes.NOT_FOUND, "Accountant not found");
	}

	return { success: true, data: accountant };
};

// Statistics & Dashboard
const getSystemStats = async () => {
	const [
		totalUsers,
		totalBusinessOwners,
		totalAccountants,
		totalProducts,
		totalCustomers,
		totalEmployees,
		totalOutputInvoices,
		totalInvoicesIn,
		verifiedUsers,
		adminUsers,
	] = await Promise.all([
		User.countDocuments({ isDeleted: false }),
		BusinessOwner.countDocuments(),
		Accountant.countDocuments(),
		Product.countDocuments(),
		Customer.countDocuments(),
		Employee.countDocuments(),
		OutputInvoice.countDocuments(),
		InvoicesIn.countDocuments(),
		User.countDocuments({ isDeleted: false, isVerified: true }),
		User.countDocuments({ isDeleted: false, role: "admin" }),
	]);

	return {
		success: true,
		data: {
			users: {
				total: totalUsers,
				verified: verifiedUsers,
				admins: adminUsers,
			},
			businessOwners: totalBusinessOwners,
			accountants: totalAccountants,
			products: totalProducts,
			customers: totalCustomers,
			employees: totalEmployees,
			invoices: {
				output: totalOutputInvoices,
				input: totalInvoicesIn,
			},
		},
	};
};

const getUserStats = async () => {
	const usersByType = await User.aggregate([
		{ $match: { isDeleted: false } },
		{
			$group: {
				_id: "$userType",
				count: { $sum: 1 },
			},
		},
	]);

	const usersByRole = await User.aggregate([
		{ $match: { isDeleted: false } },
		{
			$group: {
				_id: "$role",
				count: { $sum: 1 },
			},
		},
	]);

	const recentUsers = await User.find({ isDeleted: false })
		.sort({ createDate: -1 })
		.limit(10)
		.select("name email createDate isVerified role userType")
		.lean();

	return {
		success: true,
		data: {
			byType: usersByType,
			byRole: usersByRole,
			recent: recentUsers,
		},
	};
};

const getInvoiceStats = async (startDate, endDate) => {
	const dateFilter = {};
	if (startDate) dateFilter.$gte = new Date(startDate);
	if (endDate) dateFilter.$lte = new Date(endDate);

	const matchStage =
		Object.keys(dateFilter).length > 0
			? { $match: { createdAt: dateFilter } }
			: { $match: {} };

	const [outputStats, inputStats] = await Promise.all([
		OutputInvoice.aggregate([
			matchStage,
			{
				$group: {
					_id: null,
					total: { $sum: 1 },
					totalAmount: { $sum: "$totalAmount" },
				},
			},
		]),
		InvoicesIn.aggregate([
			matchStage,
			{
				$group: {
					_id: null,
					total: { $sum: 1 },
					totalAmount: { $sum: "$totalAmount" },
				},
			},
		]),
	]);

	return {
		success: true,
		data: {
			output: outputStats[0] || { total: 0, totalAmount: 0 },
			input: inputStats[0] || { total: 0, totalAmount: 0 },
		},
	};
};

// Invoice Management
const getInvoicesInByBusinessOwner = async (ownerId, options = {}) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "tdlap",
		sortOrder = -1,
		search = "",
		status = "",
	} = options;
	const skip = (page - 1) * limit;

	// Verify business owner exists
	const owner = await BusinessOwner.findById(ownerId);
	if (!owner) {
		throw new ApiError(StatusCodes.NOT_FOUND, "Business owner not found");
	}

	// Build query
	const query = { ownerId };
	if (search) {
		query.$or = [
			{ khmshdon: { $regex: search, $options: "i" } },
			{ khhdon: { $regex: search, $options: "i" } },
			{ nbmst: { $regex: search, $options: "i" } },
		];
	}
	if (status) {
		query.ttxly = status;
	}

	const [results, total] = await Promise.all([
		InvoicesIn.find(query)
			.sort({ [sortBy]: sortOrder })
			.skip(skip)
			.limit(limit)
			.lean(),
		InvoicesIn.countDocuments(query),
	]);

	return {
		success: true,
		data: results,
		pagination: {
			page,
			limit,
			total,
			pages: Math.ceil(total / limit),
		},
	};
};

const getOutputInvoicesByBusinessOwner = async (ownerId, options = {}) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "tdlap",
		sortOrder = -1,
		search = "",
		status = "",
	} = options;
	const skip = (page - 1) * limit;

	// Verify business owner exists
	const owner = await BusinessOwner.findById(ownerId);
	if (!owner) {
		throw new ApiError(StatusCodes.NOT_FOUND, "Business owner not found");
	}

	// Build query
	const query = { businessOwnerId: ownerId };
	if (search) {
		query.$or = [
			{ khmshdon: { $regex: search, $options: "i" } },
			{ khhdon: { $regex: search, $options: "i" } },
			{ nbmst: { $regex: search, $options: "i" } },
		];
	}
	if (status) {
		query.ttxly = status;
	}

	const [results, total] = await Promise.all([
		OutputInvoice.find(query)
			.sort({ [sortBy]: sortOrder })
			.skip(skip)
			.limit(limit)
			.lean(),
		OutputInvoice.countDocuments(query),
	]);

	return {
		success: true,
		data: results,
		pagination: {
			page,
			limit,
			total,
			pages: Math.ceil(total / limit),
		},
	};
};

const getStorageItemsByBusinessOwner = async (ownerId, options = {}) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = -1,
		search = "",
		category = "",
		syncStatus = "",
	} = options;
	const skip = (page - 1) * limit;

	// Verify business owner exists
	const owner = await BusinessOwner.findById(ownerId);
	if (!owner) {
		throw new ApiError(StatusCodes.NOT_FOUND, "Business owner not found");
	}

	// Build query
	const query = { businessOwnerId: ownerId };
	if (search) {
		query.$or = [
			{ name: { $regex: search, $options: "i" } },
			{ code: { $regex: search, $options: "i" } },
		];
	}
	if (category) {
		query.category = category;
	}
	if (syncStatus !== "") {
		query.syncStatus = syncStatus === true || syncStatus === "true";
	}

	const [results, total] = await Promise.all([
		StorageItem.find(query)
			.sort({ [sortBy]: sortOrder })
			.skip(skip)
			.limit(limit)
			.lean(),
		StorageItem.countDocuments(query),
	]);

	return {
		success: true,
		data: results,
		pagination: {
			page,
			limit,
			total,
			pages: Math.ceil(total / limit),
		},
	};
};

const getProductsByBusinessOwner = async (ownerId, options = {}) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = -1,
		search = "",
		category = "",
		isActive = "",
	} = options;
	const skip = (page - 1) * limit;

	// Verify business owner exists
	const owner = await BusinessOwner.findById(ownerId);
	if (!owner) {
		throw new ApiError(StatusCodes.NOT_FOUND, "Business owner not found");
	}

	// Build query
	const query = { ownerId: ownerId };
	if (search) {
		query.$or = [
			{ name: { $regex: search, $options: "i" } },
			{ code: { $regex: search, $options: "i" } },
		];
	}
	if (category) {
		query.category = category;
	}
	if (isActive !== "") {
		query.isActive = isActive === "true";
	}

	const [results, total] = await Promise.all([
		Product.find(query)
			.sort({ [sortBy]: sortOrder })
			.skip(skip)
			.limit(limit)
			.lean(),
		Product.countDocuments(query),
	]);

	return {
		success: true,
		data: results,
		pagination: {
			page,
			limit,
			total,
			pages: Math.ceil(total / limit),
		},
	};
};

// Tax Statistics for Business Owner
const getTaxStatisticsByBusinessOwner = async (ownerId, options = {}) => {
	const { period = "month", year, month, quarter } = options;

	// Build date filter based on period
	let startDate, endDate;
	const currentYear = year ? parseInt(year) : new Date().getFullYear();

	if (period === "month" && month) {
		const monthNum = parseInt(month);
		startDate = new Date(currentYear, monthNum - 1, 1);
		endDate = new Date(currentYear, monthNum, 0, 23, 59, 59);
	} else if (period === "quarter" && quarter) {
		const quarterNum = parseInt(quarter);
		const startMonth = (quarterNum - 1) * 3;
		startDate = new Date(currentYear, startMonth, 1);
		endDate = new Date(currentYear, startMonth + 3, 0, 23, 59, 59);
	} else if (period === "year") {
		startDate = new Date(currentYear, 0, 1);
		endDate = new Date(currentYear, 11, 31, 23, 59, 59);
	} else {
		// Default to current month
		const now = new Date();
		startDate = new Date(now.getFullYear(), now.getMonth(), 1);
		endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
	}

	// Aggregate OutputInvoices for tax calculation
	const outputInvoices = await OutputInvoice.aggregate([
		{
			$match: {
				businessOwnerId: new mongoose.Types.ObjectId(ownerId),
				ncnhat: { $gte: startDate, $lte: endDate },
				// tthai: { $in: ["1", "2"] },
			},
		},
		{
			$group: {
				_id: null,
				totalGTGT: { $sum: { $toDouble: { $ifNull: ["$totalGTGT", 0] } } },
				totalTNCN: { $sum: { $toDouble: { $ifNull: ["$totalTNCN", 0] } } },
				totalRevenue: { $sum: { $toDouble: { $ifNull: ["$tgtttbso", 0] } } },
				invoiceCount: { $sum: 1 },
			},
		},
	]);

	const stats = outputInvoices[0] || {
		totalGTGT: 0,
		totalTNCN: 0,
		totalRevenue: 0,
		invoiceCount: 0,
	};

	// Calculate total tax
	const totalTax = (stats.totalGTGT || 0) + (stats.totalTNCN || 0);

	return {
		success: true,
		data: {
			period: {
				type: period,
				year: currentYear,
				month: month ? parseInt(month) : undefined,
				quarter: quarter ? parseInt(quarter) : undefined,
				startDate,
				endDate,
			},
			statistics: {
				totalGTGT: stats.totalGTGT || 0,
				totalTNCN: stats.totalTNCN || 0,
				totalTax,
				totalRevenue: stats.totalRevenue || 0,
				invoiceCount: stats.invoiceCount || 0,
			},
		},
	};
};

const getUnclassifiedStorageItemsByBusinessOwner = async (ownerId) => {
	return storageItemService.listStorageItems(
		ownerId,
		{ syncStatus: false },
		{ sortBy: "createdAt", sortOrder: -1 },
	);
};

const classifyStorageItemByBusinessOwner = async (ownerId, itemId, category) => {
	if (![1, 2].includes(Number(category))) {
		throw new ApiError(
			StatusCodes.BAD_REQUEST,
			"Category must be 1 (material) or 2 (tool)",
		);
	}
	return storageItemService.generateTypeItems(
		itemId,
		{ category: Number(category) },
		ownerId,
	);
};

const updateStorageItemConversionByBusinessOwner = async (
	ownerId,
	itemId,
	conversionData,
) => {
	const { from, to } = conversionData;
	if (
		!from ||
		Number(from.itemQuantity) <= 0 ||
		!Array.isArray(to) ||
		to.length === 0 ||
		to.some(
			(item) =>
				!item.itemName?.trim() || Number(item.itemQuantity) <= 0,
		)
	) {
		throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid unit conversion data");
	}
	return storageItemService.updateUnitConversion(
		itemId,
		{
			from: { itemQuantity: Number(from.itemQuantity) },
			to: to.map((item) => ({
				itemName: item.itemName.trim(),
				itemQuantity: Number(item.itemQuantity),
			})),
		},
		ownerId,
	);
};

const getTaxDeadlineByBusinessOwner = async (ownerId) => {
	return businessOwnerService.getTaxDeadlineInfoByBusinessOwnerId(ownerId);
};

const getEasyInvoicesByBusinessOwner = async (ownerId, options = {}) => {
	const { page = 1, pageSize = 20 } = options;
	// Get business owner info
	const owner = await BusinessOwner.findById(ownerId).lean();
	if (!owner) {
		throw new ApiError(StatusCodes.NOT_FOUND, "Business owner not found");
	}

	// Check if EasyInvoice is configured
	if (
		!owner.easyInvoiceInfo ||
		typeof owner.easyInvoiceInfo !== "object" ||
		Object.keys(owner.easyInvoiceInfo).length === 0
	) {
		throw new ApiError(
			StatusCodes.BAD_REQUEST,
			"EasyInvoice configuration not found for this business owner",
		);
	}

	const easyInvoiceAccount = owner.easyInvoiceInfo.account;
	const easyInvoicePassword = owner.easyInvoiceInfo.password;
	const easyInvoiceSerial = owner.easyInvoiceInfo.serial;
	const easyInvoiceApiUrl = owner.easyInvoiceInfo.apiUrl;

	if (!easyInvoiceAccount || !easyInvoicePassword || !easyInvoiceSerial) {
		throw new ApiError(
			StatusCodes.BAD_REQUEST,
			"Missing required EasyInvoice credentials",
		);
	}

	// Calculate FromDate based on tax_filing_frequency and createdAt
	const taxFilingFrequency = owner.tax_filing_frequency || 1;
	const accountCreatedDate = new Date(owner.createdAt);
	const now = new Date();

	let fromDate;
	if (taxFilingFrequency === 2) {
		// Quarterly - get start of quarter before registration
		const createdQuarter = Math.floor(accountCreatedDate.getMonth() / 3);
		const createdYear = accountCreatedDate.getFullYear();
		fromDate = new Date(createdYear - 1, createdQuarter * 3, 1);
	} else {
		// Monthly - get start of month before registration
		fromDate = new Date(
			accountCreatedDate.getFullYear(),
			accountCreatedDate.getMonth(),
			1,
		);
	}

	// Format dates to DD/MM/YYYY
	const formatDate = (date) => {
		const day = String(date.getDate()).padStart(2, "0");
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const year = date.getFullYear();
		return `${day}/${month}/${year}`;
	};

	const FromDate = formatDate(fromDate);
	const ToDate = formatDate(now);

	// Call EasyInvoice service
	const result = await easyInvoiceService.getInvoiceByArisingDateRange(
		FromDate,
		ToDate,
		easyInvoiceAccount,
		easyInvoicePassword,
		easyInvoiceSerial,
		easyInvoiceApiUrl,
		page,
		pageSize,
	);

	return {
		success: true,
		data: result,
		dateRange: { FromDate, ToDate },
	};
};

const viewInvoiceByBusinessOwner = async (
	ownerId,
	Ikey,
	Pattern,
	Option,
	Serial,
) => {
	// Get business owner info
	const owner = await BusinessOwner.findById(ownerId).lean();
	if (!owner) {
		throw new ApiError(StatusCodes.NOT_FOUND, "Business owner not found");
	}

	// Check if EasyInvoice is configured
	if (
		!owner.easyInvoiceInfo ||
		typeof owner.easyInvoiceInfo !== "object" ||
		Object.keys(owner.easyInvoiceInfo).length === 0
	) {
		throw new ApiError(
			StatusCodes.BAD_REQUEST,
			"EasyInvoice configuration not found for this business owner",
		);
	}

	const easyInvoiceAccount = owner.easyInvoiceInfo.account;
	const easyInvoicePassword = owner.easyInvoiceInfo.password;
	const easyInvoiceSerial = owner.easyInvoiceInfo.serial;
	const easyInvoiceApiUrl = owner.easyInvoiceInfo.apiUrl;

	if (!easyInvoiceAccount || !easyInvoicePassword || !easyInvoiceSerial) {
		throw new ApiError(
			StatusCodes.BAD_REQUEST,
			"Missing required EasyInvoice credentials",
		);
	}

	// Call EasyInvoice service
	const result = await easyInvoiceService.viewInvoice(
		Ikey,
		Pattern,
		Option,
		Serial,
		easyInvoiceAccount,
		easyInvoicePassword,
		easyInvoiceSerial,
		easyInvoiceApiUrl,
	);

	return {
		success: true,
		data: result,
	};
};

export {
	// User Management
	getAllUsers,
	getUserById,
	createUser,
	updateUser,
	deleteUser,
	updateUserRole,
	// Business Owner Management
	getAllBusinessOwners,
	getBusinessOwnerById,
	resolveAccessibleBusinessOwnerId,
	getBusinessOwnerTaxCredentials,
	// Accountant Management
	getAllAccountants,
	getAccountantById,
	// Statistics
	getSystemStats,
	getUserStats,
	getInvoiceStats,
	// Invoice Management
	getInvoicesInByBusinessOwner,
	getOutputInvoicesByBusinessOwner,
	// Storage Management
	getStorageItemsByBusinessOwner,
	getUnclassifiedStorageItemsByBusinessOwner,
	classifyStorageItemByBusinessOwner,
	updateStorageItemConversionByBusinessOwner,
	// Product Management
	getProductsByBusinessOwner,
	// Tax Statistics
	getTaxStatisticsByBusinessOwner,
	getTaxDeadlineByBusinessOwner,
	// EasyInvoice Management
	getEasyInvoicesByBusinessOwner,
	viewInvoiceByBusinessOwner,
};
