"use strict";

import * as productService from "../services/productService.js";
import * as storageItemService from "../services/storageItemService.js";
import { StatusCodes } from "http-status-codes";
import Product from "../models/Product.js";
import BusinessOwner from "../models/BusinessOwner.js";

const create = async (req, res, next) => {
	try {
		const userId = req.user.userId;

		const owner = await BusinessOwner.findOne({ userId });
		if (!owner)
			return res.status(404).json({ message: "BusinessOwner not found" });
		if (req.body.materials && Array.isArray(req.body.materials)) {
			const storageItems = await storageItemService.listStorageItems(
				owner._id,
				{},
				{ limit: 1000 }
			);
			const validUnitsSet = new Set();

			storageItems.data.forEach((item) => {
				if (item.unit) {
					validUnitsSet.add(item.unit);
				}
				if (
					item.conversionUnit &&
					item.conversionUnit.to &&
					Array.isArray(item.conversionUnit.to)
				) {
					item.conversionUnit.to.forEach((conversion) => {
						if (conversion.itemName) {
							validUnitsSet.add(conversion.itemName);
						}
					});
				}
				if (item.unitConversions && Array.isArray(item.unitConversions)) {
					item.unitConversions.forEach((conversion) => {
						if (conversion.to && Array.isArray(conversion.to)) {
							conversion.to.forEach((subUnit) => {
								if (subUnit.itemName) {
									validUnitsSet.add(subUnit.itemName);
								}
							});
						}
					});
				}
			});

			const validUnits = Array.from(validUnitsSet);
			for (const material of req.body.materials) {
				if (material.unit && !validUnits.includes(material.unit)) {
					return res.status(StatusCodes.BAD_REQUEST).json({
						message: `Định lượng '${material.unit}' Cần phải chuyển đổi đơn vị để thống nhất với sản phẩm`,
					});
				}
			}
		}

		let productData = { ...req.body, ownerId: owner._id };
		if (!productData.code || productData.code.trim() === "") {
			// Generate code: first letters of each word in name
			const name = productData.name || "";
			const initials = name
				.split(/\s+/)
				.map((word) => (word[0] ? word[0].toUpperCase() : ""))
				.join("");
			let baseCode = initials || "PRD";
			let code = baseCode;
			let suffix = 1;
			// Ensure uniqueness for this owner
			while (await Product.findOne({ ownerId: owner._id, code })) {
				code = `${baseCode}${suffix}`;
				suffix++;
			}
			productData.code = code;
		}
		const product = await Product.create(productData);
		res.status(StatusCodes.CREATED).json(product);
	} catch (err) {
		next(err);
	}
};

const getById = async (req, res, next) => {
	try {
		const id = req.params.id;
		const result = await productService.getProductById(id);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const update = async (req, res, next) => {
	try {
		const id = req.params.id;
		const data = req.body;
		const result = await productService.updateProduct(id, data);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const remove = async (req, res, next) => {
	try {
		const id = req.params.id;
		const result = await productService.deleteProduct(id);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const list = async (req, res, next) => {
	try {
		const ownerId = req.user.userId;
		const { page, limit, sortBy, sortOrder, ...filter } = req.query;
		const options = {
			page: parseInt(page) || 1,
			limit: parseInt(limit) || 10,
			sortBy: sortBy || "createdAt",
			sortOrder: parseInt(sortOrder) || -1,
		};
		const result = await productService.listProducts(ownerId, filter, options);
		res.status(StatusCodes.OK).json(result);
	} catch (err) {
		next(err);
	}
};

const listMyProducts = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await BusinessOwner.findOne({ userId });
		if (!owner)
			return res.status(404).json({ message: "BusinessOwner not found" });

		const products = await Product.find({ ownerId: owner._id });
		res.status(200).json(products);
	} catch (err) {
		next(err);
	}
};

export { create, getById, update, remove, list, listMyProducts };
