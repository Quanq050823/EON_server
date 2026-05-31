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
		stockBefore: { type: Number, default: 0 },
		stockAfter: { type: Number },       // tồn kho sau khi thay đổi
		signedQuantity: { type: Number, default: 0 },
		direction: {
			type: String,
			enum: ["in", "out", "neutral"],
			default: "neutral",
		},
		amount: { type: Number, default: 0 },
		pricePerUnit: { type: Number },
		source: {
			type: String,
			enum: [
				"opening_balance",
				"manual_add",
				"manual_update",
				"manual_delete",
				"invoice_in",
				"invoice_out",
				"merge",
			],
			default: "manual_add",
		},
		documentType: { type: String },
		documentNumber: { type: String },
		documentDate: { type: Date },
		counterpartyName: { type: String },
		reportable: { type: Boolean, default: true },
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

StockLogSchema.index({ businessOwnerId: 1, storageItemId: 1, createdAt: 1 });
StockLogSchema.index({ businessOwnerId: 1, source: 1, storageItemId: 1 });

const StockLog = mongoose.model("StockLog", StockLogSchema);
export default StockLog;
