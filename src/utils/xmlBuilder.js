"use strict";

/**
 * Build XML string for EasyInvoice API from invoice data
 * @param {Object} invoiceData - Invoice data object
 * @returns {string} XML string
 */
export const buildInvoiceXML = (invoiceData) => {
	const {
		ikey,
		customerName,
		customerAddress,
		customerTaxCode,
		paymentMethod,
		products,
		total,
		vatAmount,
		amount,
		amountInWords,
		// Optional fields
		customerPhone,
		customerEmail,
		customerBankAccount,
		customerBankName,
		extra,
	} = invoiceData;

	// Build products XML
	const productsXML = products
		.map(
			(product) => `
        <Product>
          <ProdName>${escapeXML(product.name)}</ProdName>
          <ProdUnit>${escapeXML(product.unit)}</ProdUnit>
          <ProdQuantity>${product.quantity}</ProdQuantity>
          <ProdPrice>${product.price}</ProdPrice>
          <Total>${product.total}</Total>
          <VATRate>${product.vatRate}</VATRate>
          <VATAmount>${product.vatAmount}</VATAmount>
          <Amount>${product.amount}</Amount>
        </Product>`
		)
		.join("");

	// Build optional fields
	const optionalFields = [];
	if (customerPhone)
		optionalFields.push(`<CusPhone>${escapeXML(customerPhone)}</CusPhone>`);
	if (customerEmail)
		optionalFields.push(`<CusEmail>${escapeXML(customerEmail)}</CusEmail>`);
	if (customerBankAccount)
		optionalFields.push(
			`<CusBankAccount>${escapeXML(customerBankAccount)}</CusBankAccount>`
		);
	if (customerBankName)
		optionalFields.push(
			`<CusBankName>${escapeXML(customerBankName)}</CusBankName>`
		);
	if (extra) optionalFields.push(`<Extra>${escapeXML(extra)}</Extra>`);

	// Build complete XML
	const xml = `<Invoices>
  <Inv>
    <Invoice>
      <Ikey>${escapeXML(ikey)}</Ikey>
      <CusName>${escapeXML(customerName)}</CusName>
      <CusAddress>${escapeXML(customerAddress)}</CusAddress>
      <CusTaxCode>${escapeXML(customerTaxCode || "")}</CusTaxCode>
      <PaymentMethod>${escapeXML(paymentMethod)}</PaymentMethod>
      ${optionalFields.join("\n      ")}
      <Products>${productsXML}
      </Products>
      <Total>${total}</Total>
      <VATAmount>${vatAmount}</VATAmount>
      <Amount>${amount}</Amount>
      <AmountInWords>${escapeXML(amountInWords)}</AmountInWords>
    </Invoice>
  </Inv>
</Invoices>`;

	return xml;
};

/**
 * Build XML string for multiple invoices
 * @param {Array} invoicesData - Array of invoice data objects
 * @returns {string} XML string
 */
export const buildMultipleInvoicesXML = (invoicesData) => {
	const invoicesXML = invoicesData
		.map((invoiceData) => {
			const {
				ikey,
				customerName,
				customerAddress,
				customerTaxCode,
				paymentMethod,
				products,
				total,
				vatAmount,
				amount,
				amountInWords,
				customerPhone,
				customerEmail,
				customerBankAccount,
				customerBankName,
				extra,
			} = invoiceData;

			// Build products XML
			const productsXML = products
				.map(
					(product) => `
        <Product>
          <ProdName>${escapeXML(product.name)}</ProdName>
          <ProdUnit>${escapeXML(product.unit)}</ProdUnit>
          <ProdQuantity>${product.quantity}</ProdQuantity>
          <ProdPrice>${product.price}</ProdPrice>
          <Total>${product.total}</Total>
          <VATRate>${product.vatRate}</VATRate>
          <VATAmount>${product.vatAmount}</VATAmount>
          <Amount>${product.amount}</Amount>
        </Product>`
				)
				.join("");

			// Build optional fields
			const optionalFields = [];
			if (customerPhone)
				optionalFields.push(`<CusPhone>${escapeXML(customerPhone)}</CusPhone>`);
			if (customerEmail)
				optionalFields.push(`<CusEmail>${escapeXML(customerEmail)}</CusEmail>`);
			if (customerBankAccount)
				optionalFields.push(
					`<CusBankAccount>${escapeXML(customerBankAccount)}</CusBankAccount>`
				);
			if (customerBankName)
				optionalFields.push(
					`<CusBankName>${escapeXML(customerBankName)}</CusBankName>`
				);
			if (extra) optionalFields.push(`<Extra>${escapeXML(extra)}</Extra>`);

			return `
    <Inv>
      <Invoice>
        <Ikey>${escapeXML(ikey)}</Ikey>
        <CusName>${escapeXML(customerName)}</CusName>
        <CusAddress>${escapeXML(customerAddress)}</CusAddress>
        <CusTaxCode>${escapeXML(customerTaxCode || "")}</CusTaxCode>
        <PaymentMethod>${escapeXML(paymentMethod)}</PaymentMethod>
        ${optionalFields.join("\n        ")}
        <Products>${productsXML}
        </Products>
        <Total>${total}</Total>
        <VATAmount>${vatAmount}</VATAmount>
        <Amount>${amount}</Amount>
        <AmountInWords>${escapeXML(amountInWords)}</AmountInWords>
      </Invoice>
    </Inv>`;
		})
		.join("");

	return `<Invoices>${invoicesXML}
</Invoices>`;
};

/**
 * Escape special XML characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
const escapeXML = (str) => {
	if (str == null) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
};
