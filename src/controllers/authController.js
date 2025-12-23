"use strict";

import { StatusCodes } from "http-status-codes";
import * as authService from "../services/authService.js";
import config from "../config/environment.js";

const createUser = async (req, res, next) => {
	try {
		let result = await authService.registerService(req.body);
		// Set cookies giống như login
		res.cookie("accessToken", result.accessToken, {
			httpOnly: false,
			maxAge: 24 * 60 * 60 * 1000, // 1 ngày
			sameSite: config.env === "production" ? "None" : undefined,
			secure: config.env === "production",
		});
		res.cookie("refreshToken", result.refreshToken, {
			httpOnly: false,
			maxAge: 15 * 24 * 60 * 60 * 1000, // 15 ngày
			sameSite: config.env === "production" ? "None" : undefined,
			secure: config.env === "production",
		});
		res.status(StatusCodes.CREATED).send(result);
	} catch (err) {
		next(err);
	}
};

const verifyUser = async (req, res, next) => {
	try {
		let result = await authService.verifyEmailService(req.query);
		res.redirect(`${config.feUrl}/authentication/confirm-email/`);
	} catch (err) {
		next(err);
	}
};

const login = async (req, res, next) => {
	try {
		const existingTokens = {
			accessToken: req.cookies?.accessToken,
			refreshToken: req.cookies?.refreshToken,
		};

		const loginStatus = await authService.isLoggedIn(existingTokens);

		if (loginStatus.isAuthenticated) {
			return res.status(StatusCodes.OK).send({
				message: "User is already logged in",
				alreadyLoggedIn: true,
				accessToken: loginStatus.accessToken,
				refreshToken: loginStatus.refreshToken,
			});
		}

		let result = await authService.loginService(req.body, false);

		res.cookie("accessToken", result.accessToken, {
			httpOnly: false,
			maxAge: 24 * 60 * 60 * 1000, //15 minutes
			sameSite: config.env === "production" ? "None" : undefined,
			secure: config.env === "production",
		});
		res.cookie("refreshToken", result.refreshToken, {
			httpOnly: false,
			maxAge: 15 * 24 * 60 * 60 * 1000, //15 minutes
			sameSite: config.env === "production" ? "None" : undefined,
			secure: config.env === "production",
		});

		res.status(StatusCodes.OK).send(result);
	} catch (err) {
		next(err);
	}
};

const loginWithGoogle = async (req, res, next) => {
	try {
		let result = await authService.loginService(req?.user, true);
		res.cookie("accessToken", result.accessToken, {
			httpOnly: false,
			maxAge: 15 * 60 * 1000, //15 minutes
			sameSite: config.env === "production" ? "None" : undefined,
			secure: config.env === "production",
		});
		res.cookie("refreshToken", result.refreshToken, {
			httpOnly: false,
			maxAge: 15 * 24 * 60 * 60 * 1000, //15 minutes
			sameSite: config.env === "production" ? "None" : undefined,
			secure: config.env === "production",
		});

		// res.status(StatusCodes.OK).send(result);
		res.redirect(`${config.feRedirectUri}`);
	} catch (err) {
		next(err);
	}
};

const isAuthenticated = async (req, res, next) => {
	try {
		let result = await authService.isLoggedIn(req.cookies);
		res.status(StatusCodes.OK).send(result);
	} catch (err) {
		next(err);
	}
};

const refreshToken = async (req, res, next) => {
	try {
		let result = await authService.refreshTokenService(req.body);
		if (result?.error) {
			res.clearCookie("refreshToken", {
				httpOnly: false,
				sameSite: config.env === "production" ? "None" : undefined,
				secure: config.env === "production",
			});
			res.clearCookie("accessToken", {
				httpOnly: false,
				sameSite: config.env === "production" ? "None" : undefined,
				secure: config.env === "production",
			});
			res
				.status(StatusCodes.BAD_REQUEST)
				.json({
					error: "invalid refresh token",
					message: "Invalid refresh token! Please login again",
				})
				.send();
		} else {
			res.cookie("accessToken", result.accessToken, {
				httpOnly: false,
				maxAge: 24 * 60 * 60 * 1000, //15 minutes
				sameSite: config.env === "production" ? "None" : undefined,
				secure: config.env === "production",
			});
			res.cookie("refreshToken", result.refreshToken, {
				httpOnly: false,
				maxAge: 15 * 24 * 60 * 60 * 1000, //15 minutes
				sameSite: config.env === "production" ? "None" : undefined,
				secure: config.env === "production",
			});
			res.status(StatusCodes.OK).json(result).send();
		}
	} catch (err) {
		next(err);
	}
};

const logout = async (req, res, next) => {
	try {
		const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

		if (!refreshToken) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: "No refresh token provided",
			});
		}

		let result = await authService.logoutService({ refreshToken });

		// Clear cookies
		res.clearCookie("accessToken");
		res.clearCookie("refreshToken");

		res.status(StatusCodes.OK).send(result);
	} catch (err) {
		next(err);
	}
};

const forgotPassword = async (req, res, next) => {
	try {
		let result = await authService.forgotPasswordService(req.body, req.body);
		console.log(result);
		res.status(StatusCodes.OK).send(result);
	} catch (err) {
		next(err);
	}
};

const verifyOtp = async (req, res, next) => {
	try {
		let result = await authService.verifyOtp(req.query, req.body);
		res.status(StatusCodes.OK).send(result);
	} catch (err) {
		next(err);
	}
};

const changePasswordWithOtp = async (req, res, next) => {
	try {
		let result = await authService.changePasswordWithOtp(req.query, req.body);
		res.status(StatusCodes.OK).send(result);
	} catch (err) {
		next(err);
	}
};

export {
	createUser,
	login,
	loginWithGoogle,
	refreshToken,
	logout,
	verifyUser,
	forgotPassword,
	verifyOtp,
	changePasswordWithOtp,
	isAuthenticated,
};
