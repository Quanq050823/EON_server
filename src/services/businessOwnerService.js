"use strict";

import BusinessOwner from "../models/BusinessOwner.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";

const createBusinessOwner = async (userId, data) => {
	// Kiểm tra đã có profile chưa
	const existed = await BusinessOwner.findOne({ userId });
	if (existed)
		throw new ApiError(StatusCodes.BAD_REQUEST, "Profile already exists");
	const businessOwner = new BusinessOwner({ userId, ...data });
	await businessOwner.save();
	return businessOwner;
};

const getBusinessOwnerByUserId = async (userId) => {
	const profile = await BusinessOwner.findOne({ userId });
	if (!profile) throw new ApiError(StatusCodes.NOT_FOUND, "Profile not found");
	return profile;
};

const updateBusinessOwner = async (userId, data) => {
	const updated = await BusinessOwner.findOneAndUpdate(
		{ userId },
		{ $set: data },
		{ new: true, runValidators: true }
	);
	if (!updated) throw new ApiError(StatusCodes.NOT_FOUND, "Profile not found");
	return updated;
};

const deleteBusinessOwner = async (userId) => {
	const deleted = await BusinessOwner.findOneAndDelete({ userId });
	if (!deleted) throw new ApiError(StatusCodes.NOT_FOUND, "Profile not found");
	return { message: "Profile deleted" };
};

const listBusinessOwners = async (filter = {}, options = {}) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = -1,
	} = options;
	const skip = (page - 1) * limit;
	const query = BusinessOwner.find(filter)
		.sort({ [sortBy]: sortOrder })
		.skip(skip)
		.limit(limit);
	const [results, total] = await Promise.all([
		query.exec(),
		BusinessOwner.countDocuments(filter),
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

const calculateTaxDeadline = (filingFrequency) => {
	const today = new Date();
	today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
	const currentYear = today.getFullYear();
	const currentMonth = today.getMonth() + 1;
	const currentDay = today.getDate();

	let period = "";
	let deadlineDate;
	let periodStartDate;
	let isInFilingPeriod = false;

	if (filingFrequency === 2) {
		// Nộp theo tháng: Tờ khai tháng N được nộp từ 1-20 tháng N+1

		// Check nếu đang trong kỳ nộp (ngày 1-20 của tháng hiện tại)
		if (currentDay >= 1 && currentDay <= 20) {
			// Đang trong kỳ nộp tháng trước
			const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
			const yearForPrevMonth =
				currentMonth === 1 ? currentYear - 1 : currentYear;
			period = `tháng ${prevMonth}`;
			deadlineDate = new Date(currentYear, currentMonth - 1, 20);
			periodStartDate = new Date(currentYear, currentMonth - 1, 1);
			isInFilingPeriod = true;
		} else {
			// Chưa đến kỳ nộp - hiển thị kỳ tiếp theo
			period = `tháng ${currentMonth}`;
			const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
			const yearForDeadline =
				currentMonth === 12 ? currentYear + 1 : currentYear;
			periodStartDate = new Date(yearForDeadline, nextMonth - 1, 1);
			deadlineDate = new Date(yearForDeadline, nextMonth - 1, 20);
			isInFilingPeriod = false;
		}
	} else if (filingFrequency === 1) {
		// Nộp theo quý: Tờ khai quý Q được nộp từ 1-30 tháng đầu quý Q+1
		const currentQuarter = Math.ceil(currentMonth / 3);
		const firstMonthOfCurrentQuarter = (currentQuarter - 1) * 3 + 1;

		// Check nếu đang trong kỳ nộp (tháng đầu quý và ngày 1-30)
		if (
			currentMonth === firstMonthOfCurrentQuarter &&
			currentDay >= 1 &&
			currentDay <= 30
		) {
			// Đang trong kỳ nộp quý trước
			const prevQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
			const yearForPrevQuarter =
				currentQuarter === 1 ? currentYear - 1 : currentYear;
			period = `quý ${prevQuarter}`;
			deadlineDate = new Date(currentYear, currentMonth - 1, 30);
			periodStartDate = new Date(currentYear, currentMonth - 1, 1);
			isInFilingPeriod = true;
		} else {
			// Chưa đến kỳ nộp - hiển thị kỳ tiếp theo
			period = `quý ${currentQuarter}`;
			const nextQuarter = currentQuarter === 4 ? 1 : currentQuarter + 1;
			const yearForDeadline =
				currentQuarter === 4 ? currentYear + 1 : currentYear;
			const firstMonthOfNextQuarter = (nextQuarter - 1) * 3 + 1;
			periodStartDate = new Date(
				yearForDeadline,
				firstMonthOfNextQuarter - 1,
				1
			);
			deadlineDate = new Date(yearForDeadline, firstMonthOfNextQuarter - 1, 30);
			isInFilingPeriod = false;
		}
	} else {
		// Default fallback
		if (currentDay >= 1 && currentDay <= 20) {
			const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
			period = `tháng ${prevMonth}`;
			deadlineDate = new Date(currentYear, currentMonth - 1, 20);
			periodStartDate = new Date(currentYear, currentMonth - 1, 1);
			isInFilingPeriod = true;
		} else {
			period = `tháng ${currentMonth}`;
			const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
			const yearForDeadline =
				currentMonth === 12 ? currentYear + 1 : currentYear;
			periodStartDate = new Date(yearForDeadline, nextMonth - 1, 1);
			deadlineDate = new Date(yearForDeadline, nextMonth - 1, 20);
			isInFilingPeriod = false;
		}
	}

	const timeDiff = deadlineDate.getTime() - today.getTime();
	const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

	const formattedDeadline = `${String(deadlineDate.getDate()).padStart(
		2,
		"0"
	)}.${String(deadlineDate.getMonth() + 1).padStart(
		2,
		"0"
	)}.${deadlineDate.getFullYear()}`;

	return {
		period,
		deadline: formattedDeadline,
		daysRemaining,
		isInFilingPeriod,
		deadlineDate: deadlineDate.toISOString(),
		periodStartDate: periodStartDate.toISOString(),
	};
};

const getTaxDeadlineInfo = async (userId) => {
	const businessOwner = await getBusinessOwnerByUserId(userId);
	const filingFrequency = businessOwner.tax_filing_frequency || 2; // Default là tháng

	const deadlineInfo = calculateTaxDeadline(filingFrequency);

	return {
		...deadlineInfo,
		filingFrequency,
		filingType: filingFrequency === 1 ? "quarterly" : "monthly",
	};
};

export {
	createBusinessOwner,
	getBusinessOwnerByUserId,
	updateBusinessOwner,
	deleteBusinessOwner,
	listBusinessOwners,
	getTaxDeadlineInfo,
};
