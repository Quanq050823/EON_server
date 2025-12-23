"use strict";

const buildProductXml = (product) => {
	return `
		<Product>
			${product.code ? `<Code>${product.code}</Code>` : ""}
			${product.no ? `<No>${product.no}</No>` : ""}
			${product.feature ? `<Feature>${product.feature}</Feature>` : ""}
			<ProdName>${product.name}</ProdName>
			<ProdUnit>${product.unit}</ProdUnit>
			<ProdQuantity>${product.quantity}</ProdQuantity>
			<ProdPrice>${product.price}</ProdPrice>
			${product.discount ? `<Discount>${product.discount}</Discount>` : ""}
			${
				product.discountAmount
					? `<DiscountAmount>${product.discountAmount}</DiscountAmount>`
					: ""
			}
			<Total>${product.total}</Total>
			<VATRate>${product.vatRate}</VATRate>
			${
				product.vatRateOther
					? `<VATRateOther>${product.vatRateOther}</VATRateOther>`
					: ""
			}
			<VATAmount>${product.vatAmount}</VATAmount>
			<Amount>${product.amount}</Amount>
			${product.extra ? `<Extra>${JSON.stringify(product.extra)}</Extra>` : ""}
		</Product>`;
};

export const buildInvoiceXml = (invoice) => {
	const productsXml = invoice.products
		.map((product) => buildProductXml(product))
		.join("");

	return `<Invoices>
	<Inv>
		<Invoice>
			<Ikey>${invoice.ikey}</Ikey>
			${invoice.cusCode ? `<CusCode>${invoice.cusCode}</CusCode>` : ""}
			${invoice.buyer ? `<Buyer>${invoice.buyer}</Buyer>` : ""}
			<CusName>${invoice.cusName}</CusName>
			${invoice.email ? `<Email>${invoice.email}</Email>` : ""}
			${invoice.emailCC ? `<EmailCC>${invoice.emailCC}</EmailCC>` : ""}
			${invoice.cusAddress ? `<CusAddress>${invoice.cusAddress}</CusAddress>` : ""}
			${
				invoice.cusBankName
					? `<CusBankName>${invoice.cusBankName}</CusBankName>`
					: ""
			}
			${invoice.cusBankNo ? `<CusBankNo>${invoice.cusBankNo}</CusBankNo>` : ""}
			${invoice.cusPhone ? `<CusPhone>${invoice.cusPhone}</CusPhone>` : ""}
			${invoice.cusTaxCode ? `<CusTaxCode>${invoice.cusTaxCode}</CusTaxCode>` : ""}
			<PaymentMethod>${invoice.paymentMethod}</PaymentMethod>
			${
				invoice.arisingDate
					? `<ArisingDate>${invoice.arisingDate}</ArisingDate>`
					: ""
			}
			${
				invoice.exchangeRate
					? `<ExchangeRate>${invoice.exchangeRate}</ExchangeRate>`
					: ""
			}
			${
				invoice.currencyUnit
					? `<CurrencyUnit>${invoice.currencyUnit}</CurrencyUnit>`
					: "<CurrencyUnit>VND</CurrencyUnit>"
			}
			${invoice.extra ? `<Extra>${JSON.stringify(invoice.extra)}</Extra>` : ""}
			<Products>${productsXml}</Products>
			<Total>${invoice.total}</Total>
			${invoice.vatRate ? `<VATRate>${invoice.vatRate}</VATRate>` : ""}
			${
				invoice.vatRateOther
					? `<VATRateOther>${invoice.vatRateOther}</VATRateOther>`
					: ""
			}
			<VATAmount>${invoice.vatAmount}</VATAmount>
			<Amount>${invoice.amount}</Amount>
			${
				invoice.grossValue !== undefined
					? `<GrossValue>${invoice.grossValue}</GrossValue>`
					: ""
			}
			${
				invoice.grossValue0 !== undefined
					? `<GrossValue0>${invoice.grossValue0}</GrossValue0>`
					: ""
			}
			${
				invoice.grossValue5 !== undefined
					? `<GrossValue5>${invoice.grossValue5}</GrossValue5>`
					: ""
			}
			${
				invoice.grossValue8 !== undefined
					? `<GrossValue8>${invoice.grossValue8}</GrossValue8>`
					: ""
			}
			${
				invoice.grossValue10 !== undefined
					? `<GrossValue10>${invoice.grossValue10}</GrossValue10>`
					: ""
			}
			${
				invoice.vatAmount0 !== undefined
					? `<VatAmount0>${invoice.vatAmount0}</VatAmount0>`
					: ""
			}
			${
				invoice.vatAmount5 !== undefined
					? `<VatAmount5>${invoice.vatAmount5}</VatAmount5>`
					: ""
			}
			${
				invoice.vatAmount8 !== undefined
					? `<VatAmount8>${invoice.vatAmount8}</VatAmount8>`
					: ""
			}
			${
				invoice.vatAmount10 !== undefined
					? `<VatAmount10>${invoice.vatAmount10}</VatAmount10>`
					: ""
			}
			${invoice.amount0 !== undefined ? `<Amount0>${invoice.amount0}</Amount0>` : ""}
			${invoice.amount5 !== undefined ? `<Amount5>${invoice.amount5}</Amount5>` : ""}
			${invoice.amount8 !== undefined ? `<Amount8>${invoice.amount8}</Amount8>` : ""}
			${
				invoice.amount10 !== undefined
					? `<Amount10>${invoice.amount10}</Amount10>`
					: ""
			}
			<AmountInWords>${invoice.amountInWords}</AmountInWords>
		</Invoice>
	</Inv>
</Invoices>`;
};

