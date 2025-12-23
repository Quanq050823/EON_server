import mongoose from "mongoose";

const TaxSubmissionSchema = new mongoose.Schema({
	businessOwnerId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "BusinessOwner",
		required: true,
	},
	code: { type: String, required: true, unique: true },
	date: { type: Date, required: true },
	description: { type: String },
	amount: { type: Number, required: true },
	note: { type: String },
});

export default mongoose.model("TaxSubmission", TaxSubmissionSchema);
