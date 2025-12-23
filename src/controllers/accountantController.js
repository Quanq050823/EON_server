"use strict";

import * as accountantService from "../services/accountantService.js";
import { StatusCodes } from "http-status-codes";

const create = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const data = req.body;
		const result = await accountantService.createAccountant(userId, data);
		res.status(StatusCodes.CREATED).json(result);
	} catch (err) {
		next(err);
	}
};

const getByUserId = async (req, res, next) => {
	try {
		const userId = req.params.userId || req.user.userId;
		const result = await accountantService.getAccountantByUserId(userId);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const update = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const data = req.body;
		const result = await accountantService.updateAccountant(userId, data);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const remove = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const result = await accountantService.deleteAccountant(userId);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const list = async (req, res, next) => {
	try {
		const { page, limit, sortBy, sortOrder, ...filter } = req.query;
		const options = {
			page: parseInt(page) || 1,
			limit: parseInt(limit) || 10,
			sortBy: sortBy || "createdAt",
			sortOrder: parseInt(sortOrder) || -1,
		};
		const result = await accountantService.listAccountants(filter, options);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

export { create, getByUserId, update, remove, list };
