"use strict";

import User from "../models/User.js";
import BusinessOwner from "../models/BusinessOwner.js";
import Accountant from "../models/Accountant.js";
import OutputInvoice from "../models/OutputInvoice.js";
import InvoicesIn from "../models/InvoicesIn.js";
import Employee from "../models/Employee.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcryptjs";

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
		}
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
		{ new: true, projection: { password: 0, refreshToken: 0, otp: 0 } }
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
		{ new: true, projection: { password: 0, refreshToken: 0, otp: 0 } }
	).lean();

	if (!updatedUser) {
		throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
	}

	return { success: true, data: updatedUser };
};

// Business Owner Management
const getAllBusinessOwners = async (options = {}) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = -1,
	} = options;
	const skip = (page - 1) * limit;

	const [results, total] = await Promise.all([
		BusinessOwner.find()
			.populate("userId", "name email avatar isVerified")
			.sort({ [sortBy]: sortOrder })
			.skip(skip)
			.limit(limit)
			.lean(),
		BusinessOwner.countDocuments(),
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
	// Accountant Management
	getAllAccountants,
	getAccountantById,
	// Statistics
	getSystemStats,
	getUserStats,
	getInvoiceStats,
};
