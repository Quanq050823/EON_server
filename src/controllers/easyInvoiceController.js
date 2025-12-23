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
		const easyInvoiceSerial = owner.easyInvoiceInfo.mst;

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
			easyInvoiceSerial
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
		const easyInvoicePassword = owner.easyInvoiceInfo.password;
		const easyInvoiceSerial = owner.easyInvoiceInfo.mst;

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
			easyInvoiceSerial
		);
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
		const easyInvoiceSerial = owner.easyInvoiceInfo.mst;

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
			easyInvoiceSerial
		);
		res
			.status(StatusCodes.OK)
			.json({ success: true, data: result, invoiceData });
	} catch (error) {
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
		const easyInvoiceSerial = owner.easyInvoiceInfo.mst;

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
			easyInvoiceSerial
		);
		res.status(StatusCodes.OK).json({ success: true, data: result });
	} catch (error) {
		next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
	}
};
