import Payslip from "../models/Payslip.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";

const createPayslip = async (data, businessOwnerId) => {
	const existed = await Payslip.findOne({
		employee_id: data.employee_id,
		payment_month: data.payment_month,
		businessOwnerId,
	});
	if (existed) {
		throw new ApiError(
			StatusCodes.BAD_REQUEST,
			"Payslip cho nhân viên này và tháng này đã tồn tại."
		);
	}
	const remaining_amount = data.total_amount - data.paid_amount;
	const item = new Payslip({
		...data,
		remaining_amount,
		businessOwnerId,
		CreatedDate: new Date(),
	});
	await item.save();
	return item;
};

const getPayslipById = async (id, businessOwnerId) => {
	const item = await Payslip.findOne({ _id: id, businessOwnerId });
	if (!item) throw new ApiError(StatusCodes.NOT_FOUND, "Payslip not found");
	return item;
};

const listPayslips = async (businessOwnerId, filter = {}, options = {}) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = -1,
	} = options;
	const skip = (page - 1) * limit;
	const query = Payslip.find({ businessOwnerId, ...filter })
		.sort({ [sortBy]: sortOrder })
		.skip(skip)
		.limit(limit);
	const [results, total] = await Promise.all([
		query.exec(),
		Payslip.countDocuments({ businessOwnerId, ...filter }),
	]);
	return {
		data: results,
		pagination: {
			page,
			limit,
			total,
			pages: Math.ceil(total / limit),
		},
	};
};

const updatePayslip = async (id, data, businessOwnerId) => {
	let updateData = { ...data };
	if (
		typeof data.total_amount === "number" &&
		typeof data.paid_amount === "number"
	) {
		updateData.remaining_amount = data.total_amount - data.paid_amount;
	}
	const item = await Payslip.findOneAndUpdate(
		{ _id: id, businessOwnerId },
		updateData,
		{ new: true }
	);
	if (!item) throw new ApiError(StatusCodes.NOT_FOUND, "Payslip not found");
	return item;
};

const deletePayslip = async (id, businessOwnerId) => {
	const item = await Payslip.findOneAndDelete({
		_id: id,
		businessOwnerId,
	});
	if (!item) throw new ApiError(StatusCodes.NOT_FOUND, "Payslip not found");
	return item;
};

export {
	createPayslip,
	listPayslips,
	getPayslipById,
	updatePayslip,
	deletePayslip,
};
