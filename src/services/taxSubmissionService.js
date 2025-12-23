import TaxSubmission from "../models/TaxSubmission.js";

const createTaxSubmission = async (data, businessOwnerId) => {
	const item = new TaxSubmission({ ...data, businessOwnerId });
	await item.save();
	return item;
};

const getTaxSubmissionById = async (id, businessOwnerId) => {
	const item = await TaxSubmission.findOne({ _id: id, businessOwnerId });
	if (!item)
		throw new ApiError(StatusCodes.NOT_FOUND, "Tax submission not found");
	return item;
};

const listTaxSubmissions = async (
	businessOwnerId,
	filter = {},
	options = {}
) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = -1,
	} = options;
	const skip = (page - 1) * limit;
	const query = TaxSubmission.find({ businessOwnerId, ...filter })
		.sort({ [sortBy]: sortOrder })
		.skip(skip)
		.limit(limit);
	const [results, total] = await Promise.all([
		query.exec(),
		TaxSubmission.countDocuments({ businessOwnerId, ...filter }),
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

const updateTaxSubmission = async (id, data, businessOwnerId) => {
	const item = await TaxSubmission.findOneAndUpdate(
		{ _id: id, businessOwnerId },
		data,
		{ new: true }
	);
	if (!item)
		throw new ApiError(StatusCodes.NOT_FOUND, "Tax submission not found");
	return item;
};

const deleteTaxSubmission = async (id, businessOwnerId) => {
	const item = await TaxSubmission.findOneAndDelete({
		_id: id,
		businessOwnerId,
	});
	if (!item)
		throw new ApiError(StatusCodes.NOT_FOUND, "Tax submission not found");
	return item;
};

export {
	createTaxSubmission,
	listTaxSubmissions,
	getTaxSubmissionById,
	updateTaxSubmission,
	deleteTaxSubmission,
};
