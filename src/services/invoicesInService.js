import axios from "axios";
import InvoicesIn from "../models/InvoicesIn.js";
import BusinessOwner from "../models/BusinessOwner.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";

const THIRD_PARTY_TOKEN = "3J/EhtxvsAO74hsLC6PtTdSKM0VleDskquWltIl8SlM=";
const API_BASE_URL = "https://vuat-api.vitax.one/api/partner/Invoices";
const MAX_DAYS_PER_REQUEST = 30;

const createInvoice = async (data) => {
	const existed = await InvoicesIn.findOne({
		ownerId: data.ownerId,
		mhdon: data.mhdon,
	});
	if (existed)
		throw new ApiError(
			StatusCodes.BAD_REQUEST,
			"Invoice code (mhdon) already exists for this business owner",
		);
	const invoice = new InvoicesIn(data);
	return await invoice.save();
};

const getInvoices = async (filter = {}) => {
	return await InvoicesIn.find(filter);
};

const getInvoiceById = async (id) => {
	return await InvoicesIn.findById(id);
};

const updateInvoice = async (id, data) => {
	return await InvoicesIn.findByIdAndUpdate(id, data, { new: true });
};

const deleteInvoice = async (id) => {
	return await InvoicesIn.findByIdAndDelete(id);
};

const getBusinessOwnerByUserId = async (userId) => {
	const owner = await BusinessOwner.findOne({ userId });
	if (!owner) {
		throw new ApiError(StatusCodes.NOT_FOUND, "BusinessOwner not found");
	}
	return owner;
};

const splitDateRangeIntoChunks = (startDate, endDate) => {
	const chunks = [];
	const end = new Date(endDate);

	let currentStart = new Date(startDate);

	while (currentStart <= end) {
		// Cuối tháng của currentStart
		const monthEnd = new Date(
			currentStart.getFullYear(),
			currentStart.getMonth() + 1,
			0, // ngày 0 của tháng kế = ngày cuối tháng hiện tại
		);

		const currentEnd = monthEnd < end ? monthEnd : new Date(end);

		chunks.push({
			from: currentStart.toISOString().split("T")[0],
			to: currentEnd.toISOString().split("T")[0],
		});

		// Sang tháng kế
		currentStart = new Date(
			currentEnd.getFullYear(),
			currentEnd.getMonth() + 1,
			1,
		);
	}

	return chunks;
};
const fetchInvoicesFromThirdParty = async (datefrom, dateto, taxCode) => {
	// Force datefrom and dateto to fixed values
	datefrom = "2026-01-01";
	dateto = "2026-01-31";

	console.log("🚀 ~ fetchInvoicesFromThirdParty ~ params.datefrom:", datefrom);
	console.log("🚀 ~ fetchInvoicesFromThirdParty ~ params.dateto:", dateto);
	console.log("🚀 ~ fetchInvoicesFromThirdParty ~ params.taxCode:", taxCode);

	try {
		const response = await axios.get(`${API_BASE_URL}/get-list-invoice`, {
			headers: {
				Authorization: `Bearer ${THIRD_PARTY_TOKEN}`,
				"Content-Type": "application/json",
			},
			params: { datefrom, dateto, mst: taxCode },
		});

		let invoices = [];
		if (Array.isArray(response.data)) {
			invoices = response.data;
			console.log("🚀 ~ fetchInvoicesFromThirdParty ~ invoices:", invoices);
		} else if (Array.isArray(response.data.result)) {
			invoices = response.data.result;
		} else if (Array.isArray(response.data.invoices)) {
			invoices = response.data.invoices;
		}

		if (!Array.isArray(invoices) || invoices.length === 0) {
			throw new ApiError(
				StatusCodes.NOT_FOUND,
				"No invoices found from third party API",
			);
		}

		return invoices;
	} catch (err) {
		if (err.code === "ECONNABORTED") {
			console.warn(
				`Timeout (30s) when fetching invoices from ${datefrom} to ${dateto} for taxCode ${taxCode}`,
			);
			return [];
		}
		throw err;
	}
};
const fetchInvoiceDetailFromThirdParty = async (
	nbmst,
	khhdon,
	shdon,
	khmshdon,
	taxCode,
) => {
	const response = await axios.get(`${API_BASE_URL}/invoice-detail`, {
		headers: {
			Authorization: `Bearer ${THIRD_PARTY_TOKEN}`,
			"Content-Type": "application/json",
		},
		params: { nbmst, khhdon, shdon, khmshdon, mst: taxCode },
	});

	return response.data;
};

