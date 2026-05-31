"use strict";

import mongoose from "mongoose";

const StorageItemSchema = new mongoose.Schema(
	{
		code: { type: String },
		name: { type: String, required: true },
		unit: { type: String, required: true },
		stock: { type: Number, required: true, default: 0 },
		imageURL: { type: String },
		description: { type: String },
		syncStatus: { type: Boolean, default: false },
		price: { type: Number, required: true, default: 0 },
		category: { type: Number, default: 0 }, // 0: chưa set, 1: nguyên liệu,2: hàng hóa
		tchat: { type: Number, default: 1 },
		conversionUnit: {
			from: {
				itemQuantity: { type: Number },
			},
			to: [
				{
					itemName: { type: String },
					itemQuantity: { type: Number },
				},
			],
			isActive: { type: Boolean, default: false },
		},
		// Mỗi alias = 1 tên khác của sản phẩm trên hóa đơn, kèm đơn vị và hệ số quy đổi
		// conversionFactor: 1 [alias.unit] = conversionFactor [master.unit]
		// Ví dụ: alias {name:"NC DASANI 500ML", unit:"thùng", conversionFactor:24} → 1 thùng = 24 chai
		syncAliases: [
			{
				name: { type: String, required: true },
				unit: { type: String, required: true },
				conversionFactor: { type: Number, default: 1 },
			},
		],
		businessOwnerId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "BusinessOwner",
		},
	},
	{ timestamps: true }
);

const StorageItem = mongoose.model("StorageItems", StorageItemSchema);
export default StorageItem;
