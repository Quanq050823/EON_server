"use strict";

import * as employeeService from "../services/employeeService.js";
import { StatusCodes } from "http-status-codes";

import { getBusinessOwnerByUserId } from "../services/businessOwnerService.js";

const create = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}
		const result = await employeeService.createEmployee(req.body, owner._id);
		res.status(StatusCodes.CREATED).json(result);
	} catch (err) {
		next(err);
	}
};

const getAllByOwner = async (req, res, next) => {
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
			sortBy: sortBy || "hire_date",
			sortOrder: sortOrder ? parseInt(sortOrder) : -1,
		};
		const result = await employeeService.listEmployees(
			owner._id,
			filter,
			options
		);
		res.status(StatusCodes.OK).json(result);
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
		const result = await employeeService.getEmployeeById(
			req.params.id,
			owner._id
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
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
		const result = await employeeService.updateEmployee(
			req.params.id,
			req.body,
			owner._id
		);
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
		const result = await employeeService.deleteEmployee(
			req.params.id,
			owner._id
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

export { create, getAllByOwner, getById, update, remove };
