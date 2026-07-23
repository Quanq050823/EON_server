import axiosInstance from "@/src/services/API/axios";
import {
	CreateInvoiceRequest,
	InvoiceCCT,
	InvoiceData,
} from "@/src/types/invoiceExport";
import { InvoiceListResponse } from "@/src/types/route";

type ExportInvoiceOutputResult = {
	easyInvoice: EaseInvoiceResponse;
	savedInvoice?: unknown;
};

type AdjustInvoiceData = CreateInvoiceRequest["invoiceData"];

export const getInvoiceInputList = async () => {
	try {
		const res = await axiosInstance.get<InvoiceListResponse>("input-invoice");

		return res.data;
	} catch (error: any) {
		if (error.response) {
			throw error.response.data;
		}
		throw error;
	}
};
export const getInvoiceOutputList = async () => {
	try {
		const res = await axiosInstance.get<InvoiceListResponse>("output-invoices");

		return res.data;
	} catch (error: any) {
		if (error.response) {
			throw error.response.data;
		}
		throw error;
	}
};
export const getInvoiceOutputById = async (userId: string) => {
	try {
		const res = await axiosInstance.get<InvoiceListResponse>(
			`output-invoice/ ${userId}`,
		);

		return res.data;
	} catch (error: any) {
		if (error.response) {
			throw error.response.data;
		}
		throw error;
	}
};

export const exportInvoiceOutput = async (invoiceData: InvoiceData) => {
	try {
		const res = await axiosInstance.post(`output-invoices`, invoiceData);

		return res.data;
	} catch (error: any) {
		if (error.response) {
			throw error.response.data;
		}
		console.log(error);

		throw error;
	}
};

type EaseInvoiceResponse = {
	Status: number;
	Message?: string;
	ErrorCode?: number;
	Data?: {
		Pattern?: string;
		Serial?: string;
		KeyInvoiceMsg?: Record<string, string>;
	};
};

type EaseInvoiceApiResponse = {
	success?: boolean;
	message?: string;
	data?: EaseInvoiceResponse;
	invoiceData?: CreateInvoiceRequest["invoiceData"];
	savedInvoice?: unknown;
};

const normalizeEaseInvoiceResponse = (
	responseData: EaseInvoiceResponse | EaseInvoiceApiResponse,
): EaseInvoiceResponse => {
	if ("success" in responseData && responseData.success === false) {
		throw new Error(responseData.message ?? "Xuất CCT thất bại");
	}

	if ("data" in responseData && responseData.data) {
		return responseData.data;
	}

	return responseData as EaseInvoiceResponse;
};

const isEaseInvoiceSuccess = (data: EaseInvoiceResponse) =>
	Number(data?.Status) === 1;

export const exportInvoiceOutputEaseInvoice = async (
	invoiceData: CreateInvoiceRequest,
) => {
	try {
		const res = await axiosInstance.post<
			EaseInvoiceResponse | EaseInvoiceApiResponse
		>(
			`easyinvoice/importInvoice`, //XUẤT HÓA ĐƠN CHƯA PHÁT HÀNH
			// `easyinvoice/import-and-issue-invoice`, //XUẤT HÓA ĐƠN VÀ PHÁT HÀNH NGAY
			invoiceData,
		);

		const data = normalizeEaseInvoiceResponse(res.data);

		// ❗❗❗ BẮT BUỘC
		if (!isEaseInvoiceSuccess(data)) {
			const message = data?.Data?.KeyInvoiceMsg
				? Object.values(data.Data.KeyInvoiceMsg)[0]
				: (data?.Message ?? "Xuất CCT thất bại");

			throw new Error(message);
		}
		return data;
	} catch (error: any) {
		if (error.response) {
			throw error.response.data;
		}
		console.log(error);

		throw error;
	}
};

export const exportInvoiceOutputAndSaveDb = async (
	easyInvoiceData: CreateInvoiceRequest,
	dbInvoiceData?: InvoiceData,
): Promise<ExportInvoiceOutputResult> => {
	const res = await axiosInstance.post<EaseInvoiceApiResponse>(
		`easyinvoice/importInvoice`,
		easyInvoiceData,
	);
	const easyInvoice = normalizeEaseInvoiceResponse(res.data);
	let savedInvoice = res.data.savedInvoice;

	if (!savedInvoice && dbInvoiceData) {
		savedInvoice = await exportInvoiceOutput(dbInvoiceData);
	}

	return {
		easyInvoice,
		savedInvoice,
	};
};

// ─── EasyInvoice Management ───────────────────────────────────────────────────

