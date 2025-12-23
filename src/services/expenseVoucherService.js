"use strict";

import ExpenseVoucher from "../models/ExpenseVoucher.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";

const createExpenseVoucher = async (businessOwnerId, data) => {
  const voucher = new ExpenseVoucher({ businessOwnerId, ...data });
  await voucher.save();
  return voucher;
};

const getExpenseVoucherById = async (id) => {
  const voucher = await ExpenseVoucher.findById(id);
  if (!voucher) throw new ApiError(StatusCodes.NOT_FOUND, "Expense voucher not found");
  return voucher;
};

const updateExpenseVoucher = async (id, data) => {
  const updated = await ExpenseVoucher.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!updated) throw new ApiError(StatusCodes.NOT_FOUND, "Expense voucher not found");
  return updated;
};

const deleteExpenseVoucher = async (id) => {
  const deleted = await ExpenseVoucher.findByIdAndDelete(id);
  if (!deleted) throw new ApiError(StatusCodes.NOT_FOUND, "Expense voucher not found");
  return { message: "Expense voucher deleted" };
};

const listExpenseVouchers = async (businessOwnerId, filter = {}, options = {}) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "date",
    sortOrder = -1,
  } = options;
  const skip = (page - 1) * limit;
  const query = ExpenseVoucher.find({ businessOwnerId, ...filter })
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);
  const [results, total] = await Promise.all([
    query.exec(),
    ExpenseVoucher.countDocuments({ businessOwnerId, ...filter }),
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

export {
  createExpenseVoucher,
  getExpenseVoucherById,
  updateExpenseVoucher,
  deleteExpenseVoucher,
  listExpenseVouchers,
};
