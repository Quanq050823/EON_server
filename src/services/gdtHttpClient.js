import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

const GDT_BASE_URL = "https://hoadondientu.gdt.gov.vn/api";
const RETRY_DELAY_MS = 3000;
const MAX_ATTEMPTS = 3;

const GDT_BROWSER_HEADERS = {
	"User-Agent":
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	Referer: "https://hoadondientu.gdt.gov.vn/",
	Accept: "application/json, text/plain, */*",
	"Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
};

const getProxyUrl = () => process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

const createGDTProxyAgent = () => {
	const proxyUrl = getProxyUrl();
	if (!proxyUrl) {
		throw new Error("Missing HTTPS_PROXY/HTTP_PROXY for GDT outbound request");
	}
	return new HttpsProxyAgent(proxyUrl);
};

const gdtHttpClient = axios.create({
	baseURL: GDT_BASE_URL,
	headers: GDT_BROWSER_HEADERS,
	proxy: false,
	timeout: 30000,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isNetworkRetryableError = (error) =>
	error.code === "ECONNABORTED" ||
	error.code === "ECONNREFUSED" ||
	error.code === "ETIMEDOUT" ||
	error.code === "ECONNRESET" ||
	error.code === "EHOSTUNREACH" ||
	error.code === "ENETUNREACH" ||
	error.message?.toLowerCase().includes("timeout");

const getAgentDebugInfo = (config = {}) => ({
	hasHttpsAgent: Boolean(config.httpsAgent),
	httpsAgentName: config.httpsAgent?.constructor?.name,
	proxyDisabledInAxios: config.proxy === false,
	proxyEnvPresent: Boolean(getProxyUrl()),
});

const logGDTRequestError = (error) => {
	const status = error.response?.status;
	if (status === 500) {
		console.error("[GDT] Internal Server Error 500");
		console.error("[GDT] Stack:", error.stack);
		console.error("[GDT] Response data:", error.response?.data);
		console.error("[GDT] Request agent debug:", getAgentDebugInfo(error.config));
	}
};

const requestGDTWithRetry = async (config, attempts = MAX_ATTEMPTS) => {
	let lastError;
	const httpsAgent = createGDTProxyAgent();

	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			return await gdtHttpClient.request({ ...config, httpsAgent });
		} catch (error) {
			lastError = error;
			logGDTRequestError(error);

			if (!isNetworkRetryableError(error) || attempt === attempts) {
				throw error;
			}

			console.warn(
				`[GDT] Network/proxy error (${error.code || error.message}). Retry ${attempt + 1}/${attempts} after ${RETRY_DELAY_MS}ms`,
			);
			await sleep(RETRY_DELAY_MS);
		}
	}

	throw lastError;
};

export {
	GDT_BASE_URL,
	GDT_BROWSER_HEADERS,
	gdtHttpClient,
	requestGDTWithRetry,
};
