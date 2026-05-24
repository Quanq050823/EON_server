"use strict";

import axios from "axios";
import config from "../config/environment.js";
import { getAuthHeaders } from "../utils/easyInvoiceAuth.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";

const EASYINVOICE_TIMEOUT_MS = 30000;
const EASYINVOICE_DEFAULT_HEADERS = {
	Accept: "application/json, text/plain, */*",
	"User-Agent": "OptiTax-EON/1.0",
};

const easyInvoiceHttpClient = axios.create({
	headers: EASYINVOICE_DEFAULT_HEADERS,
	proxy: false,
	timeout: EASYINVOICE_TIMEOUT_MS,
});

const buildEasyInvoiceUrl = (baseUrl, path) =>
	`${baseUrl.replace(/\/+$/, "")}${path}`;

const redactEasyInvoiceHeaders = (headers = {}) => ({
	...headers,
	Authentication: headers.Authentication ? "[REDACTED]" : undefined,
});

const logEasyInvoiceError = (operation, url, body, headers, error) => {
	console.error(`[EasyInvoice] ${operation} failed`, {
		url,
		status: error.response?.status,
		contentType: error.response?.headers?.["content-type"],
		responseData: error.response?.data || error.message,
		requestBody: body,
		requestHeaders: redactEasyInvoiceHeaders(headers),
		axiosProxyDisabled: true,
	});
};

const postEasyInvoice = async (operation, url, body, headers) => {
	try {
		return await easyInvoiceHttpClient.post(url, body, { headers });
	} catch (error) {
		logEasyInvoiceError(operation, url, body, headers, error);
		throw error;
	}
};

export const getInvoiceByArisingDateRange = async (
	FromDate,
	ToDate,
	easyInvoiceAccount,
	easyInvoicePassword,
	easyInvoiceSerial,
	easyInvoiceApiUrl,
	Page = 1,
	PageSize = 20,
) => {
	try {
		const baseUrl = easyInvoiceApiUrl || config.easyInvoice.apiUrl;
		const url = buildEasyInvoiceUrl(
			baseUrl,
			"/api/business/getInvoiceByArisingDateRange",
		);
		console.log("EasyInvoice API URL:", url);
		const headers = {
			...getAuthHeaders(
				"POST",
				easyInvoiceAccount,
				easyInvoicePassword,
				easyInvoiceSerial,
			),
		};
		const body = {
			FromDate: FromDate,
			ToDate: ToDate,
			Page: Page,
			PageSize: PageSize,
		};
		const response = await postEasyInvoice(
			"getInvoiceByArisingDateRange",
			url,
			body,
			headers,
		);
		return response.data;
	} catch (error) {
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
			}`,
		);
	}
};

export const importInvoice = async (
	XmlData,
	easyInvoiceAccount,
	easyInvoicePassword,
	easyInvoiceSerial,
	easyInvoiceApiUrl,
) => {
	try {
		const baseUrl = easyInvoiceApiUrl || config.easyInvoice.apiUrl;
		const url = buildEasyInvoiceUrl(baseUrl, "/api/publish/importInvoice");
		console.log("EasyInvoice API URL:", url);
		const headers = {
			...getAuthHeaders(
				"POST",
				easyInvoiceAccount,
				easyInvoicePassword,
				easyInvoiceSerial,
			),
		};
		const body = {
			XmlData: XmlData,
		};
		const response = await postEasyInvoice("importInvoice", url, body, headers);
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
			}`,
		);
	}
};

export const ImportAndIssueInvoice = async (
	XmlData,
	easyInvoiceAccount,
	easyInvoicePassword,
	easyInvoiceSerial,
	easyInvoiceApiUrl,
) => {
	try {
		const baseUrl = easyInvoiceApiUrl || config.easyInvoice.apiUrl;
		const url = buildEasyInvoiceUrl(
			baseUrl,
			"/api/publish/importAndIssueInvoice",
		);
		console.log("EasyInvoice API URL:", url);
		const headers = {
			...getAuthHeaders(
				"POST",
				easyInvoiceAccount,
				easyInvoicePassword,
				easyInvoiceSerial,
			),
		};
		const body = {
			XmlData: XmlData,
		};
		const response = await postEasyInvoice(
			"importAndIssueInvoice",
			url,
			body,
			headers,
		);
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
			}`,
		);
	}
};

export const cancelInvoice = async (
	Ikey,
	easyInvoiceAccount,
	easyInvoicePassword,
	easyInvoiceSerial,
	easyInvoiceApiUrl,
) => {
	try {
		const baseUrl = easyInvoiceApiUrl || config.easyInvoice.apiUrl;
		const url = buildEasyInvoiceUrl(baseUrl, "/api/business/cancelInvoice");
		console.log("EasyInvoice API URL:", url);
		const headers = {
			...getAuthHeaders(
				"POST",
				easyInvoiceAccount,
				easyInvoicePassword,
				easyInvoiceSerial,
			),
		};
		const body = {
			Ikey: Ikey,
		};
		console.log("Request Body:", body);
		console.log("Request Headers:", redactEasyInvoiceHeaders(headers));
		const response = await postEasyInvoice("cancelInvoice", url, body, headers);
		console.log("EasyInvoice Response:", response.data);
		return response.data;
	} catch (error) {
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
			}`,
		);
	}
};

