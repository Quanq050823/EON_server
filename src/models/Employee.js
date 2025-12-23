import mongoose from "mongoose";

const EmployeeSchema = new mongoose.Schema({
	businessOwnerId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "BusinessOwner",
		required: true,
	},
	code: { type: String, required: true, unique: true },
	fullname: { type: String, required: true },
	email: { type: String },
	phone: { type: String },
	address: { type: String },
	date_of_birth: { type: Date },
	position: { type: String },
	hire_date: { type: Date },
	status: { type: String, enum: ["active", "inactive"], default: "active" },
	base_salary: { type: Number },
	bank_account: {
		bank_name: { type: String },
		account_number: { type: String },
		account_holder: { type: String },
	},
	salary_info: {
		salary_type: {
			type: String,
			enum: ["monthly", "bi-weekly"],
			default: "monthly",
		},
	},
});

export default mongoose.model("Employee", EmployeeSchema);
