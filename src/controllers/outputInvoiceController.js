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

		const { periodType, year, period, startDate, endDate } = req.query;

		if (periodType && year) {
			const yearNum = parseInt(year);
			let startMonth, endMonth;

			if (periodType === "month" && period) {
				const monthNum = parseInt(period);
				startMonth = monthNum;
				endMonth = monthNum;
			} else if (periodType === "quarter" && period) {
				const quarterNum = parseInt(period);
				startMonth = (quarterNum - 1) * 3 + 1;
				endMonth = quarterNum * 3;
			} else if (periodType === "all") {
				startMonth = 1;
				endMonth = 12;
			} else if (periodType === "month") {
				startMonth = 1;
				endMonth = 12;
			} else if (periodType === "quarter") {
				startMonth = 1;
				endMonth = 12;
			}

			if (startMonth && endMonth) {
				filter.createdAt = {
					$gte: new Date(yearNum, startMonth - 1, 1),
					$lte: new Date(yearNum, endMonth, 0, 23, 59, 59, 999),
				};
			}
		} else if (startDate || endDate) {
			filter.createdAt = {};
			if (startDate) {
				filter.createdAt.$gte = new Date(startDate);
			}
			if (endDate) {
				filter.createdAt.$lte = new Date(endDate);
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
