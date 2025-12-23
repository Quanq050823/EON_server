"use strict";

import mongoose from "mongoose";

const ExpenseVoucherSchema = new mongoose.Schema({
  businessOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BusinessOwner",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  category: {
    type: String,
    enum: ['1','2','3','4','5','6','7','8'],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
}, { timestamps: true });

const ExpenseVoucher = mongoose.model("ExpenseVoucher", ExpenseVoucherSchema);
export default ExpenseVoucher;
