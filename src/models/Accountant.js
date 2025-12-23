"use strict";

import mongoose from "mongoose";

const AccountantSchema = mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			unique: true,
		},
		licenseNumber: { type: String, required: true, unique: true },
		licenseType: {
			type: String,
			enum: ["CPA", "CMA", "CIA", "Other"],
			required: true,
		},
		experience: { type: Number, required: true, min: 0 },
		specializations: [
			{
				type: String,
				enum: [
					"tax_accounting",
					"financial_accounting",
					"audit",
					"management_accounting",
					"forensic_accounting",
					"other",
				],
			},
		],
		education: [
			{
				degree: { type: String, required: true },
				institution: { type: String, required: true },
				graduationYear: { type: Number, required: true },
				major: { type: String },
			},
		],
		certifications: [
			{
				name: { type: String, required: true },
				issuer: { type: String, required: true },
				issueDate: { type: Date, required: true },
				expiryDate: { type: Date },
				certificateUrl: { type: String },
			},
		],
		workHistory: [
			{
				company: { type: String, required: true },
				position: { type: String, required: true },
				startDate: { type: Date, required: true },
				endDate: { type: Date },
				description: { type: String },
			},
		],
		hourlyRate: { type: Number },
		availability: {
			type: String,
			enum: ["full_time", "part_time", "contract", "unavailable"],
			default: "available",
		},
		languages: [
			{
				type: String,
				enum: [
					"vietnamese",
					"english",
					"chinese",
					"japanese",
					"korean",
					"other",
				],
			},
		],
		rating: {
			average: { type: Number, default: 0, min: 0, max: 5 },
			count: { type: Number, default: 0 },
		},
		isVerified: { type: Boolean, default: false },
		verificationDate: { type: Date },
		bio: { type: String, maxlength: 1000 },
	},
	{ timestamps: true }
);

AccountantSchema.index({ userId: 1 });
AccountantSchema.index({ licenseNumber: 1 });
AccountantSchema.index({ specializations: 1 });
AccountantSchema.index({ "rating.average": -1 });
AccountantSchema.index({ availability: 1 });

const Accountant = mongoose.model("Accountant", AccountantSchema);
export default Accountant;
