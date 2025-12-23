import InvoicesInService from "../services/invoicesInService.js";

export const syncInvoicesFromThirdParty = async (req, res) => {
	try {
		const { datefrom, dateto } = req.body;
		const userId = req.user.userId;
		const result = await InvoicesInService.syncInvoicesFromThirdParty(
			userId,
			datefrom,
			dateto
		);
		res.status(200).json(result);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
};

export const syncListInvoicesDetailsFromThirdParty = async (req, res) => {
	try {
		const userId = req.user.userId;
		const result =
			await InvoicesInService.syncListInvoicesDetailsFromThirdParty(userId);
		res.status(200).json(result);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
};

export const getInvoiceDetailFromThirdParty = async (req, res) => {
	try {
		const { nbmst, khhdon, shdon, khmshdon } = req.body;
		const userId = req.user.userId;
		const result = await InvoicesInService.getInvoiceDetailFromThirdParty(
			userId,
			nbmst,
			khhdon,
			shdon,
			khmshdon
		);
		res.status(200).json(result);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
};

export const createInvoice = async (req, res) => {
	try {
		const userId = req.user.userId;
		const owner = await InvoicesInService.getBusinessOwnerByUserId(userId);
		const data = { ...req.body, ownerId: owner._id };
		const invoice = await InvoicesInService.createInvoice(data);
		res.status(201).json(invoice);
	} catch (error) {
		res.status(error.statusCode || 400).json({ error: error.message });
	}
};

export const getInvoices = async (req, res) => {
	try {
		const invoices = await InvoicesInService.getInvoices(req.query);
		res.status(200).json(invoices);
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

export const getInvoiceById = async (req, res) => {
	try {
		const invoice = await InvoicesInService.getInvoiceById(req.params.id);
		if (!invoice) return res.status(404).json({ error: "Invoice not found" });
		res.status(200).json(invoice);
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

export const updateInvoice = async (req, res) => {
	try {
		const invoice = await InvoicesInService.updateInvoice(
			req.params.id,
			req.body
		);
		if (!invoice) return res.status(404).json({ error: "Invoice not found" });
		res.status(200).json(invoice);
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};
export const deleteInvoice = async (req, res) => {
	try {
		const result = await InvoicesInService.deleteInvoice(req.params.id);
		if (!result) return res.status(404).json({ error: "Invoice not found" });
		res.status(200).json({ message: "Invoice deleted" });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};
