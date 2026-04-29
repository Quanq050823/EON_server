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

		// Run iCheck (direct public API) and Google Shopping in parallel
		const [iCheckRes, shoppingRes] = await Promise.allSettled([
			axios.get("https://api-social.icheck.com.vn/api/social/v2/product", {
				params: {
					page: 1,
					pageSize: 5,
					keyword: barcode,
				},
				headers: {
					"User-Agent": "OptiTax/1.0 (contact@dattax.vn)",
				},
				timeout: 10000,
			}),
			axios.get("https://serpapi.com/search.json", {
				params: {
					engine: "google_shopping",
					q: barcode,
					api_key: config.serpApiKey,
					num: 5,
					hl: "vi",
					gl: "vn",
				},
				timeout: 10000,
			}),
		]);

		// --- Parse iCheck results ---
		const iCheckItems = iCheckRes.status === "fulfilled"
			? (iCheckRes.value.data?.data?.items ?? [])
			: [];
		console.log(`[iCheck] barcode="${barcode}" → ${iCheckItems.length} items`);
		if (iCheckItems.length) {
			console.log("[iCheck] raw items:", JSON.stringify(iCheckItems, null, 2));
		}

		const iCheckProducts = iCheckItems.map((item) => ({
			name: item.name ?? "",
			price: item.price ?? 0,
			imageUrl: item.media?.[0]?.url ?? null,
			source: "icheck",
			link: item.code ? `https://icheck.vn/san-pham/${item.code}` : null,
			rating: item.rating ?? null,
			brand: item.owner?.name ?? null,
		}));

		// --- Parse Google Shopping results ---
		const shoppingResults = shoppingRes.status === "fulfilled"
			? (shoppingRes.value.data?.shopping_results ?? [])
			: [];
		console.log(`[GoogleShopping] barcode="${barcode}" → ${shoppingResults.length} shopping_results`);
		if (shoppingResults.length) {
			console.log("[GoogleShopping] raw results:", JSON.stringify(shoppingResults.slice(0, 5), null, 2));
		}

		const shoppingProducts = shoppingResults.slice(0, 5).map((item) => ({
			name: item.title ?? "",
			price: parseFloat(String(item.extracted_price ?? "0").replace(/[^0-9.]/g, "")) || 0,
			imageUrl: item.thumbnail ?? null,
			source: "google_shopping",
			link: item.link ?? null,
			rating: item.rating ?? null,
			brand: item.source ?? null,
		}));

		// Merge: iCheck first (most trusted for VN products), then Google Shopping
		const products = [...iCheckProducts, ...shoppingProducts];

		if (products.length === 0) {
			return res.status(StatusCodes.NOT_FOUND).json({ message: "No product found for this barcode" });
		}

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
