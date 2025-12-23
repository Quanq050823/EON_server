"use strict";

import crypto from "crypto";

export const generateAuthToken = (httpMethod, username, password, taxCode) => {
	// Get timestamp in seconds since epoch (UTC)
	const epochStart = new Date(Date.UTC(1970, 0, 1, 0, 0, 0, 0));
	const now = new Date();
	const timestamp = Math.floor((now - epochStart) / 1000).toString();

	// Generate random nonce (alphanumeric only)
	const nonce = crypto.randomBytes(16).toString("hex").toLowerCase();

	// Create signature raw data: HTTPMethod + timestamp + nonce
	const signatureRawData = `${httpMethod.toUpperCase()}${timestamp}${nonce}`;

	// Calculate MD5 hash and convert to base64
	const md5Hash = crypto
		.createHash("md5")
		.update(signatureRawData, "utf8")
		.digest();
	const signature = Buffer.from(md5Hash).toString("base64");

	// Return authentication token
	return `${signature}:${nonce}:${timestamp}:${username}:${password}:${taxCode}`;
};

export const getAuthHeaders = (httpMethod, username, password, taxCode) => {
	const authToken = generateAuthToken(httpMethod, username, password, taxCode);
	return {
		Authentication: authToken,
		"Content-Type": "application/json",
	};
};
