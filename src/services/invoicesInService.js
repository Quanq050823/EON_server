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
			"Invoice code (mhdon) already exists for this business owner"
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

const splitDateRangeIntoChunks = (startDate, endDate, maxDays) => {
	const chunks = [];
	const start = new Date(startDate);
	const end = new Date(endDate);

	let currentStart = new Date(start);

	while (currentStart <= end) {
		let currentEnd = new Date(currentStart);
		currentEnd.setDate(currentEnd.getDate() + maxDays - 1);

		if (currentEnd > end) {
			currentEnd = new Date(end);
		}

		chunks.push({
			from: currentStart.toISOString().split("T")[0],
			to: currentEnd.toISOString().split("T")[0],
		});

		currentStart = new Date(currentEnd);
		currentStart.setDate(currentStart.getDate() + 1);
	}

	return chunks;
};

const fetchInvoicesFromThirdParty = async (datefrom, dateto, taxCode) => {
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
	} else if (Array.isArray(response.data.result)) {
		invoices = response.data.result;
	} else if (Array.isArray(response.data.invoices)) {
		invoices = response.data.invoices;
	}

	if (!Array.isArray(invoices) || invoices.length === 0) {
		throw new ApiError(
			StatusCodes.NOT_FOUND,
			"No invoices found from third party API"
		);
	}

	return invoices;
};

const fetchInvoiceDetailFromThirdParty = async (
	nbmst,
	khhdon,
	shdon,
	khmshdon,
	taxCode
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
			"Missing required parameters: datefrom and dateto"
		);
	}

	const owner = await getBusinessOwnerByUserId(userId);
	const invoices = await fetchInvoicesFromThirdParty(
		datefrom,
		dateto,
		owner.taxCode
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

const syncListInvoicesDetailsFromThirdParty = async (userId) => {
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

	const dateChunks = splitDateRangeIntoChunks(
		finalDateFrom,
		finalDateTo,
		MAX_DAYS_PER_REQUEST
	);

	let totalSync = 0,
		totalSkip = 0,
		totalFail = 0;
	const allInvoiceDetailsList = [];
	const processedChunks = [];

	// Xử lý từng chunk
	for (const chunk of dateChunks) {
		console.log(`Processing chunk: from ${chunk.from} to ${chunk.to}`);

		try {
			const invoices = await fetchInvoicesFromThirdParty(
				chunk.from,
				chunk.to,
				owner.taxCode
			);

			console.log(`Found ${invoices.length} invoices in chunk`);

			let chunkSync = 0,
				chunkSkip = 0,
				chunkFail = 0;

			for (const invoice of invoices) {
				const invoiceInfo = {
					nbmst: invoice.nbmst,
					khhdon: invoice.khhdon,
					shdon: invoice.shdon,
					khmshdon: invoice.khmshdon,
				};
				allInvoiceDetailsList.push(invoiceInfo);

				try {
					const detailResponse = await fetchInvoiceDetailFromThirdParty(
						invoice.nbmst,
						invoice.khhdon,
						invoice.shdon,
						invoice.khmshdon,
						owner.taxCode
					);

					const invoiceDetailArr = detailResponse?.result;
					if (
						!Array.isArray(invoiceDetailArr) ||
						invoiceDetailArr.length === 0
					) {
						chunkFail++;
						continue;
					}

					const invoiceDetail = invoiceDetailArr[0];
					const data = { ...invoiceDetail, ownerId: owner._id };

					await createInvoice(data);
					chunkSync++;
				} catch (err) {
					if (err?.message?.includes("already exists")) {
						chunkSkip++;
					} else {
						chunkFail++;
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
				`Chunk completed: sync=${chunkSync}, skip=${chunkSkip}, fail=${chunkFail}`
			);
		} catch (err) {
			console.error(
				`Error processing chunk ${chunk.from} to ${chunk.to}:`,
				err
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
		invoiceDetailsList: allInvoiceDetailsList,
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
	khmshdon
) => {
	if (!nbmst || !khhdon || !shdon || !khmshdon) {
		throw new ApiError(
			StatusCodes.BAD_REQUEST,
			"Missing required parameters: nbmst, khhdon, shdon, khmshdon"
		);
	}

	const owner = await getBusinessOwnerByUserId(userId);
	const invoiceDetail = await fetchInvoiceDetailFromThirdParty(
		nbmst,
		khhdon,
		shdon,
		khmshdon,
		owner.taxCode
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
