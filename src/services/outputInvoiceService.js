"use strict";

import { StatusCodes } from "http-status-codes";
import BusinessOwner from "../models/BusinessOwner.js";
import OutputInvoice from "../models/OutputInvoice.js";
import Product from "../models/Product.js";
import StorageItem from "../models/StorageItem.js";
import ApiError from "../utils/ApiError.js";

const generateRandomInvoiceNumber = () => {
	const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	let result = "";
	for (let i = 0; i < 7; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return result;
};

const generateInvoiceNumber = async (businessOwnerId) => {
	const currentYear = new Date().getFullYear();
	const yearSuffix = currentYear.toString().slice(-2); // Lấy 2 số cuối năm

	let isUnique = false;
	let invoiceCodes;
	let attempts = 0;
	const maxAttempts = 10;

	while (!isUnique && attempts < maxAttempts) {
		const randomNumber = generateRandomInvoiceNumber();

		invoiceCodes = {
			khmshdon: `1C${yearSuffix}TAA`,
			khhdon: `AA/${yearSuffix}E`,
			shdon: randomNumber,
			mhdon: `01GTKT0/${randomNumber}`,
		};
		const existed = await OutputInvoice.findOne({
			businessOwnerId,
			mhdon: invoiceCodes.mhdon,
		});

		if (!existed) {
			isUnique = true;
		}
		attempts++;
	}

	if (!isUnique) {
		throw new ApiError(
			StatusCodes.INTERNAL_SERVER_ERROR,
			"Lỗi tạo hóa đơn, vui lòng thử lại"
		);
	}

	return invoiceCodes;
};

const convertUnit = (quantity, fromUnit, toUnit, storageItem) => {
	if (fromUnit === toUnit) return quantity;
	if (
		storageItem.conversionUnit &&
		storageItem.conversionUnit.to &&
		Array.isArray(storageItem.conversionUnit.to)
	) {
		const baseUnit = storageItem.unit;
		if (toUnit === baseUnit) {
			const fromConversion = storageItem.conversionUnit.to.find(
				(c) => c.itemName === fromUnit
			);
			if (fromConversion) {
				return quantity / fromConversion.itemQuantity;
			}
		}
		if (fromUnit === baseUnit) {
			const toConversion = storageItem.conversionUnit.to.find(
				(c) => c.itemName === toUnit
			);
			if (toConversion) {
				return quantity * toConversion.itemQuantity;
			}
		}

		const fromConv = storageItem.conversionUnit.to.find(
			(c) => c.itemName === fromUnit
		);
		const toConv = storageItem.conversionUnit.to.find(
			(c) => c.itemName === toUnit
		);
		if (fromConv && toConv) {
			const baseQuantity = quantity / fromConv.itemQuantity;
			return baseQuantity * toConv.itemQuantity;
		}
	}

	// Không còn hỗ trợ unitConversions - DB chỉ có conversionUnit
	throw new ApiError(
		StatusCodes.BAD_REQUEST,
		`Không tìm thấy quy đổi đơn vị từ ${fromUnit} sang ${toUnit} cho "${storageItem.name}"`
	);
};

const deductMaterialsFromStorage = async (materials, ownerId) => {
	for (const material of materials) {
		let storageItem;

		if (material.component && material.component.match(/^[0-9a-fA-F]{24}$/)) {
			storageItem = await StorageItem.findOne({
				_id: material.component,
				businessOwnerId: ownerId,
			});
		}

		if (!storageItem) {
			storageItem = await StorageItem.findOne({
				name: material.component,
				businessOwnerId: ownerId,
			});
		}

		if (!storageItem) {
			throw new ApiError(
				StatusCodes.NOT_FOUND,
				`Không tìm thấy nguyên liệu "${material.component}" trong kho`
			);
		}

		let quantityToDeduct = parseFloat(material.quantity) || 0;

		if (material.unit !== storageItem.unit) {
			quantityToDeduct = convertUnit(
				quantityToDeduct,
				material.unit,
				storageItem.unit,
				storageItem
			);
		}

		if (storageItem.stock < quantityToDeduct) {
			throw new ApiError(
				StatusCodes.BAD_REQUEST,
				`Không đủ số lượng tồn kho cho nguyên liệu "${storageItem.name}". Cần: ${quantityToDeduct} ${storageItem.unit}, Tồn kho: ${storageItem.stock} ${storageItem.unit}`
			);
		}

		storageItem.stock -= quantityToDeduct;
		await storageItem.save();
	}
};

const createOutputInvoice = async (data, userId) => {
	const owner = await BusinessOwner.findOne({ userId });
	if (!owner) {
		throw new ApiError(StatusCodes.NOT_FOUND, "BusinessOwner not found");
	}

	const invoiceCodes = await generateInvoiceNumber(owner._id);

	const fullAddress = `${owner.address.street}, ${owner.address.ward}, ${owner.address.district}, ${owner.address.city}`;

	let totalGTGT = 0;
	let totalTNCN = 0;

	if (data.hdhhdvu && Array.isArray(data.hdhhdvu)) {
		data.hdhhdvu = data.hdhhdvu.map((item) => {
			const thtien = parseFloat(item.thtien) || 0;
			const tchat = parseInt(item.tchat);

			let gtgt = 0;
			let tncn = 0;

			if (tchat === 1) {
				gtgt = thtien * 0.01;
				tncn = thtien * 0.005;
			} else if (tchat === 2) {
				gtgt = thtien * 0.05;
				tncn = thtien * 0.02;
			}

			const roundedGTGT = Math.round(gtgt);
			const roundedTNCN = Math.round(tncn);

			totalGTGT += roundedGTGT;
			totalTNCN += roundedTNCN;

			return {
				...item,
				gtgt: roundedGTGT,
				tncn: roundedTNCN,
			};
		});

		for (const item of data.hdhhdvu) {
			if (item.ten) {
				const product = await Product.findOne({
					name: item.ten,
					ownerId: owner._id,
				});

				if (product && product.materials && product.materials.length > 0) {
					const quantitySold = parseFloat(item.sluong) || 0;
					const materialsNeeded = product.materials.map((m) => ({
						component: m.component,
						quantity: parseFloat(m.quantity) * quantitySold,
						unit: m.unit,
					}));

					await deductMaterialsFromStorage(materialsNeeded, owner._id);
				} else {
					const storageItem = await StorageItem.findOne({
						name: item.ten,
						businessOwnerId: owner._id,
					});

					if (storageItem) {
						const quantityToDeduct = parseFloat(item.sluong) || 0;

						if (storageItem.stock < quantityToDeduct) {
							throw new ApiError(
								StatusCodes.BAD_REQUEST,
								`Không đủ số lượng tồn kho cho sản phẩm "${storageItem.name}". Tồn kho: ${storageItem.stock}`
							);
						}

						storageItem.stock -= quantityToDeduct;
						await storageItem.save();

						console.log(
							`Đã khấu trừ ${quantityToDeduct} ${storageItem.unit} từ kho cho sản phẩm "${storageItem.name}". Tồn kho còn: ${storageItem.stock}`
						);
					} else {
						console.warn(
							`Không tìm thấy sản phẩm trong kho với tên: ${item.ten}`
						);
					}
				}
			}
		}
	}

	const invoiceData = {
		...data,
		businessOwnerId: owner._id,
		nbmst: owner.taxCode,
		nbten: owner.businessName,
		nbdchi: fullAddress,
		...invoiceCodes,
		ncnhat: new Date(),
		totalGTGT,
		totalTNCN,
	};

	const invoice = new OutputInvoice(invoiceData);
	return await invoice.save();
};

const getOutputInvoiceById = async (id) => {
	const invoice = await OutputInvoice.findById(id);
	if (!invoice)
		throw new ApiError(StatusCodes.NOT_FOUND, "Output invoice not found");
	return invoice;
};

const listOutputInvoices = async (filter = {}, options = {}) => {
	const { sortBy = "createdAt", sortOrder = -1 } = options;
	const results = await OutputInvoice.find(filter)
		.sort({ [sortBy]: sortOrder })
		.exec();
	return {
		data: results,
		total: results.length,
	};
};

const updateOutputInvoice = async (id, data) => {
	const invoice = await OutputInvoice.findByIdAndUpdate(id, data, {
		new: true,
	});
	if (!invoice)
		throw new ApiError(StatusCodes.NOT_FOUND, "Output invoice not found");
	return invoice;
};

const deleteOutputInvoice = async (id) => {
	const invoice = await OutputInvoice.findByIdAndDelete(id);
	if (!invoice)
		throw new ApiError(StatusCodes.NOT_FOUND, "Output invoice not found");
	return invoice;
};

const getTotalTaxesByBusinessOwner = async (businessOwnerId, filter = {}) => {
	const matchQuery = {
		businessOwnerId,
		...filter,
	};

	const result = await OutputInvoice.aggregate([
		{ $match: matchQuery },
		{
			$group: {
				_id: null,
				totalGTGT: { $sum: "$totalGTGT" },
				totalTNCN: { $sum: "$totalTNCN" },
				invoiceCount: { $sum: 1 },
			},
		},
	]);

	if (result.length === 0) {
		return {
			totalGTGT: 0,
			totalTNCN: 0,
			invoiceCount: 0,
		};
	}

	return {
		totalGTGT: result[0].totalGTGT || 0,
		totalTNCN: result[0].totalTNCN || 0,
		invoiceCount: result[0].invoiceCount || 0,
	};
};

export {
	createOutputInvoice,
	deleteOutputInvoice,
	getOutputInvoiceById,
	getTotalTaxesByBusinessOwner,
	listOutputInvoices,
	updateOutputInvoice,
};
