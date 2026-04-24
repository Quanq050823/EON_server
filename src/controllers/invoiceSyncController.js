import {
	getCaptchaFromGDT,
	authenticateWithGDT,
} from "../services/invoiceSyncService.js";

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

