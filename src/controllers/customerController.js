"use strict";

import * as customerService from "../services/customerService.js";
import { StatusCodes } from "http-status-codes";
import Customer from "../models/Customer.js";
import BusinessOwner from "../models/BusinessOwner.js";

const create = async (req, res, next) => {
	try {
		const userId = req.user.userId;

		const owner = await BusinessOwner.findOne({ userId });
		if (!owner)
			return res.status(404).json({ message: "BusinessOwner not found" });

		const customer = await customerService.createCustomer(owner._id, req.body);

		res.status(StatusCodes.CREATED).json(customer);
	} catch (err) {
		next(err);
	}
};

const getById = async (req, res, next) => {
	try {
		const id = req.params.id;
		const result = await customerService.getCustomerById(id);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const update = async (req, res, next) => {
	try {
		const id = req.params.id;
		const data = req.body;
		const result = await customerService.updateCustomer(id, data);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const remove = async (req, res, next) => {
	try {
		const id = req.params.id;
		const result = await customerService.deleteCustomer(id);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const list = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await BusinessOwner.findOne({ userId });

		if (!owner)
			return res.status(404).json({ message: "BusinessOwner not found" });

		const {
			page,
			limit,
			sortBy,
			sortOrder,
			search,
			status,
			customerType,
			tags,
			...filter
		} = req.query;

		let parsedTags = [];
		if (tags) {
			parsedTags = Array.isArray(tags) ? tags : tags.split(",");
		}

		const options = {
			page: parseInt(page) || 1,
			limit: parseInt(limit) || 10,
			sortBy: sortBy || "createdAt",
			sortOrder: parseInt(sortOrder) || -1,
		};

		const filterObj = {
			...filter,
			...(search && { search }),
			...(status && { status }),
			...(customerType && { customerType }),
			...(parsedTags.length > 0 && { tags: parsedTags }),
		};

		const result = await customerService.listCustomers(
			owner._id,
			filterObj,
			options
		);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const listMyCustomers = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await BusinessOwner.findOne({ userId });
		if (!owner)
			return res.status(404).json({ message: "BusinessOwner not found" });

		const customers = await Customer.find({ ownerId: owner._id });
		res.status(200).json(customers);
	} catch (err) {
		next(err);
	}
};

const getStats = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await BusinessOwner.findOne({ userId });

		if (!owner)
			return res.status(404).json({ message: "BusinessOwner not found" });

		const stats = await customerService.getCustomerStats(owner._id);
		res.status(StatusCodes.OK).json(stats);
	} catch (err) {
		next(err);
	}
};

const search = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await BusinessOwner.findOne({ userId });

		if (!owner)
			return res.status(404).json({ message: "BusinessOwner not found" });

		const { q } = req.query;
		if (!q) {
			return res.status(400).json({ message: "Search term is required" });
		}

		const customers = await customerService.searchCustomers(owner._id, q);
		res.status(StatusCodes.OK).json(customers);
	} catch (err) {
		next(err);
	}
};

export {
	create,
	getById,
	update,
	remove,
	list,
	listMyCustomers,
	getStats,
	search,
};
