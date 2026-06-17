"use strict";

import mongoose from "mongoose";

const RefreshTokenSchema = mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		tokenHash: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		expiresAt: {
			type: Date,
			required: true,
			index: { expires: 0 },
		},
		revokedAt: {
			type: Date,
			default: null,
			index: true,
		},
		lastUsedAt: {
			type: Date,
			default: null,
		},
		userAgent: String,
		ip: String,
	},
	{ timestamps: true }
);

const RefreshToken =
	mongoose.models.RefreshToken ||
	mongoose.model("RefreshToken", RefreshTokenSchema);

export default RefreshToken;
