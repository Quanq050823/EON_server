import {
	getCaptchaImage as getCaptchaService,
	loginWithCaptcha,
} from "../services/invoiceSyncService.js";
import { createOutputInvoice } from "../services/outputInvoiceService.js";

export const getCaptchaImage = async (req, res) => {
	try {
		const { username, password } = req.body;

		if (!username || !password) {
			return res.status(400).json({
				success: false,
				message: "Username và password là bắt buộc",
			});
		}

		const sessionId = `sync_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;

		const result = await getCaptchaService(sessionId, username, password);

		if (result.success) {
			return res.status(200).json({
				success: true,
				sessionId,
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
		const { sessionId, captcha, startDate, invoiceType = "input" } = req.body;

		if (!sessionId || !captcha) {
			return res.status(400).json({
				success: false,
				message: "SessionId và captcha là bắt buộc",
			});
		}

		// Validate invoiceType
		if (invoiceType && !["input", "output"].includes(invoiceType)) {
			return res.status(400).json({
				success: false,
				message: "invoiceType phải là 'input' hoặc 'output'",
			});
		}

		const result = await loginWithCaptcha(
			sessionId,
			captcha,
			startDate,
			invoiceType
		);

		if (result.success && invoiceType === "output") {
			const savedInvoices = [];
			const failedInvoices = [];

			// Kiểm tra userId từ request (cần middleware auth)
			const userId = req.user?.userId;
			if (!userId) {
				console.warn("Không tìm thấy userId, bỏ qua việc lưu hóa đơn vào DB");
				return res.status(200).json(result);
			}

			// Kiểm tra nếu có invoices data
			if (
				!result.invoices ||
				!result.invoices.datas ||
				!Array.isArray(result.invoices.datas)
			) {
				console.warn("Không có dữ liệu hóa đơn hoặc dữ liệu không hợp lệ");
				return res.status(200).json(result);
			}

			for (const gdtInvoice of result.invoices.datas) {
				try {
					const savedInvoice = await createOutputInvoice(gdtInvoice, userId);
					savedInvoices.push({
						id: savedInvoice._id,
						shdon: savedInvoice.shdon,
						mhdon: savedInvoice.mhdon,
					});
					console.log(
						`Đã lưu hóa đơn ${gdtInvoice.shdon} vào DB với ID: ${savedInvoice._id}`
					);
				} catch (error) {
					console.error(
						`Lỗi khi lưu hóa đơn ${gdtInvoice.shdon}:`,
						error.message
					);
					console.error(error);
					failedInvoices.push({
						invoice: gdtInvoice.shdon || "Unknown",
						error: error.message,
					});
				}
			}

			// Trả về kết quả bao gồm thông tin về việc lưu DB
			return res.status(200).json({
				...result,
				saved: {
					total: result.invoices.datas.length,
					success: savedInvoices.length,
					failed: failedInvoices.length,
					savedInvoices,
					failedInvoices,
				},
			});
		}

		return res.status(200).json(result);
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Lỗi server",
			error: error.message,
		});
	}
};
