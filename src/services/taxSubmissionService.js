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

const getTaxSummaryByPeriod = async (
	businessOwnerId,
	periodType = "month",
	year,
	period
) => {
	const currentYear = year || new Date().getFullYear();
	const matchQuery = { businessOwnerId };
	if (year) {
		matchQuery.date = {
			$gte: new Date(`${year}-01-01`),
			$lte: new Date(`${year}-12-31T23:59:59`),
		};
	}

	const pipeline = [
		{ $match: matchQuery },
		{
			$addFields: {
				year: { $year: "$date" },
				month: { $month: "$date" },
				quarter: {
					$ceil: { $divide: [{ $month: "$date" }, 3] },
				},
			},
		},
	];

	if (period) {
		if (periodType === "month") {
			pipeline.push({ $match: { month: period } });
		} else if (periodType === "quarter") {
			pipeline.push({ $match: { quarter: period } });
		}
	}

	if (periodType === "month") {
		pipeline.push({
			$group: {
				_id: { year: "$year", month: "$month" },
				totalAmount: { $sum: "$amount" },
				count: { $sum: 1 },
				submissions: { $push: "$$ROOT" },
			},
		});
		pipeline.push({
			$sort: { "_id.year": -1, "_id.month": -1 },
		});
	} else if (periodType === "quarter") {
		pipeline.push({
			$group: {
				_id: { year: "$year", quarter: "$quarter" },
				totalAmount: { $sum: "$amount" },
				count: { $sum: 1 },
				submissions: { $push: "$$ROOT" },
			},
		});
		pipeline.push({
			$sort: { "_id.year": -1, "_id.quarter": -1 },
		});
	} else {
		pipeline.push({
			$group: {
				_id: null,
				totalAmount: { $sum: "$amount" },
				count: { $sum: 1 },
				submissions: { $push: "$$ROOT" },
			},
		});
	}

	const results = await TaxSubmission.aggregate(pipeline);

	return {
		periodType,
		year: currentYear,
		period,
		data: results,
	};
};

export {
	createTaxSubmission,
	listTaxSubmissions,
	getTaxSubmissionById,
	updateTaxSubmission,
	deleteTaxSubmission,
	getTaxSummaryByPeriod,
};
