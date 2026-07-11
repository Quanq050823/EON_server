import {
	getCaptchaFromGDT,
	authenticateWithGDT,
} from "../services/invoiceSyncService.js";
import InvoicesInService from "../services/invoicesInService.js";
import * as adminService from "../services/adminService.js";
import BusinessOwner from "../models/BusinessOwner.js";
import { syncStorageItemsForOwner } from "./storageItemController.js";

const toCaptchaDataUrl = (content) => {
	if (typeof content !== "string" || !content.trim()) return "";
	const trimmed = content.trim();
	if (trimmed.startsWith("data:")) return trimmed;
	if (trimmed.startsWith("<svg") || trimmed.startsWith("<?xml")) {
		return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
	}
	return `data:image/svg+xml;base64,${trimmed}`;
};

export const getCaptchaImage = async (req, res) => {
	try {
		const result = await getCaptchaFromGDT();

		if (result.success) {
			return res.status(200).json({
				success: true,
				ckey: result.ckey,
				captchaImage: result.captchaImage,
				message: "Đã lấy captcha thành công",
			});
		} else {
			return res.status(500).json({
				success: false,
				message: "Không thể lấy captcha",
				error: result.error,
			});
		}
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Lỗi server",
			error: error.message,
		});
	}
};

export const loginWithCredentials = async (req, res) => {
	try {
		const { username, password, cvalue, ckey } = req.body;

		if (!username || !password || !cvalue || !ckey) {
			return res.status(400).json({
				success: false,
				message: "username, password, cvalue và ckey là bắt buộc",
			});
		}

		const result = await authenticateWithGDT(username, password, cvalue, ckey);

		if (result.success) {
			return res.status(200).json({
				success: true,
				token: result.token,
				message: "Đăng nhập thành công",
			});
		} else {
			return res.status(401).json({
				success: false,
				message: "Đăng nhập thất bại",
				error: result.error,
			});
		}
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Lỗi server",
			error: error.message,
		});
	}
};

export const getBusinessOwnerSyncCaptcha = async (req, res, next) => {
	try {
		await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
		const result = await getCaptchaFromGDT();
		if (!result.success) {
			return res.status(502).json({
				success: false,
				message: "Không thể lấy captcha từ Cơ quan Thuế",
			});
		}
		return res.status(200).json({
			success: true,
			ckey: result.ckey,
			captchaImage: toCaptchaDataUrl(result.captchaImage),
		});
	} catch (error) {
		next(error);
	}
};

export const syncBusinessOwnerInvoices = async (req, res, next) => {
	try {
		const ownerId = await adminService.resolveAccessibleBusinessOwnerId(
			req.user,
			req.params.ownerId,
		);
		const { cvalue, ckey } = req.body;
		if (!cvalue || !ckey) {
			return res.status(400).json({
				success: false,
				message: "Captcha là bắt buộc",
			});
		}
		const credentials = await adminService.getBusinessOwnerTaxCredentials(
			ownerId,
		);

		const authResult = await authenticateWithGDT(
			credentials.username,
			credentials.password,
			cvalue,
			ckey,
		);
		if (!authResult.success || !authResult.token) {
			return res.status(422).json({
				success: false,
				message: authResult.error || "Đăng nhập Cơ quan Thuế thất bại",
			});
		}

		const result = await InvoicesInService.syncInvoicesByBusinessOwnerId(
			ownerId,
			authResult.token,
		);
		let materialSync = { successCount: 0, failCount: 0, items: [] };
		if (result.sync > 0) {
			const owner = await BusinessOwner.findById(ownerId);
			materialSync = await syncStorageItemsForOwner(owner, req.user.userId);
		}
		return res.status(200).json({
			success: true,
			...result,
			materialSync,
		});
	} catch (error) {
		next(error);
	}
};

