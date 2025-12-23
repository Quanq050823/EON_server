"use strict";

import Product from "../models/Product.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";

const createProduct = async (ownerId, data) => {
	const existed = await Product.findOne({ ownerId, code: data.code });
	if (existed)
		throw new ApiError(
			StatusCodes.BAD_REQUEST,
			"Product code already exists for this business owner"
		);
	const product = new Product({ ownerId, ...data });
	await product.save();
	return product;
};

const getProductById = async (id) => {
	const product = await Product.findById(id);
	if (!product) throw new ApiError(StatusCodes.NOT_FOUND, "Product not found");
	return product;
};

const updateProduct = async (id, data) => {
	const updated = await Product.findByIdAndUpdate(
		id,
		{ $set: data },
		{ new: true, runValidators: true }
	);
	if (!updated) throw new ApiError(StatusCodes.NOT_FOUND, "Product not found");
	return updated;
};

const deleteProduct = async (id) => {
	const deleted = await Product.findByIdAndDelete(id);
	if (!deleted) throw new ApiError(StatusCodes.NOT_FOUND, "Product not found");
	return { message: "Product deleted" };
};

const listProducts = async (ownerId, filter = {}, options = {}) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = -1,
	} = options;
	const skip = (page - 1) * limit;
	const query = Product.find({ ownerId, ...filter })
		.sort({ [sortBy]: sortOrder })
		.skip(skip)
		.limit(limit);
	const [results, total] = await Promise.all([
		query.exec(),
		Product.countDocuments({ ownerId, ...filter }),
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

export {
	createProduct,
	getProductById,
	updateProduct,
	deleteProduct,
	listProducts,
};
