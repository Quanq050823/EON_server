import mongoose from "mongoose";

const PayslipSchema = new mongoose.Schema({
	businessOwnerId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		unique: true,
	},
	employee_id: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		unique: true,
	},
	total_amount: { type: Number, required: true },
	paid_amount: { type: Number, required: true },
	remaining_amount: { type: Number, required: true },
	payment_month: { type: Number, required: true },
	CreatedDate: { type: Date, required: true },
	description: { type: String },
	category: { type: Number, required: true },
	note: { type: String },
});

export default mongoose.model("Payslip", PayslipSchema);
