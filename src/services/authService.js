"use strict";

import User from "./../models/User.js";
import RefreshToken from "./../models/RefreshToken.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";
import config from "../config/environment.js";
import * as jwtUtil from "../utils/jwtUtil.js";
import { sendMail } from "../utils/mailer.js";
import getObjectId from "../utils/objectId.js";

const hashRefreshToken = (refreshToken) => {
	return crypto.createHash("sha256").update(refreshToken).digest("hex");
};

const getRefreshTokenExpiresAt = async (refreshToken) => {
	const tokenDetails = await jwtUtil.verifyRefreshToken(refreshToken);

	if (tokenDetails?.exp) {
		return new Date(tokenDetails.exp * 1000);
	}

	return new Date(Date.now() + Number(config.refreshTokenExp) * 1000);
};

const createRefreshTokenSession = async (user, refreshToken, metadata = {}) => {
	await RefreshToken.create({
		userId: user._id,
		tokenHash: hashRefreshToken(refreshToken),
		expiresAt: await getRefreshTokenExpiresAt(refreshToken),
		userAgent: metadata.userAgent,
		ip: metadata.ip,
	});
};

const registerService = async (data, metadata = {}) => {
	try {
		let user = await User.findOne({ email: data.email });
		const salt = await bcrypt.genSalt(Number(config.salt));
		const hashedPassword = await bcrypt.hash(data.password, salt);
		// Validate userType dạng số
		const allowedTypes = [1, 2, 3];
		if (!allowedTypes.includes(data.userType)) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid user type");
		}
		if (user) {
			if (user?.isVerified)
				throw new ApiError(StatusCodes.BAD_REQUEST, "User already existed");
			else {
				user = await User.findOneAndUpdate(
					{ email: data.email },
					{
						...data,
						password: hashedPassword,
						userType: data.userType,
					},
					{ new: true, upsert: true }
				);
			}
		} else {
			user = await new User({
				...data,
				password: hashedPassword,
				userType: data.userType,
			}).save();
		}

		const accessToken = await jwtUtil.generateAccessToken(user);
		const refreshToken = await jwtUtil.generateRefreshToken(user);

		await createRefreshTokenSession(user, refreshToken, metadata);

		await jwtUtil.generateAccessToken(user).then((token) => {
			let link = `${config.beURL}/api/auth/verify-email?token=${token}`;
			let html = `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Email Verification</title>
            </head>
            <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; text-align: center;">
                    <img style="max-width: 200px;" src="https://firebasestorage.googleapis.com/v0/b/food-delivery-app-5613d.appspot.com/o/sine%2FSine.jpg?alt=media&token=74f149e7-d6a6-4625-8dd2-d3a6c97fd13d" alt="Newsletter Image">;
                    <h2 style="color: #333;">Verify Your Email</h2>
                    <p style="color: #555;">Hi ${user.name}. Thank you for signing up! Please click the button below to verify your email address:</p>
                    <p style="color: #555;">This link will be expired after 15 minutes.</p>
                    <a href="${link}" style="background-color: #77A2E6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
                    <p style="color: #999; margin-top: 20px;">If you did not request this, you can ignore this email.</p>
                </div>
            </body>
            </html>`;
			sendMail(user.email, "Verify your Email", html);
		});

		return { message: "Please verify your email", accessToken, refreshToken };
	} catch (err) {
		throw err;
	}
};

const loginService = async (data, isGoogle, metadata = {}) => {
	let user;
	if (isGoogle) {
		user = data;
	} else {
		user = await User.findOne({ email: data.email });

		if (!user) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "User not existed");
		}
		if (user.isDeleted || !user?.isVerified) {
			throw new ApiError(
				StatusCodes.UNAUTHORIZED,
				`User ${user.name} has been disable`
			);
		}

		if (
			!user?.password ||
			!(await bcrypt.compare(data.password, user?.password))
		) {
			throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid credentials");
		}
	}

	const accessToken = await jwtUtil.generateAccessToken(user);
	const refreshToken = await jwtUtil.generateRefreshToken(user);

	await createRefreshTokenSession(user, refreshToken, metadata);

	return {
		accessToken: accessToken,
		refreshToken: refreshToken,
		messages: "Login successful",
	};
};

const isLoggedIn = async (data) => {
	try {
		if (!data?.accessToken && !data?.refreshToken) {
			return { isAuthenticated: false };
		}

		if (data?.accessToken && !data?.refreshToken) {
			await jwtUtil.verifyAccessToken(data.accessToken);
		}

		if (data?.refreshToken) {
			const tokenDetails = await jwtUtil.verifyRefreshToken(data.refreshToken);
			if (!tokenDetails) return { isAuthenticated: false };

			const session = await RefreshToken.findOne({
				tokenHash: hashRefreshToken(data.refreshToken),
				revokedAt: null,
				expiresAt: { $gt: new Date() },
			});

			if (!session) return { isAuthenticated: false };
		}

		return {
			isAuthenticated: true,
			accessToken: data?.accessToken,
			refreshToken: data?.refreshToken,
		};
	} catch (error) {
		return false;
	}
};