export const buildMultipleInvoicesXml = (invoices) => {
	const invElements = invoices
		.map((invoice) => {
			const productsXml = invoice.products
				.map((product) => buildProductXml(product))
				.join("");

			return `
	<Inv>
		<Invoice>
			<Ikey>${invoice.ikey}</Ikey>
			${invoice.cusCode ? `<CusCode>${invoice.cusCode}</CusCode>` : ""}
			${invoice.buyer ? `<Buyer>${invoice.buyer}</Buyer>` : ""}
			<CusName>${invoice.cusName}</CusName>
			${invoice.email ? `<Email>${invoice.email}</Email>` : ""}
			${invoice.emailCC ? `<EmailCC>${invoice.emailCC}</EmailCC>` : ""}
			${invoice.cusAddress ? `<CusAddress>${invoice.cusAddress}</CusAddress>` : ""}
			${
				invoice.cusBankName
					? `<CusBankName>${invoice.cusBankName}</CusBankName>`
					: ""
			}
			${invoice.cusBankNo ? `<CusBankNo>${invoice.cusBankNo}</CusBankNo>` : ""}
			${invoice.cusPhone ? `<CusPhone>${invoice.cusPhone}</CusPhone>` : ""}
			${invoice.cusTaxCode ? `<CusTaxCode>${invoice.cusTaxCode}</CusTaxCode>` : ""}
			<PaymentMethod>${invoice.paymentMethod}</PaymentMethod>
			${
				invoice.arisingDate
					? `<ArisingDate>${invoice.arisingDate}</ArisingDate>`
					: ""
			}
			${
				invoice.exchangeRate
					? `<ExchangeRate>${invoice.exchangeRate}</ExchangeRate>`
					: ""
			}
			${
				invoice.currencyUnit
					? `<CurrencyUnit>${invoice.currencyUnit}</CurrencyUnit>`
					: "<CurrencyUnit>VND</CurrencyUnit>"
			}
			${invoice.extra ? `<Extra>${JSON.stringify(invoice.extra)}</Extra>` : ""}
			<Products>${productsXml}</Products>
			<Total>${invoice.total}</Total>
			${invoice.vatRate ? `<VATRate>${invoice.vatRate}</VATRate>` : ""}
			${
				invoice.vatRateOther
					? `<VATRateOther>${invoice.vatRateOther}</VATRateOther>`
					: ""
			}
			<VATAmount>${invoice.vatAmount}</VATAmount>
			<Amount>${invoice.amount}</Amount>
			<AmountInWords>${invoice.amountInWords}</AmountInWords>
		</Invoice>
	</Inv>`;
		})
		.join("");

	return `<Invoices>${invElements}
</Invoices>`;
};

export const numberToVietnameseWords = (amount) => {
	return `${amount.toLocaleString("vi-VN")} đồng chẵn`;
};
