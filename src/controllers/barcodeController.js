import axios from "axios";
import { StatusCodes } from "http-status-codes";
import config from "../config/environment.js";

/**
 * Search product information via SerpApi Google Shopping by barcode.
 * GET /api/barcode/search/:barcode
 */
export const searchBarcodeViaSerpApi = async (req, res, next) => {
	try {
		const { barcode } = req.params;

		if (!barcode || !/^[0-9a-zA-Z\-]+$/.test(barcode)) {
			return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid barcode" });
		}

		if (!config.serpApiKey) {
			return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ message: "SerpApi not configured" });
		}

		const serpRes = await axios.get("https://serpapi.com/search.json", {
			params: {
				engine: "google_shopping",
				q: barcode,
				api_key: config.serpApiKey,
				num: 5,
				hl: "vi",
				gl: "vn",
			},
			timeout: 10000,
		});

		const results = serpRes.data?.shopping_results;
		if (!results || results.length === 0) {
			return res.status(StatusCodes.NOT_FOUND).json({ message: "No product found for this barcode" });
		}

		// Return top 5 results so the client can let the user pick
		const products = results.slice(0, 5).map((item) => ({
			name: item.title ?? "",
			price: parseFloat(String(item.extracted_price ?? "0").replace(/[^0-9.]/g, "")) || 0,
			imageUrl: item.thumbnail ?? null,
			source: "serpapi",
			link: item.link ?? null,
			rating: item.rating ?? null,
			brand: item.source ?? null,
		}));

		return res.status(StatusCodes.OK).json({ data: products });
	} catch (error) {
		// SerpApi quota/auth errors
		if (error.response?.status === 401) {
			return res.status(StatusCodes.UNAUTHORIZED).json({ message: "SerpApi key invalid or expired" });
		}
		if (error.response?.status === 429) {
			return res.status(StatusCodes.TOO_MANY_REQUESTS).json({ message: "SerpApi rate limit exceeded" });
		}
		next(error);
	}
};
