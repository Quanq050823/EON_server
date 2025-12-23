"use strict";

import * as adminService from "../services/adminService.js";
import { StatusCodes } from "http-status-codes";

// User Management
const getAllUsers = async (req, res, next) => {
	try {
		const { page, limit, sortBy, sortOrder, role, isVerified, userType } =
			req.query;
		const filter = {};
		if (role) filter.role = role;
		if (isVerified !== undefined) filter.isVerified = isVerified === "true";
		if (userType !== undefined) filter.userType = parseInt(userType);

		const options = {
			page: parseInt(page) || 1,
			limit: parseInt(limit) || 10,
			sortBy: sortBy || "createDate",
			sortOrder: parseInt(sortOrder) || -1,
		};
		const result = await adminService.getAllUsers(filter, options);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const getUserById = async (req, res, next) => {
	try {
		const { userId } = req.params;
		const result = await adminService.getUserById(userId);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const createUser = async (req, res, next) => {
	try {
		const data = req.body;
		const result = await adminService.createUser(data);
		res.status(StatusCodes.CREATED).json(result);
	} catch (err) {
		next(err);
	}
};

const updateUser = async (req, res, next) => {
	try {
		const { userId } = req.params;
		const data = req.body;
		const result = await adminService.updateUser(userId, data);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const deleteUser = async (req, res, next) => {
	try {
		const { userId } = req.params;
		const result = await adminService.deleteUser(userId);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const updateUserRole = async (req, res, next) => {
	try {
		const { userId } = req.params;
		const { role } = req.body;
		const result = await adminService.updateUserRole(userId, role);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

// Business Owner Management
const getAllBusinessOwners = async (req, res, next) => {
	try {
		const { page, limit, sortBy, sortOrder } = req.query;
		const options = {
			page: parseInt(page) || 1,
			limit: parseInt(limit) || 10,
			sortBy: sortBy || "createdAt",
			sortOrder: parseInt(sortOrder) || -1,
		};
		const result = await adminService.getAllBusinessOwners(options);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const getBusinessOwnerById = async (req, res, next) => {
	try {
		const { ownerId } = req.params;
		const result = await adminService.getBusinessOwnerById(ownerId);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

// Accountant Management
const getAllAccountants = async (req, res, next) => {
	try {
		const { page, limit, sortBy, sortOrder } = req.query;
		const options = {
			page: parseInt(page) || 1,
			limit: parseInt(limit) || 10,
			sortBy: sortBy || "createdAt",
			sortOrder: parseInt(sortOrder) || -1,
		};
		const result = await adminService.getAllAccountants(options);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const getAccountantById = async (req, res, next) => {
	try {
		const { accountantId } = req.params;
		const result = await adminService.getAccountantById(accountantId);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

// Statistics & Dashboard
const getSystemStats = async (req, res, next) => {
	try {
		const result = await adminService.getSystemStats();
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const getUserStats = async (req, res, next) => {
	try {
		const result = await adminService.getUserStats();
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const getInvoiceStats = async (req, res, next) => {
	try {
		const { startDate, endDate } = req.query;
		const result = await adminService.getInvoiceStats(startDate, endDate);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
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
