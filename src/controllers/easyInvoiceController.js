"use strict";

import { StatusCodes } from "http-status-codes";
import * as easyInvoiceService from "../services/easyInvoiceService.js";
import ApiError from "../utils/ApiError.js";
import { getBusinessOwnerByUserId } from "../services/businessOwnerService.js";
import { buildInvoiceXML } from "../utils/xmlBuilder.js";
import { processInvoiceData } from "../utils/invoiceHelper.js";

export const getInvoiceByArisingDateRange = async (req, res, next) => {
	try {
		const { FromDate, ToDate } = req.body;
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}

		if (
			!owner.easyInvoiceInfo ||
			typeof owner.easyInvoiceInfo !== "object" ||
			Object.keys(owner.easyInvoiceInfo).length === 0
		) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "EasyInvoice configuration not found for this business owner",
			});
		}

		const easyInvoiceAccount = owner.easyInvoiceInfo.account;
		const easyInvoicePassword = owner.easyInvoiceInfo.password;
		const easyInvoiceSerial = owner.easyInvoiceInfo.serial;

		if (!easyInvoiceAccount || !easyInvoicePassword || !easyInvoiceSerial) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "Missing required EasyInvoice credentials",
				details: {
					hasAccount: !!easyInvoiceAccount,
					hasPassword: !!easyInvoicePassword,
					hasSerial: !!easyInvoiceSerial,
				},
			});
		}

		const result = await easyInvoiceService.getInvoiceByArisingDateRange(
			FromDate,
			ToDate,
			easyInvoiceAccount,
			easyInvoicePassword,
			easyInvoiceSerial,
		);
		res.status(StatusCodes.OK).json({ success: true, data: result });
	} catch (error) {
		next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
	}
};

export const importInvoice = async (req, res, next) => {
	try {
		let { XmlData, invoiceData } = req.body;

		// Support both XmlData (backward compatible) and invoiceData (dynamic)
		if (!XmlData && invoiceData) {
			invoiceData = processInvoiceData(invoiceData);
			XmlData = buildInvoiceXML(invoiceData);
			console.log("Generated XML from invoiceData:", XmlData);
		}

		if (!XmlData) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "Either XmlData or invoiceData is required",
			});
		}

		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}

		if (
			!owner.easyInvoiceInfo ||
			typeof owner.easyInvoiceInfo !== "object" ||
			Object.keys(owner.easyInvoiceInfo).length === 0
		) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "EasyInvoice configuration not found for this business owner",
			});
		}

		const easyInvoiceAccount = owner.easyInvoiceInfo.account;
		console.log("🚀 ~ importInvoice ~ easyInvoiceAccount:", easyInvoiceAccount);
		const easyInvoicePassword = owner.easyInvoiceInfo.password;
		console.log(
			"🚀 ~ importInvoice ~ easyInvoicePassword:",
			easyInvoicePassword,
		);
		const easyInvoiceSerial = owner.easyInvoiceInfo.serial;
		console.log("🚀 ~ importInvoice ~ easyInvoiceSerial:", easyInvoiceSerial);

		if (!easyInvoiceAccount || !easyInvoicePassword || !easyInvoiceSerial) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "Missing required EasyInvoice credentials",
				details: {
					hasAccount: !!easyInvoiceAccount,
					hasPassword: !!easyInvoicePassword,
					hasSerial: !!easyInvoiceSerial,
				},
			});
		}

		const result = await easyInvoiceService.importInvoice(
			XmlData,
			easyInvoiceAccount,
			easyInvoicePassword,
			easyInvoiceSerial,
		);
		console.log("🚀 ~ importInvoice ~ XmlData:", XmlData);
		res
			.status(StatusCodes.OK)
			.json({ success: true, data: result, invoiceData });
	} catch (error) {
		next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
	}
};

export const importAndIssueInvoice = async (req, res, next) => {
	try {
		let { XmlData, invoiceData } = req.body;

		if (!XmlData && invoiceData) {
			invoiceData = processInvoiceData(invoiceData);
			XmlData = buildInvoiceXML(invoiceData);
			console.log("Generated XML from invoiceData:", XmlData);
		}

		if (!XmlData) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "Either XmlData or invoiceData is required",
			});
		}

		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}

		if (
			!owner.easyInvoiceInfo ||
			typeof owner.easyInvoiceInfo !== "object" ||
			Object.keys(owner.easyInvoiceInfo).length === 0
		) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "EasyInvoice configuration not found for this business owner",
			});
		}

		const easyInvoiceAccount = owner.easyInvoiceInfo.account;
		const easyInvoicePassword = owner.easyInvoiceInfo.password;
		const easyInvoiceSerial = owner.easyInvoiceInfo.serial;

		if (!easyInvoiceAccount || !easyInvoicePassword || !easyInvoiceSerial) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "Missing required EasyInvoice credentials",
				details: {
					hasAccount: !!easyInvoiceAccount,
					hasPassword: !!easyInvoicePassword,
					hasSerial: !!easyInvoiceSerial,
				},
			});
		}

		const result = await easyInvoiceService.ImportAndIssueInvoice(
			XmlData,
			easyInvoiceAccount,
			easyInvoicePassword,
			easyInvoiceSerial,
		);
		res
			.status(StatusCodes.OK)
			.json({ success: true, data: result, invoiceData });
	} catch (error) {
		console.log("🚀 ~ importAndIssueInvoice ~ error:", error);
		next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
	}
};