export const removeUnsignedInvoice = async (
	Ikey,
	Pattern,
	Serial,
	easyInvoiceAccount,
	easyInvoicePassword,
	easyInvoiceSerial,
	easyInvoiceApiUrl,
) => {
	try {
		const baseUrl = easyInvoiceApiUrl || config.easyInvoice.apiUrl;
		const url = buildEasyInvoiceUrl(
			baseUrl,
			"/api/business/removeUnsignedInvoice",
		);
		console.log("EasyInvoice API URL:", url);
		const headers = {
			...getAuthHeaders(
				"POST",
				easyInvoiceAccount,
				easyInvoicePassword,
				easyInvoiceSerial,
			),
		};
		const body = {
			Ikey,
			Pattern,
			Serial,
		};
		const response = await postEasyInvoice(
			"removeUnsignedInvoice",
			url,
			body,
			headers,
		);
		return response.data;
	} catch (error) {
		const statusCode =
			error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
		const errorMessage =
			error.response?.data?.message || error.response?.data || error.message;
		throw new ApiError(
			statusCode,
			`Failed to remove unsigned invoice: ${
				typeof errorMessage === "object"
					? JSON.stringify(errorMessage)
					: errorMessage
			}`,
		);
	}
};

export const adjustInvoice = async (
	XmlData,
	Ikey,
	Pattern,
	Serial,
	RelatedInvoice,
	easyInvoiceAccount,
	easyInvoicePassword,
	easyInvoiceSerial,
	easyInvoiceApiUrl,
) => {
	try {
		const baseUrl = easyInvoiceApiUrl || config.easyInvoice.apiUrl;
		const url = buildEasyInvoiceUrl(baseUrl, "/api/business/adjustInvoice");
		console.log("EasyInvoice API URL:", url);
		const headers = {
			...getAuthHeaders(
				"POST",
				easyInvoiceAccount,
				easyInvoicePassword,
				easyInvoiceSerial,
			),
		};

		const body = {
			XmlData,
			Ikey,
			Pattern,
			Serial,
			RelatedInvoice,
		};

		const response = await postEasyInvoice("adjustInvoice", url, body, headers);
		return response.data;
	} catch (error) {
		const statusCode =
			error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
		const errorMessage =
			error.response?.data?.message || error.response?.data || error.message;
		throw new ApiError(
			statusCode,
			`Failed to adjust invoice: ${
				typeof errorMessage === "object"
					? JSON.stringify(errorMessage)
					: errorMessage
			}`,
		);
	}
};

export const viewInvoice = async (
	Ikey,
	Pattern,
	Option,
	Serial,
	easyInvoiceAccount,
	easyInvoicePassword,
	easyInvoiceSerial,
	easyInvoiceApiUrl,
) => {
	try {
		const baseUrl = easyInvoiceApiUrl || config.easyInvoice.apiUrl;
		const url = buildEasyInvoiceUrl(baseUrl, "/api/publish/viewInvoice");
		console.log("EasyInvoice API URL:", url);
		const headers = {
			...getAuthHeaders(
				"POST",
				easyInvoiceAccount,
				easyInvoicePassword,
				easyInvoiceSerial,
			),
		};
		const body = {
			Ikey: Ikey,
			Pattern: Pattern,
			Option: Option,
			Serial: Serial,
		};
		console.log("Request Body:", body);
		console.log("Request Headers:", redactEasyInvoiceHeaders(headers));
		const response = await postEasyInvoice("viewInvoice", url, body, headers);
		console.log("EasyInvoice Response:", response.data);
		return response.data;
	} catch (error) {
		const statusCode =
			error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
		const errorMessage =
			error.response?.data?.message || error.response?.data || error.message;
		throw new ApiError(
			statusCode,
			`Failed to view invoice: ${
				typeof errorMessage === "object"
					? JSON.stringify(errorMessage)
					: errorMessage
			}`,
		);
	}
};
