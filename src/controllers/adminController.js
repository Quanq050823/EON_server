"use strict";

import * as adminService from "../services/adminService.js";
import * as inventoryAnalyticsService from "../services/inventoryAnalyticsService.js";
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
		const result = await adminService.getAllBusinessOwners(options, req.user);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const getBusinessOwnerById = async (req, res, next) => {
	try {
		const ownerId = await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
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

// Invoice Management
const getInvoicesInByBusinessOwner = async (req, res, next) => {
	try {
		const ownerId = await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
		const { page, limit, sortBy, sortOrder, search, status } = req.query;
		const options = {
			page: parseInt(page) || 1,
			limit: parseInt(limit) || 10,
			sortBy: sortBy || "tdlap",
			sortOrder: parseInt(sortOrder) || -1,
			search: search || "",
			status: status || "",
		};
		const result = await adminService.getInvoicesInByBusinessOwner(
			ownerId,
			options,
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const getOutputInvoicesByBusinessOwner = async (req, res, next) => {
	try {
		const ownerId = await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
		const { page, limit, sortBy, sortOrder, search, status } = req.query;
		const options = {
			page: parseInt(page) || 1,
			limit: parseInt(limit) || 10,
			sortBy: sortBy || "tdlap",
			sortOrder: parseInt(sortOrder) || -1,
			search: search || "",
			status: status || "",
		};
		const result = await adminService.getOutputInvoicesByBusinessOwner(
			ownerId,
			options,
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const getStorageItemsByBusinessOwner = async (req, res, next) => {
	try {
		const ownerId = await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
		const { page, limit, sortBy, sortOrder, search, category, syncStatus } =
			req.query;
		const options = {
			page: parseInt(page) || 1,
			limit: parseInt(limit) || 10,
			sortBy: sortBy || "createdAt",
			sortOrder: parseInt(sortOrder) || -1,
			search: search || "",
			category: category || "",
			syncStatus: syncStatus ?? "",
		};
		const result = await adminService.getStorageItemsByBusinessOwner(
			ownerId,
			options,
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const getProductsByBusinessOwner = async (req, res, next) => {
	try {
		const ownerId = await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
		const { page, limit, sortBy, sortOrder, search, category, isActive } =
			req.query;
		const options = {
			page: parseInt(page) || 1,
			limit: parseInt(limit) || 10,
			sortBy: sortBy || "createdAt",
			sortOrder: parseInt(sortOrder) || -1,
			search: search || "",
			category: category || "",
			isActive: isActive || "",
		};
		const result = await adminService.getProductsByBusinessOwner(
			ownerId,
			options,
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

// Tax Statistics
const getTaxStatisticsByBusinessOwner = async (req, res, next) => {
	try {
		const ownerId = await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
		const { period, year, month, quarter } = req.query;
		const options = { period, year, month, quarter };
		const result = await adminService.getTaxStatisticsByBusinessOwner(
			ownerId,
			options,
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const getSyncedStorageItemsByBusinessOwner = async (req, res, next) => {
	try {
		const ownerId = await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
		const result = await inventoryAnalyticsService.getSyncedItems(ownerId);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const getStockSummaryByBusinessOwner = async (req, res, next) => {
	try {
		const ownerId = await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
		const result = await inventoryAnalyticsService.getStockSummary(
			ownerId,
			req.query,
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const getInventoryReportByBusinessOwner = async (req, res, next) => {
	try {
		const ownerId = await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
		const result = await inventoryAnalyticsService.getInventoryReport(
			ownerId,
			req.query,
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const upsertOpeningBalanceByBusinessOwner = async (req, res, next) => {
	try {
		const ownerId = await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
		const result = await inventoryAnalyticsService.upsertOpeningBalance(
			ownerId,
			req.user.userId,
			req.body,
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const getUnclassifiedStorageItemsByBusinessOwner = async (req, res, next) => {
	try {
		const ownerId = await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
		const result =
			await adminService.getUnclassifiedStorageItemsByBusinessOwner(ownerId);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const classifyStorageItemByBusinessOwner = async (req, res, next) => {
	try {
		const ownerId = await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
		const result = await adminService.classifyStorageItemByBusinessOwner(
			ownerId,
			req.params.itemId,
			req.body.category,
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const updateStorageItemConversionByBusinessOwner = async (req, res, next) => {
	try {
		const ownerId = await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
		const result =
			await adminService.updateStorageItemConversionByBusinessOwner(
				ownerId,
				req.params.itemId,
				req.body,
			);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const getTaxDeadlineByBusinessOwner = async (req, res, next) => {
	try {
		const ownerId = await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
		const result = await adminService.getTaxDeadlineByBusinessOwner(ownerId);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const getEasyInvoicesByBusinessOwner = async (req, res, next) => {
	try {
		const ownerId = await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
		const { page, pageSize } = req.query;
		const options = {
			page: parseInt(page) || 1,
			pageSize: parseInt(pageSize) || 20,
		};
		const result = await adminService.getEasyInvoicesByBusinessOwner(ownerId, options);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const viewInvoiceByBusinessOwner = async (req, res, next) => {
	try {
		const ownerId = await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
		const { Ikey, Pattern, Option, Serial } = req.body;
		const result = await adminService.viewInvoiceByBusinessOwner(
			ownerId,
			Ikey,
			Pattern,
			Option,
			Serial,
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const importAndIssueInvoiceByBusinessOwner = async (req, res, next) => {
	try {
		const ownerId = await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
		const result = await adminService.importAndIssueInvoiceByBusinessOwner(
			ownerId,
			req.body?.invoiceData,
		);
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
	// Invoice Management
	getInvoicesInByBusinessOwner,
	getOutputInvoicesByBusinessOwner,
	// Storage Management
	getStorageItemsByBusinessOwner,
	getSyncedStorageItemsByBusinessOwner,
	getStockSummaryByBusinessOwner,
	getInventoryReportByBusinessOwner,
	upsertOpeningBalanceByBusinessOwner,
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
	importAndIssueInvoiceByBusinessOwner,
};