export const cancelInvoice = async (req, res, next) => {
	try {
		const { Ikey } = req.body;
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}

		if (
			!owner.easyInvoiceInfo ||
			typeof owner.easyInvoiceInfo !== "object" ||
			Object.keys(owner.easyInvoiceInfo).length === 0
		) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "EasyInvoice configuration not found for this business owner",
			});
		}

		const easyInvoiceAccount = owner.easyInvoiceInfo.account;
		const easyInvoicePassword = owner.easyInvoiceInfo.password;
		const easyInvoiceSerial = owner.easyInvoiceInfo.serial;

		if (!easyInvoiceAccount || !easyInvoicePassword || !easyInvoiceSerial) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "Missing required EasyInvoice credentials",
				details: {
					hasAccount: !!easyInvoiceAccount,
					hasPassword: !!easyInvoicePassword,
					hasSerial: !!easyInvoiceSerial,
				},
			});
		}

		const result = await easyInvoiceService.cancelInvoice(
			Ikey,
			easyInvoiceAccount,
			easyInvoicePassword,
			easyInvoiceSerial,
		);
		res.status(StatusCodes.OK).json({ success: true, data: result });
	} catch (error) {
		next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
	}
};

export const getInvoiceAuto = async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}

		if (
			!owner.easyInvoiceInfo ||
			typeof owner.easyInvoiceInfo !== "object" ||
			Object.keys(owner.easyInvoiceInfo).length === 0
		) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "EasyInvoice configuration not found for this business owner",
			});
		}

		const easyInvoiceAccount = owner.easyInvoiceInfo.account;
		const easyInvoicePassword = owner.easyInvoiceInfo.password;
		const easyInvoiceSerial = owner.easyInvoiceInfo.serial;

		if (!easyInvoiceAccount || !easyInvoicePassword || !easyInvoiceSerial) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "Missing required EasyInvoice credentials",
				details: {
					hasAccount: !!easyInvoiceAccount,
					hasPassword: !!easyInvoicePassword,
					hasSerial: !!easyInvoiceSerial,
				},
			});
		}

		// Tính toán FromDate dựa vào tax_filing_frequency và createdAt
		const taxFilingFrequency = owner.tax_filing_frequency || 1; // Mặc định là tháng (1)
		const accountCreatedDate = new Date(owner.createdAt);
		const now = new Date();

		let fromDate;
		if (taxFilingFrequency === 2) {
			// Theo quý - lấy đầu quý trước khi đăng ký
			const createdQuarter = Math.floor(accountCreatedDate.getMonth() / 3);
			const createdYear = accountCreatedDate.getFullYear();
			fromDate = new Date(createdYear - 1, createdQuarter * 3, 1);
		} else {
			// Theo tháng - lấy đầu tháng trước khi đăng ký
			fromDate = new Date(
				accountCreatedDate.getFullYear(),
				accountCreatedDate.getMonth(),
				1,
			);
		}

		// Format dates to DD/MM/YYYY
		const formatDate = (date) => {
			const day = String(date.getDate()).padStart(2, "0");
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const year = date.getFullYear();
			return `${day}/${month}/${year}`;
		};

		const FromDate = formatDate(fromDate);
		const ToDate = formatDate(now);

		const result = await easyInvoiceService.getInvoiceByArisingDateRange(
			FromDate,
			ToDate,
			easyInvoiceAccount,
			easyInvoicePassword,
			easyInvoiceSerial,
		);

		res.status(StatusCodes.OK).json({
			success: true,
			data: result,
			dateRange: { FromDate, ToDate },
		});
	} catch (error) {
		next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
	}
};

export const viewInvoice = async (req, res, next) => {
	try {
		const { Ikey, Pattern, Option, Serial } = req.body;
		const userId = req.user.userId;
		const owner = await getBusinessOwnerByUserId(userId);
		if (!owner) {
			return res
				.status(StatusCodes.NOT_FOUND)
				.json({ message: "Business owner profile not found" });
		}

		if (
			!owner.easyInvoiceInfo ||
			typeof owner.easyInvoiceInfo !== "object" ||
			Object.keys(owner.easyInvoiceInfo).length === 0
		) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "EasyInvoice configuration not found for this business owner",
			});
		}

		const easyInvoiceAccount = owner.easyInvoiceInfo.account;
		const easyInvoicePassword = owner.easyInvoiceInfo.password;
		const easyInvoiceSerial = owner.easyInvoiceInfo.serial;

		if (!easyInvoiceAccount || !easyInvoicePassword || !easyInvoiceSerial) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "Missing required EasyInvoice credentials",
				details: {
					hasAccount: !!easyInvoiceAccount,
					hasPassword: !!easyInvoicePassword,
					hasSerial: !!easyInvoiceSerial,
				},
			});
		}

		const result = await easyInvoiceService.viewInvoice(
			Ikey,
			Pattern,
			Option,
			Serial,
			easyInvoiceAccount,
			easyInvoicePassword,
			easyInvoiceSerial,
		);
		res.status(StatusCodes.OK).json({ success: true, data: result });
	} catch (error) {
		next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
	}
};
