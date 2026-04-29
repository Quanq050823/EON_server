"use strict";

import mongoose from "mongoose";
import StorageItem from "../models/StorageItem.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";

const createStorageItem = async (data, businessOwnerId) => {
	const existing = await StorageItem.findOne({
		name: { $regex: new RegExp(`^${data.name.trim()}$`, "i") },
		businessOwnerId,
	});
	if (existing) {
		throw new ApiError(
			StatusCodes.CONFLICT,
			`Nguyên liệu "${data.name}" đã tồn tại`
		);
	}
	const item = new StorageItem({ ...data, businessOwnerId });
	await item.save();
	return item;
};

const getStorageItemById = async (id, businessOwnerId) => {
	const item = await StorageItem.findOne({ _id: id, businessOwnerId });
	if (!item)
		throw new ApiError(StatusCodes.NOT_FOUND, "Storage item not found");
	return item;
};

const listStorageItems = async (businessOwnerId, filter = {}, options = {}) => {
	const { sortBy = "createdAt", sortOrder = -1 } = options;
	const query = StorageItem.find({ businessOwnerId, ...filter }).sort({
		[sortBy]: sortOrder,
	});
	const [results] = await Promise.all([
		query.exec(),
		StorageItem.countDocuments({ businessOwnerId, ...filter }),
	]);
	return {
		data: results,
	};
};

const updateStorageItem = async (id, data, businessOwnerId) => {
	const item = await StorageItem.findOneAndUpdate(
		{ _id: id, businessOwnerId },
		data,
		{ new: true }
	);
	if (!item)
		throw new ApiError(StatusCodes.NOT_FOUND, "Storage item not found");
	return item;
};

const deleteStorageItem = async (id, businessOwnerId) => {
	const item = await StorageItem.findOneAndDelete({ _id: id, businessOwnerId });
	if (!item)
		throw new ApiError(StatusCodes.NOT_FOUND, "Storage item not found");
	return item;
};

const generateTypeItems = async (id, data, businessOwnerId) => {
	const item = await StorageItem.findOneAndUpdate(
		{ _id: id, businessOwnerId },
		{ category: data.category, syncStatus: true },
		{ new: true }
	);
	if (!item)
		throw new ApiError(StatusCodes.NOT_FOUND, "Storage item not found");
	return item;
};

const updateUnitConversion = async (id, conversionData, businessOwnerId) => {
	const updateData = {
		conversionUnit: {
			...conversionData,
			isActive: true,
		},
	};

	const item = await StorageItem.findOneAndUpdate(
		{ _id: id, businessOwnerId },
		updateData,
		{ new: true }
	);

	if (!item)
		throw new ApiError(StatusCodes.NOT_FOUND, "Storage item not found");
	return item;
};

const getStorageItemIdByName = async (name, businessOwnerId) => {
	const item = await StorageItem.findOne({ name, businessOwnerId }).select(
		"_id"
	);
	if (!item)
		throw new ApiError(StatusCodes.NOT_FOUND, "Storage item not found");
	return item;
};

const getStorageItemByIdFromBody = async (id, businessOwnerId) => {
	const item = await StorageItem.findOne({ _id: id, businessOwnerId });
	if (!item)
		throw new ApiError(StatusCodes.NOT_FOUND, "Storage item not found");
	return item;
};

/**
 * Gộp duplicate vào master:
 * - Cộng stock (có quy đổi đơn vị nếu cần)
 * - Lưu tên + đơn vị + hệ số quy đổi của duplicate vào syncAliases của master
 * - Xóa duplicate
 * @param {string} masterId - ID của item master (giữ lại)
 * @param {string} duplicateId - ID của item sẽ bị xóa
 * @param {number} conversionFactor - 1 [duplicate.unit] = conversionFactor [master.unit]
 * @param {string} businessOwnerId
 */
const mergeStorageItems = async (masterId, duplicateId, conversionFactor, businessOwnerId) => {
	if (masterId === duplicateId) {
		throw new ApiError(StatusCodes.BAD_REQUEST, "Không thể gộp một nguyên liệu với chính nó");
	}

	const [master, duplicate] = await Promise.all([
		StorageItem.findOne({ _id: masterId, businessOwnerId }),
		StorageItem.findOne({ _id: duplicateId, businessOwnerId }),
	]);

	if (!master) throw new ApiError(StatusCodes.NOT_FOUND, "Nguyên liệu master không tồn tại");
	if (!duplicate) throw new ApiError(StatusCodes.NOT_FOUND, "Nguyên liệu cần gộp không tồn tại");

	const factor = typeof conversionFactor === "number" && conversionFactor > 0 ? conversionFactor : 1;
	const addedStock = duplicate.stock * factor;

	// Dedup alias: không thêm nếu tên đã có trong syncAliases hoặc trùng tên master
	const existingAliasNames = master.syncAliases.map((a) => a.name.toLowerCase());
	const newAliases = [...master.syncAliases];
	if (
		duplicate.name.toLowerCase() !== master.name.toLowerCase() &&
		!existingAliasNames.includes(duplicate.name.toLowerCase())
	) {
		newAliases.push({
			name: duplicate.name,
			unit: duplicate.unit,
			conversionFactor: factor,
		});
		// Thêm cả các alias của duplicate vào master (kế thừa chuỗi alias)
		for (const alias of duplicate.syncAliases) {
			if (
				alias.name.toLowerCase() !== master.name.toLowerCase() &&
				!newAliases.some((a) => a.name.toLowerCase() === alias.name.toLowerCase())
			) {
				newAliases.push({
					name: alias.name,
					unit: alias.unit,
					// factor kế thừa: 1 alias.unit = alias.conversionFactor [duplicate.unit] = alias.conversionFactor * factor [master.unit]
					conversionFactor: alias.conversionFactor * factor,
				});
			}
		}
	}

	const updatedMaster = await StorageItem.findByIdAndUpdate(
		masterId,
		{ $set: { stock: master.stock + addedStock, syncAliases: newAliases } },
		{ new: true }
	);

	await StorageItem.findByIdAndDelete(duplicateId);

	return { updatedMaster, duplicateStockTransferred: addedStock, duplicateName: duplicate.name };
};

export {
	createStorageItem,
	getStorageItemById,
	listStorageItems,
	updateStorageItem,
	deleteStorageItem,
	generateTypeItems,
	updateUnitConversion,
	getStorageItemIdByName,
	getStorageItemByIdFromBody,
	mergeStorageItems,
};
