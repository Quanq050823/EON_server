"use strict";

import mongoose from "mongoose";

const SyncHistoryItemSchema = new mongoose.Schema(
	{
		name: { type: String },
		unit: { type: String },
		stock: { type: Number },
		price: { type: Number },
		action: { type: String, enum: ["created", "updated"], default: "created" },
		invoiceNumber: { type: String },
		invoiceDate: { type: Date },
		sellerName: { type: String },
	},
	{ _id: false }
);

const SyncHistorySchema = new mongoose.Schema(
	{
		businessOwnerId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "BusinessOwner",
			required: true,
		},
		triggeredBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
		successCount: { type: Number, default: 0 },
		failCount: { type: Number, default: 0 },
		invoicesProcessed: [{ type: String }], // mã hóa đơn
		items: [SyncHistoryItemSchema],
	},
	{ timestamps: true }
);

const SyncHistory = mongoose.model("SyncHistory", SyncHistorySchema);
export default SyncHistory;