const refreshTokenService = async (data) => {
	let refreshToken = data?.refreshToken;

	if (!refreshToken) {
		throw new ApiError(StatusCodes.BAD_REQUEST, "No refresh token provided");
	}

	const tokenHash = hashRefreshToken(refreshToken);
	const session = await RefreshToken.findOne({ tokenHash });

	if (!session) {
		throw new ApiError(
			StatusCodes.BAD_REQUEST,
			"Invalid refresh token"
		);
	}

	const tokenDetails = await jwtUtil.verifyRefreshToken(refreshToken);
	const now = new Date();

	if (!tokenDetails || session.revokedAt || session.expiresAt <= now) {
		await RefreshToken.updateOne(
			{ _id: session._id, revokedAt: null },
			{ $set: { revokedAt: now } }
		);
		return { error: "Invalid refresh token" };
	}

	let foundUser = await User.findById(session.userId);

	if (!foundUser || foundUser.isDeleted || !foundUser.isVerified) {
		await RefreshToken.updateOne(
			{ _id: session._id, revokedAt: null },
			{ $set: { revokedAt: now } }
		);
		return { error: "Invalid refresh token" };
	}

	const accessToken = await jwtUtil.generateAccessToken(foundUser);
	const newRefreshToken = await jwtUtil.generateRefreshToken(foundUser);
	const newTokenHash = hashRefreshToken(newRefreshToken);

	const rotatedSession = await RefreshToken.findOneAndUpdate(
		{ _id: session._id, tokenHash, revokedAt: null },
		{
			$set: {
				tokenHash: newTokenHash,
				expiresAt: await getRefreshTokenExpiresAt(newRefreshToken),
				lastUsedAt: now,
			},
		},
		{ new: true }
	);

	if (!rotatedSession) {
		throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid refresh token");
	}

	return {
		refreshToken: newRefreshToken,
		accessToken: accessToken,
		message: "Refresh successful",
	};
};

const logoutService = async (data) => {
	try {
		let refreshToken = data.refreshToken;

		let revokedSession = await RefreshToken.findOneAndUpdate(
			{
				tokenHash: hashRefreshToken(refreshToken),
				revokedAt: null,
			},
			{ $set: { revokedAt: new Date() } },
			{ new: true }
		);

		if (!revokedSession) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid refresh token");
		}

		return { message: "Logout successfully" };
	} catch (error) {
		throw error;
	}
};

const verifyEmailService = async (data) => {
	try {
		let tokenDetails = await jwtUtil.verifyAccessToken(data?.token);
		let objId = getObjectId(tokenDetails.userId);
		let user = await User.findOneAndUpdate(
			{ _id: objId },
			{ isVerified: true },
			{ new: true }
		);
		if (user.isVerified) {
			return { message: "Email has been verified successfully" };
		} else {
			return { message: "Email verification failed" };
		}
	} catch (error) {
		throw error;
	}
};

const forgotPasswordService = async (query, data) => {
	try {
		let user = await User.findOne({ email: query?.email });
		if (!user) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "User not existed");
		}
		if (user.isDeleted || !user.isVerified) {
			throw new ApiError(
				StatusCodes.UNAUTHORIZED,
				`User ${user.name} has been disable`
			);
		}

		let otp = Math.floor(100000 + Math.random() * 900000).toString();

		const salt = await bcrypt.genSalt(Number(config.salt));
		const hashedOtp = await bcrypt.hash(otp, salt);

		user.otp.code = hashedOtp;
		user.otp.expires = new Date(new Date().getTime() + 10 * 60 * 1000); // 5 minutes
		await user.save();

		// send email
		let html = `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password reset request</title>
            </head>
            <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; text-align: center;">
                    <img style="max-width: 200px;" src="https://firebasestorage.googleapis.com/v0/b/food-delivery-app-5613d.appspot.com/o/sine%2FSine.jpg?alt=media&token=74f149e7-d6a6-4625-8dd2-d3a6c97fd13d" alt="Newsletter Image">;
                    <h2 style="color: #333;">Password reset request</h2>
                    <p style="color: #555;">Hi ${user.name} We received a request to reset your password. Please click on this link to change your password.</p>
                    <p style="color: #555;">This OTP will be expired after 10 minutes.</p>
                    <a style="font-size: 24px; font-weight: bold; color: #4CAF50;">${otp}</a>
                    <p style="color: #999; margin-top: 20px;">If you did not request this, you can ignore this email.</p>
                </div>
            </body>
            </html>`;
		sendMail(user.email, "Forgot password request", html);

		return otp
			? { message: "Please check your email." }
			: { message: "Error failed to reset password." };
	} catch (error) {
		throw error;
	}
};

const verifyOtp = async (param, data) => {
	try {
		let user = await User.findOne({ email: param?.email });
		if (!user) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "User not existed");
		}
		if (user.isDeleted || !user.isVerified) {
			throw new ApiError(
				StatusCodes.UNAUTHORIZED,
				`User ${user.name} has been disable`
			);
		}
		if (user.otp.expires < new Date()) {
			throw new ApiError(
				StatusCodes.REQUEST_TIMEOUT,
				`The OTP has been expired`
			);
		}
		if (await bcrypt.compare(data?.otp, user.otp.code))
			return { message: true };
		else throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid OTP");
	} catch (error) {
		throw error;
	}
};

const changePasswordWithOtp = async (query, data) => {
	try {
		let otpVerify = await verifyOtp(query, query);
		let user = await User.findOne({ email: query?.email });

		const salt = await bcrypt.genSalt(Number(config.salt));
		const hashedPassword = await bcrypt.hash(data?.password, salt);

		user.password = hashedPassword;
		user.otp.expires = new Date();
		await user.save();
		await RefreshToken.updateMany(
			{ userId: user._id, revokedAt: null },
			{ $set: { revokedAt: new Date() } }
		);
		return { message: "Password has been changed successfully" };
	} catch (error) {
		throw error;
	}
};

export {
	registerService,
	loginService,
	refreshTokenService,
	logoutService,
	verifyEmailService,
	forgotPasswordService,
	verifyOtp,
	changePasswordWithOtp,
	isLoggedIn,
};
