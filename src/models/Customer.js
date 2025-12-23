"use strict";

import mongoose from "mongoose";

const CustomerSchema = mongoose.Schema(
	{
		ownerId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "BusinessOwner",
			required: true,
			index: true,
		},
		name: { type: String, required: true },
		code: { type: String, required: true },
		email: { type: String, required: false },
		phoneNumber: { type: String, required: true },
		address: {
			street: { type: String },
			ward: { type: String },
			district: { type: String },
			city: { type: String },
			zipCode: { type: String },
		},
		customerType: {
			type: String,
			enum: ["individual", "business"],
			default: "individual",
		},
		taxCode: { type: String, sparse: true },
		companyName: { type: String }, // For business customers
		contactPerson: { type: String }, // For business customers
		dateOfBirth: { type: Date }, // For individual customers
		gender: {
			type: String,
			enum: ["male", "female", "other"],
		}, // For individual customers
		notes: { type: String },
		creditLimit: { type: Number, default: 0 },
		paymentTerms: { type: String }, // e.g., "30 days", "COD"
		status: {
			type: String,
			enum: ["active", "inactive", "blacklisted"],
			default: "active",
		},
		tags: [{ type: String }], // For categorization
		customFields: [
			{
				key: String,
				value: String,
			},
		],
		lastContactDate: { type: Date },
		totalOrders: { type: Number, default: 0 },
		totalSpent: { type: Number, default: 0 },
	},
	{ timestamps: true }
);

// Compound index to ensure unique customer codes per business owner
CustomerSchema.index({ ownerId: 1, code: 1 }, { unique: true });

// Text search indexes
CustomerSchema.index({
	name: "text",
	email: "text",
	phoneNumber: "text",
	companyName: "text",
	contactPerson: "text",
});

// Other useful indexes
CustomerSchema.index({ customerType: 1 });
CustomerSchema.index({ status: 1 });
CustomerSchema.index({ createdAt: -1 });

const Customer = mongoose.model("Customer", CustomerSchema);
export default Customer;
