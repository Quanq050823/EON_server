"use strict";

export const generateIkey = () => {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8).toUpperCase();
	return `INV-${timestamp}-${random}`;
};
export const calculateInvoiceTotals = (products) => {
	let total = 0;
	let vatAmount = 0;

	products.forEach((product) => {
		// Calculate product totals if not provided
		const prodTotal = product.total || product.quantity * product.price;
		const prodVATAmount =
			product.vatAmount || (prodTotal * product.vatRate) / 100;
		const prodAmount = product.amount || prodTotal + prodVATAmount;

		// Update product with calculated values
		product.total = prodTotal;
		product.vatAmount = prodVATAmount;
		product.amount = prodAmount;

		// Add to invoice totals
		total += prodTotal;
		vatAmount += prodVATAmount;
	});

	const amount = total + vatAmount;

	return {
		total: Math.round(total),
		vatAmount: Math.round(vatAmount),
		amount: Math.round(amount),
	};
};

export const numberToVietnameseWords = (num) => {
	if (num === 0) return "Không đồng";

	const ones = [
		"",
		"một",
		"hai",
		"ba",
		"bốn",
		"năm",
		"sáu",
		"bảy",
		"tám",
		"chín",
	];
	const tens = [
		"",
		"mười",
		"hai mươi",
		"ba mươi",
		"bốn mươi",
		"năm mươi",
		"sáu mươi",
		"bảy mươi",
		"tám mươi",
		"chín mươi",
	];
	const scales = ["", "nghìn", "triệu", "tỷ"];

	const convertChunk = (n) => {
		if (n === 0) return "";

		let result = "";
		const hundreds = Math.floor(n / 100);
		const remainder = n % 100;
		const tensDigit = Math.floor(remainder / 10);
		const onesDigit = remainder % 10;

		if (hundreds > 0) {
			result += ones[hundreds] + " trăm";
			if (remainder > 0 && remainder < 10) {
				result += " lẻ";
			}
		}

		if (tensDigit > 1) {
			result += (result ? " " : "") + tens[tensDigit];
			if (onesDigit > 0) {
				if (onesDigit === 1) {
					result += " mốt";
				} else if (onesDigit === 5 && tensDigit > 0) {
					result += " lăm";
				} else {
					result += " " + ones[onesDigit];
				}
			}
		} else if (tensDigit === 1) {
			result += (result ? " " : "") + "mười";
			if (onesDigit > 0) {
				if (onesDigit === 5) {
					result += " lăm";
				} else {
					result += " " + ones[onesDigit];
				}
			}
		} else if (onesDigit > 0) {
			result += (result ? " " : "") + ones[onesDigit];
		}

		return result;
	};

	const chunks = [];
	let tempNum = Math.floor(num);

	while (tempNum > 0) {
		chunks.push(tempNum % 1000);
		tempNum = Math.floor(tempNum / 1000);
	}

	let result = "";
	for (let i = chunks.length - 1; i >= 0; i--) {
		if (chunks[i] > 0) {
			const chunkText = convertChunk(chunks[i]);
			result += (result ? " " : "") + chunkText;
			if (i > 0) {
				result += " " + scales[i];
			}
		}
	}

	result = result.charAt(0).toUpperCase() + result.slice(1);
	result += " đồng chẵn";

	return result;
};

export const processInvoiceData = (invoiceData) => {
	if (!invoiceData.ikey) {
		invoiceData.ikey = generateIkey();
	}

	if (invoiceData.products && invoiceData.products.length > 0) {
		const totals = calculateInvoiceTotals(invoiceData.products);
		invoiceData.total = totals.total;
		invoiceData.vatAmount = totals.vatAmount;
		invoiceData.amount = totals.amount;
	}

	if (!invoiceData.amountInWords && invoiceData.amount) {
		invoiceData.amountInWords = numberToVietnameseWords(invoiceData.amount);
	}

	return invoiceData;
};
