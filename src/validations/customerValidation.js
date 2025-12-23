"use strict";

import Joi from "joi";

const createCustomerValidation = Joi.object({
	name: Joi.string().required().trim().max(255),
	code: Joi.string().required().trim().max(50),
	email: Joi.string().email().allow("").optional(),
	phoneNumber: Joi.string().required().trim().max(20),
	address: Joi.object({
		street: Joi.string().allow("").optional(),
		ward: Joi.string().allow("").optional(),
		district: Joi.string().allow("").optional(),
		city: Joi.string().allow("").optional(),
		zipCode: Joi.string().allow("").optional(),
	}).optional(),
	customerType: Joi.string()
		.valid("individual", "business")
		.default("individual"),
	taxCode: Joi.string().allow("").optional().max(50),
	companyName: Joi.string().allow("").optional().max(255),
	contactPerson: Joi.string().allow("").optional().max(255),
	dateOfBirth: Joi.date().optional(),
	gender: Joi.string().valid("male", "female", "other").optional(),
	notes: Joi.string().allow("").optional().max(1000),
	creditLimit: Joi.number().min(0).default(0),
	paymentTerms: Joi.string().allow("").optional().max(100),
	status: Joi.string()
		.valid("active", "inactive", "blacklisted")
		.default("active"),
	tags: Joi.array().items(Joi.string().max(50)).optional(),
	customFields: Joi.array()
		.items(
			Joi.object({
				key: Joi.string().required().max(100),
				value: Joi.string().required().max(500),
			})
		)
		.optional(),
});

const updateCustomerValidation = Joi.object({
	name: Joi.string().trim().max(255),
	code: Joi.string().trim().max(50),
	email: Joi.string().email().allow(""),
	phoneNumber: Joi.string().trim().max(20),
	address: Joi.object({
		street: Joi.string().allow(""),
		ward: Joi.string().allow(""),
		district: Joi.string().allow(""),
		city: Joi.string().allow(""),
		zipCode: Joi.string().allow(""),
	}),
	customerType: Joi.string().valid("individual", "business"),
	taxCode: Joi.string().allow("").max(50),
	companyName: Joi.string().allow("").max(255),
	contactPerson: Joi.string().allow("").max(255),
	dateOfBirth: Joi.date(),
	gender: Joi.string().valid("male", "female", "other"),
	notes: Joi.string().allow("").max(1000),
	creditLimit: Joi.number().min(0),
	paymentTerms: Joi.string().allow("").max(100),
	status: Joi.string().valid("active", "inactive", "blacklisted"),
	tags: Joi.array().items(Joi.string().max(50)),
	customFields: Joi.array().items(
		Joi.object({
			key: Joi.string().required().max(100),
			value: Joi.string().required().max(500),
		})
	),
	lastContactDate: Joi.date(),
	totalOrders: Joi.number().min(0),
	totalSpent: Joi.number().min(0),
});

const customerQueryValidation = Joi.object({
	page: Joi.number().integer().min(1).default(1),
	limit: Joi.number().integer().min(1).max(100).default(10),
	sortBy: Joi.string()
		.valid("name", "code", "createdAt", "totalSpent", "totalOrders")
		.default("createdAt"),
	sortOrder: Joi.number().valid(1, -1).default(-1),
	status: Joi.string().valid("active", "inactive", "blacklisted"),
	customerType: Joi.string().valid("individual", "business"),
	search: Joi.string().max(255),
	tags: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
});

export {
	createCustomerValidation,
	updateCustomerValidation,
	customerQueryValidation,
};
