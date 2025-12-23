"use strict";

import * as outputInvoiceService from "../services/outputInvoiceService.js";
import { StatusCodes } from "http-status-codes";

const create = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const result = await outputInvoiceService.createOutputInvoice(
			req.body,
			userId
		);
		res.status(StatusCodes.CREATED).json(result);
	} catch (err) {
		next(err);
	}
};

const getById = async (req, res, next) => {
	try {
		const id = req.params.id;
		const result = await outputInvoiceService.getOutputInvoiceById(id);
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
		const result = await outputInvoiceService.listOutputInvoices(
			filter,
			options
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const update = async (req, res, next) => {
	try {
		const id = req.params.id;
		const result = await outputInvoiceService.updateOutputInvoice(id, req.body);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const remove = async (req, res, next) => {
	try {
		const id = req.params.id;
		const result = await outputInvoiceService.deleteOutputInvoice(id);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const getTotalTaxes = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const BusinessOwner = (await import("../models/BusinessOwner.js")).default;
		const owner = await BusinessOwner.findOne({ userId });
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "BusinessOwner not found" });
		}

		const filter = {};
		if (req.query.startDate || req.query.endDate) {
			filter.createdAt = {};
			if (req.query.startDate) {
				filter.createdAt.$gte = new Date(req.query.startDate);
			}
			if (req.query.endDate) {
				filter.createdAt.$lte = new Date(req.query.endDate);
			}
		}

		const result = await outputInvoiceService.getTotalTaxesByBusinessOwner(
			owner._id,
			filter
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

export { create, getById, list, update, remove, getTotalTaxes };