export type EasyInvoiceItem = {
	Ikey: string;
	No: string;
	Pattern: string;
	Serial: string;
	ArisingDate: string;
	IssueDate: string;
	CustomerName: string;
	CustomerAddress: string;
	CustomerCode: string;
	CustomerTaxCode: string;
	Total: number;
	TaxAmount: number;
	Amount: number;
	/** 0: Chưa phát hành, 1: Đã phát hành, 2: Đã hủy */
	InvoiceStatus: number;
	HasSigned: boolean;
	LookupCode: string | null;
	LinkView: string | null;
	TCTCheckStatus: string | null;
	TaxAuthorityCode: string | null;
	ModifiedDate: string;
	PublishedBy: string | null;
	Html: string | null;
	DocumentStatus: string | null;
	Type: number;
	Extra: unknown | null;
	Buyer: unknown | null;
	IsSentTCTSummary: boolean;
	TCTErrorMessage: string | null;
	CusIdentification: string | null;
	BudgetaryRelationshipCode: string | null;
	PassportNo: string | null;
};

export type EasyInvoiceListData = {
	Page: number;
	PageSize: number;
	TotalRecords: number;
	TotalPages: number;
	Pattern: string | null;
	Invoices: EasyInvoiceItem[];
};

export type EasyInvoiceListResponse = {
	success: boolean;
	data: {
		Status: number;
		Message: string;
		Data: EasyInvoiceListData;
	};
	dateRange?: { FromDate: string; ToDate: string };
};

export const getEasyInvoicesAuto =
	async (): Promise<EasyInvoiceListResponse> => {
		try {
			const res = await axiosInstance.get<EasyInvoiceListResponse>(
				`easyinvoice/getInvoiceAuto`,
			);
			return res.data;
		} catch (error: any) {
			if (error.response) throw error.response.data;
			throw error;
		}
	};

export const getEasyInvoicesByDateRange = async (params: {
	FromDate: string;
	ToDate: string;
	Page?: number;
	PageSize?: number;
}): Promise<EasyInvoiceListResponse> => {
	try {
		const res = await axiosInstance.post<EasyInvoiceListResponse>(
			`easyinvoice/getInvoiceByArisingDateRange`,
			params,
		);
		return res.data;
	} catch (error: any) {
		if (error.response) throw error.response.data;
		throw error;
	}
};

export const viewEasyInvoice = async (params: {
	Ikey: string;
	Pattern: string;
	Option?: number;
	Serial?: string;
}) => {
	try {
		const res = await axiosInstance.post(`easyinvoice/viewInvoice`, params);
		return res.data;
	} catch (error: any) {
		if (error.response) throw error.response.data;
		throw error;
	}
};

export const cancelEasyInvoice = async (Ikey: string) => {
	try {
		const res = await axiosInstance.post(`easyinvoice/cancel-invoice`, {
			Ikey,
		});
		return res.data;
	} catch (error: any) {
		if (error.response) throw error.response.data;
		throw error;
	}
};

export type EasyInvoiceRelatedInvoice = {
	No?: string;
	Pattern?: string;
	Serial?: string;
	ArisingDate?: string;
	IssueDate?: string;
	CustomerName?: string;
	CustomerTaxCode?: string;
	Total?: number;
	TaxAmount?: number;
	Amount?: number;
	TaxAuthorityCode?: string;
	LookupCode?: string;
};

export type AdjustEasyInvoicePayload = {
	XmlData?: string;
	invoiceData?: AdjustInvoiceData;
	Ikey?: string;
	Pattern?: string;
	Serial?: string;
	RelatedInvoice?: EasyInvoiceRelatedInvoice;
};

export type AdjustEasyInvoiceInput = {
	xmlData?: string;
	invoiceData?: AdjustInvoiceData;
	invoice?: Pick<EasyInvoiceItem, "Ikey" | "Pattern" | "Serial">;
	ikey?: string;
	pattern?: string;
	serial?: string;
	relatedInvoice?: EasyInvoiceRelatedInvoice;
};

export const mapAdjustEasyInvoicePayload = (
	input: AdjustEasyInvoiceInput,
): AdjustEasyInvoicePayload => {
	const ikey = input.ikey ?? input.invoice?.Ikey;
	const pattern = input.pattern ?? input.invoice?.Pattern;
	const serial = input.serial ?? input.invoice?.Serial;

	return {
		XmlData: input.xmlData,
		invoiceData: input.invoiceData,
		Ikey: ikey,
		Pattern: pattern,
		Serial: serial,
		RelatedInvoice: input.relatedInvoice,
	};
};

export const adjustEasyInvoice = async (params: AdjustEasyInvoicePayload) => {
	try {
		const res = await axiosInstance.post(`easyinvoice/adjustInvoice`, params);
		return res.data;
	} catch (error: any) {
		if (error.response) throw error.response.data;
		throw error;
	}
};

export const adjustEasyInvoiceFromSource = async (
	input: AdjustEasyInvoiceInput,
) => {
	const payload = mapAdjustEasyInvoicePayload(input);
	return adjustEasyInvoice(payload);
};
