"use strict";

import axios from "axios";
import config from "../config/environment.js";
import { getAuthHeaders } from "../utils/easyInvoiceAuth.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";

export const getInvoiceByArisingDateRange = async (
	FromDate,
	ToDate,
	easyInvoiceAccount,
	easyInvoicePassword,
	easyInvoiceSerial
) => {
	try {
		const url = `${config.easyInvoice.apiUrl}/api/business/getInvoiceByArisingDateRange`;
		console.log("EasyInvoice API URL:", url);
		const headers = {
			...getAuthHeaders(
				"POST",
				easyInvoiceAccount,
				easyInvoicePassword,
				easyInvoiceSerial
			),
		};
		const body = {
			FromDate: FromDate,
			ToDate: ToDate,
		};
		const response = await axios.post(url, body, { headers });
		return response.data;
	} catch (error) {
		console.error("EasyInvoice Error:", error.response?.data || error.message);
		const statusCode =
			error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
		const errorMessage =
			error.response?.data?.message || error.response?.data || error.message;
		throw new ApiError(
			statusCode,
			`Failed to get invoices by Ikeys: ${
				typeof errorMessage === "object"
					? JSON.stringify(errorMessage)
					: errorMessage
			}`
		);
	}
};

export const importInvoice = async (
	XmlData,
	easyInvoiceAccount,
	easyInvoicePassword,
	easyInvoiceSerial
) => {
	try {
		const url = `${config.easyInvoice.apiUrl}/api/publish/importInvoice`;
		console.log("EasyInvoice API URL:", url);
		const headers = {
			...getAuthHeaders(
				"POST",
				easyInvoiceAccount,
				easyInvoicePassword,
				easyInvoiceSerial
			),
		};
		const body = {
			XmlData: XmlData,
		};
		const response = await axios.post(url, body, { headers });
		return response.data;
	} catch (error) {
		const statusCode =
			error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
		const errorMessage =
			error.response?.data?.message || error.response?.data || error.message;
		throw new ApiError(
			statusCode,
			`Failed to import and issue invoice: ${
				typeof errorMessage === "object"
					? JSON.stringify(errorMessage)
					: errorMessage
			}`
		);
	}
};

export const ImportAndIssueInvoice = async (
	XmlData,
	easyInvoiceAccount,
	easyInvoicePassword,
	easyInvoiceSerial
) => {
	try {
		const url = `${config.easyInvoice.apiUrl}/api/publish/importAndIssueInvoice`;
		console.log("EasyInvoice API URL:", url);
		const headers = {
			...getAuthHeaders(
				"POST",
				easyInvoiceAccount,
				easyInvoicePassword,
				easyInvoiceSerial
			),
		};
		const body = {
			XmlData: XmlData,
		};
		const response = await axios.post(url, body, { headers });
		return response.data;
	} catch (error) {
		const statusCode =
			error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
		const errorMessage =
			error.response?.data?.message || error.response?.data || error.message;
		throw new ApiError(
			statusCode,
			`Failed to import and issue invoice: ${
				typeof errorMessage === "object"
					? JSON.stringify(errorMessage)
					: errorMessage
			}`
		);
	}
};

export const cancelInvoice = async (
	Ikey,
	easyInvoiceAccount,
	easyInvoicePassword,
	easyInvoiceSerial
) => {
	try {
		const url = `${config.easyInvoice.apiUrl}/api/business/cancelInvoice`;
		console.log("EasyInvoice API URL:", url);
		const headers = {
			...getAuthHeaders(
				"POST",
				easyInvoiceAccount,
				easyInvoicePassword,
				easyInvoiceSerial
			),
		};
		const body = {
			Ikey: Ikey,
		};
		console.log("Request Body:", body);
		console.log("Request Headers:", headers);
		const response = await axios.post(url, body, { headers });
		console.log("EasyInvoice Response:", response.data);
		return response.data;
	} catch (error) {
		console.error("EasyInvoice Error:", error.response?.data || error.message);
		const statusCode =
			error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
		const errorMessage =
			error.response?.data?.message || error.response?.data || error.message;
		throw new ApiError(
			statusCode,
			`Failed to cancel invoice: ${
				typeof errorMessage === "object"
					? JSON.stringify(errorMessage)
					: errorMessage
			}`
		);
	}
};
