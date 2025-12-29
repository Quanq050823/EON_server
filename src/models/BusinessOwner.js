"use strict";

import mongoose from "mongoose";

const BusinessOwnerSchema = mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			unique: true,
		},
		businessName: { type: String, required: true },
		businessType: { type: String, required: true },
		taxCode: { type: String, required: false, unique: true, sparse: true },
		businessLicense: { type: String },
		address: {
			street: { type: String, required: true },
			ward: { type: String, required: true },
			district: { type: String, required: true },
			city: { type: String, required: true },
			zipCode: { type: String },
		},
		phoneNumber: { type: String, required: true },
		industry: { type: String, required: true },
		establishedDate: { type: Date },
		employeeCount: { type: Number, default: 1, min: 1 },
		annualRevenue: { type: Number },
		businessStatus: {
			type: String,
			enum: ["active", "inactive", "suspended"],
			default: "active",
		},
		taxType: { type: String },
		password: { type: String },
		tax_filing_frequency: {
			type: Number,
		},
		documents: [
			{
				name: { type: String, required: true },
				url: { type: String, required: true },
				uploadDate: { type: Date, default: Date.now },
				documentType: {
					type: String,
					enum: ["license", "tax_certificate", "id_card", "other"],
				},
			},
		],
		verificationDate: { type: Date },
		notes: { type: String },
		easyInvoiceInfo: {
			account: { type: String },
			password: { type: String },
			mst: { type: String },
			serial: { type: String },
		},
	},
	{ timestamps: true }
);

BusinessOwnerSchema.index({ userId: 1 });
BusinessOwnerSchema.index({ taxCode: 1 });
BusinessOwnerSchema.index({ businessName: "text", industry: "text" });

const BusinessOwner = mongoose.model("BusinessOwner", BusinessOwnerSchema);
export default BusinessOwner;
