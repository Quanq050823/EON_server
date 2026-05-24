import { requestGDTWithRetry } from "./gdtHttpClient.js";

async function getCaptchaFromGDT() {
	try {
		const response = await requestGDTWithRetry({
			method: "get",
			url: "/captcha",
			timeout: 15000,
		});
		const { key, content } = response.data;
		return { success: true, key, content, ckey: key, captchaImage: content };
	} catch (error) {
		return { success: false, error: error.message };
	}
}

async function authenticateWithGDT(username, password, cvalue, ckey) {
	try {
		const response = await requestGDTWithRetry({
			method: "post",
			url: "/security-taxpayer/authenticate",
			data: { username, password, cvalue, ckey },
			headers: { "Content-Type": "application/json" },
			timeout: 15000,
		});
		const { token } = response.data;
		return { success: true, token };
	} catch (error) {
		const message = error.response?.data?.message || error.message;
		return { success: false, error: message };
	}
}

export { getCaptchaFromGDT, authenticateWithGDT };
export default { getCaptchaFromGDT, authenticateWithGDT };

