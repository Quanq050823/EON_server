"use strict";

import * as expenseVoucherService from "../services/expenseVoucherService.js";
import { StatusCodes } from "http-status-codes";
import BusinessOwner from "../models/BusinessOwner.js";

const create = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const owner = await BusinessOwner.findOne({ userId });
    if (!owner) return res.status(404).json({ message: "BusinessOwner not found" });
    const voucher = await expenseVoucherService.createExpenseVoucher(owner._id, req.body);
    res.status(StatusCodes.CREATED).json(voucher);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await expenseVoucherService.getExpenseVoucherById(id);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = req.body;
    const result = await expenseVoucherService.updateExpenseVoucher(id, data);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await expenseVoucherService.deleteExpenseVoucher(id);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const owner = await BusinessOwner.findOne({ userId });
    if (!owner) return res.status(404).json({ message: "BusinessOwner not found" });
    const { page, limit, sortBy, sortOrder, ...filter } = req.query;
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      sortBy: sortBy || "date",
      sortOrder: parseInt(sortOrder) || -1,
    };
    const result = await expenseVoucherService.listExpenseVouchers(owner._id, filter, options);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

export { create, getById, update, remove, list };