const syncInvoicesFromThirdParty = async (userId, datefrom, dateto) => {
	if (!datefrom || !dateto) {
		throw new ApiError(
			StatusCodes.BAD_REQUEST,
			"Missing required parameters: datefrom and dateto",
		);
	}

	const owner = await getBusinessOwnerByUserId(userId);
	const invoices = await fetchInvoicesFromThirdParty(
		datefrom,
		dateto,
		owner.taxCode,
	);

	let sync = 0,
		skip = 0,
		fail = 0;

	for (const invoice of invoices) {
		try {
			const data = { ...invoice, ownerId: owner._id };
			await createInvoice(data);
			sync++;
		} catch (err) {
			if (err?.message?.includes("already exists")) {
				skip++;
			} else {
				fail++;
			}
		}
	}

	return { sync, skip, fail };
};

const GDT_INVOICE_BASE = "https://hoadondientu.gdt.gov.vn:30000";
const GDT_PAGE_SIZE = 40;

const fetchInvoicesFromGDT = async (gdtToken, dateFrom, dateTo) => {
	const formatGDTDate = (dateStr, endOfDay = false) => {
		const [year, month, day] = dateStr.split("-");
		const time = endOfDay ? "T23:59:59" : "T00:00:00";
		return `${day}/${month}/${year}${time}`;
	};

	const startStr = formatGDTDate(dateFrom);
	const endStr = formatGDTDate(dateTo, true);
	const search = `tdlap=ge=${startStr};tdlap=le=${endStr};ttxly==5`;
     
	let page = 0;
	const allInvoices = [];

	while (true) {
		const response = await axios.get(
			`${GDT_INVOICE_BASE}/query/invoices/purchase`,
			{
				headers: {
					Authorization: `Bearer ${gdtToken}`,
					"Content-Type": "application/json",
				},
				params: { sort: "tdlap:desc", size: GDT_PAGE_SIZE, page, search },
				timeout: 30000,
			},
		);

		const data = response.data;
		const items = Array.isArray(data?.datas)
			? data.datas
			: Array.isArray(data?.content)
				? data.content
				: [];

		allInvoices.push(...items);

		if (items.length < GDT_PAGE_SIZE) break;
		page++;
	}

	return allInvoices;
};

const fetchInvoiceDetailFromGDT = async (gdtToken, nbmst, khhdon, shdon, khmshdon) => {
	const response = await axios.get(
		`${GDT_INVOICE_BASE}/query/invoices/detail`,
		{
			headers: {
				Authorization: `Bearer ${gdtToken}`,
				"Content-Type": "application/json",
			},
			params: { nbmst, khhdon, shdon, khmshdon },
			timeout: 30000,
		},
	);
	return response.data;
};

