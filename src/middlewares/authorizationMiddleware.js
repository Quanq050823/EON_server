import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";

const auth = (roles) => {
	return async (req, res, next) => {
		try {
			roles.push("user");
			if (req.user && req.user.role && req.user.role.includes(...roles)) {
				next();
			} else {
				res
					.status(403)
					.json({ error: true, message: "You are not authorized" });
			}
		} catch (err) {
			next(new ApiError(StatusCodes.UNAUTHORIZED, new Error(err).message));
		}
	};
};

export default auth;
