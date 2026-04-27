"use strict";

import mongoose from "mongoose";

const StockLogSchema = new mongoose.Schema(
	{
		businessOwnerId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "BusinessOwner",
			required: true,
		},
		storageItemId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "StorageItem",
		},
		itemName: { type: String, required: true },
		unit: { type: String },
		quantityChanged: { type: Number }, // số lượng thêm hoặc thay đổi
		stockAfter: { type: Number },       // tồn kho sau khi thay đổi
		pricePerUnit: { type: Number },
		source: {
			type: String,
			enum: ["manual_add", "manual_update"],
			default: "manual_add",
		},
		// label hiển thị cho UI
		label: {
			type: String,
			default: "Thêm tồn kho",
		},
		// Mảng các thay đổi: [{ field, oldValue, newValue }]
		changes: [
			{
				field: { type: String },       // e.g. "stock", "price", "name", "unit"
				oldValue: { type: mongoose.Schema.Types.Mixed },
				newValue: { type: mongoose.Schema.Types.Mixed },
			},
		],
		note: { type: String },
		triggeredBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{ timestamps: true }
);

const StockLog = mongoose.model("StockLog", StockLogSchema);
export default StockLog;