const syncListInvoicesDetailsFromThirdParty = async (userId, gdtToken) => {
	const owner = await getBusinessOwnerByUserId(userId);

	const latestInvoice = await InvoicesIn.findOne({ ownerId: owner._id })
		.sort({ ncnhat: -1 })
		.select("ncnhat");

	let finalDateFrom;
	if (latestInvoice && latestInvoice.ncnhat) {
		const lastDate = new Date(latestInvoice.ncnhat);
		finalDateFrom = lastDate.toISOString().split("T")[0];
	} else {
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth();

		let startDate;
		if (owner.tax_filing_frequency === 1) {
			startDate = new Date(year, month, 1);
		} else {
			const quarterStartMonth = Math.floor(month / 3) * 3;
			startDate = new Date(year, quarterStartMonth, 1);
		}
		const yyyy = startDate.getFullYear();
		const mm = String(startDate.getMonth() + 1).padStart(2, "0");
		const dd = String(startDate.getDate()).padStart(2, "0");
		finalDateFrom = `${yyyy}-${mm}-${dd}`;
	}

	const finalDateTo = new Date().toISOString().split("T")[0];

	const dateChunks = splitDateRangeIntoChunks(finalDateFrom, finalDateTo);

	console.log("=== [TEST] syncListInvoicesDetailsFromThirdParty ===");
	console.log(`finalDateFrom : ${finalDateFrom}`);
	console.log(`finalDateTo   : ${finalDateTo}`);
	console.log(`Total chunks  : ${dateChunks.length}`);
	dateChunks.forEach((chunk, i) => {
		console.log(`  Chunk[${i}] from=${chunk.from}  to=${chunk.to}`);
	});
	console.log("====================================================");

	let totalSync = 0,
		totalSkip = 0,
		totalFail = 0;
	const processedChunks = [];

	for (const chunk of dateChunks) {
		console.log(`Processing chunk: from ${chunk.from} to ${chunk.to}`);

		try {
			const invoices = await fetchInvoicesFromGDT(
				gdtToken,
				chunk.from,
				chunk.to,
			);

			console.log(`Found ${invoices.length} invoices in chunk [${chunk.from} → ${chunk.to}]`);
			invoices.forEach((inv, i) => {
				console.log(`  → [${i}] nbmst=${inv.nbmst} khhdon=${inv.khhdon} shdon=${inv.shdon} khmshdon=${inv.khmshdon}`);
			});

			let chunkSync = 0,
				chunkSkip = 0,
				chunkFail = 0;

			for (const [idx, invoice] of invoices.entries()) {
				const invoiceLabel = `[${chunk.from}~${chunk.to}] Invoice[${idx}] nbmst=${invoice.nbmst} khhdon=${invoice.khhdon} shdon=${invoice.shdon}`;
				try {
					const data = { ...invoice, ownerId: owner._id };
					const saved = await createInvoice(data);
					console.log(`  ✔ SAVED   ${invoiceLabel}`);

					// Fetch product detail (hdhhdvu) and update
					try {
						const detail = await fetchInvoiceDetailFromGDT(
							gdtToken,
							invoice.nbmst,
							invoice.khhdon,
							invoice.shdon,
							invoice.khmshdon,
						);
						if (Array.isArray(detail?.hdhhdvu) && detail.hdhhdvu.length > 0) {
							await InvoicesIn.findByIdAndUpdate(saved._id, { hdhhdvu: detail.hdhhdvu });
							console.log(`    ↳ DETAIL saved (${detail.hdhhdvu.length} items) ${invoiceLabel}`);
						} else {
							console.log(`    ↳ DETAIL empty/no hdhhdvu ${invoiceLabel}`);
						}
					} catch (detailErr) {
						console.error(`    ↳ DETAIL FAIL ${invoiceLabel} | ${detailErr.message}`);
					}

					chunkSync++;
				} catch (err) {
					if (err?.message?.includes("already exists")) {
						chunkSkip++;
						console.log(`  ~ SKIP    ${invoiceLabel}`);
					} else {
						chunkFail++;
						console.error(`  ✘ FAIL    ${invoiceLabel} | ${err.message}`);
					}
				}
			}

			totalSync += chunkSync;
			totalSkip += chunkSkip;
			totalFail += chunkFail;

			processedChunks.push({
				dateFrom: chunk.from,
				dateTo: chunk.to,
				sync: chunkSync,
				skip: chunkSkip,
				fail: chunkFail,
				total: invoices.length,
			});

			console.log(
				`Chunk completed: sync=${chunkSync}, skip=${chunkSkip}, fail=${chunkFail}`,
			);

			await new Promise((resolve) => setTimeout(resolve, 700));
		} catch (err) {
			console.error(
				`Error processing chunk ${chunk.from} to ${chunk.to}:`,
				err,
			);
			processedChunks.push({
				dateFrom: chunk.from,
				dateTo: chunk.to,
				error: err.message,
			});
		}
	}

	return {
		sync: totalSync,
		skip: totalSkip,
		fail: totalFail,
		dateFrom: finalDateFrom,
		dateTo: finalDateTo,
		chunksProcessed: processedChunks.length,
		chunkDetails: processedChunks,
	};
};

const getInvoiceDetailFromThirdParty = async (
	userId,
	nbmst,
	khhdon,
	shdon,
	khmshdon,
) => {
	if (!nbmst || !khhdon || !shdon || !khmshdon) {
		throw new ApiError(
			StatusCodes.BAD_REQUEST,
			"Missing required parameters: nbmst, khhdon, shdon, khmshdon",
		);
	}

	const owner = await getBusinessOwnerByUserId(userId);
	const invoiceDetail = await fetchInvoiceDetailFromThirdParty(
		nbmst,
		khhdon,
		shdon,
		khmshdon,
		owner.taxCode,
	);

	return invoiceDetail;
};

export default {
	createInvoice,
	getInvoices,
	getInvoiceById,
	updateInvoice,
	deleteInvoice,
	getBusinessOwnerByUserId,
	syncInvoicesFromThirdParty,
	syncListInvoicesDetailsFromThirdParty,
	getInvoiceDetailFromThirdParty,
};
