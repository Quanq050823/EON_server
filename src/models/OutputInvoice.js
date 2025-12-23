"use strict";

import mongoose from "mongoose";

const ttkhacSchema = new mongoose.Schema(
	{
		ttruong: String,
		kdlieu: String,
		dlieu: String,
	},
	{ _id: false }
);

const hdhhdvuSchema = new mongoose.Schema(
	{
		idhdon: String,
		id: String,
		dgia: String,
		dvtinh: String,
		sluong: String,
		stt: String,
		tchat: String,
		ten: String,
		thtien: String,
		gtgt: Number,
		tncn: Number,
		sxep: String,
		ttkhac: [ttkhacSchema],
	},
	{ _id: false }
);

const OutputInvoiceSchema = new mongoose.Schema(
	{
		nbmst: String,
		khmshdon: String,
		khhdon: String,
		shdon: String,
		cqt: String,
		cttkhac: [ttkhacSchema],
		hdon: String,
		hsgoc: String,
		hthdon: String,
		id: String,
		mhdon: String,
		mtdtchieu: String,
		nbten: String,
		nbdchi: String,
		nbttkhac: [ttkhacSchema],
		ncnhat: Date,
		nmdchi: String,
		nmmst: String,
		nmten: String,
		ntao: Date,
		ntnhan: Date,
		pban: String,
		ptgui: String,
		tchat: String,
		tdlap: Date,
		tgtttbchu: String,
		tgtttbso: String,
		thdon: String,
		thlap: String,
		tlhdon: String,
		tthai: String,
		ttcktmai: String,
		tttbao: String,
		ttttkhac: [ttkhacSchema],
		ttxly: String,
		tvandnkntt: String,
		ladhddt: String,
		bhphap: String,
		thtttoan: String,
		hdhhdvu: [hdhhdvuSchema],
		qrcode: String,
		totalGTGT: {
			type: Number,
			default: 0,
		},
		totalTNCN: {
			type: Number,
			default: 0,
		},
		businessOwnerId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "BusinessOwner",
			required: true,
		},
	},
	{ timestamps: true }
);

const OutputInvoice = mongoose.model("OutputInvoice", OutputInvoiceSchema);
export default OutputInvoice;
