import Employee from "../models/Employee.js";

const createEmployee = async (data, businessOwnerId) => {
	const item = new Employee({ ...data, businessOwnerId });
	await item.save();
	return item;
};

const getEmployeeById = async (id, businessOwnerId) => {
	const item = await Employee.findOne({ _id: id, businessOwnerId });
	if (!item) throw new Error("Employee not found");
	return item;
};

const listEmployees = async (businessOwnerId, filter = {}, options = {}) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "hire_date",
		sortOrder = -1,
	} = options;
	const skip = (page - 1) * limit;
	const query = Employee.find({ businessOwnerId, ...filter })
		.sort({ [sortBy]: sortOrder })
		.skip(skip)
		.limit(limit);
	const [results, total] = await Promise.all([
		query.exec(),
		Employee.countDocuments({ businessOwnerId, ...filter }),
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

const updateEmployee = async (id, data, businessOwnerId) => {
	const item = await Employee.findOneAndUpdate(
		{ _id: id, businessOwnerId },
		data,
		{ new: true }
	);
	if (!item) throw new Error("Employee not found");
	return item;
};

const deleteEmployee = async (id, businessOwnerId) => {
	const item = await Employee.findOneAndDelete({
		_id: id,
		businessOwnerId,
	});
	if (!item) throw new Error("Employee not found");
	return item;
};

export {
	createEmployee,
	listEmployees,
	getEmployeeById,
	updateEmployee,
	deleteEmployee,
};
