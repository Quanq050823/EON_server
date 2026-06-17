import * as authService from "../services/authService.js";

const checkLogin = () => {
	return async (req, res, next) => {
		try {
			if (req?.cookies?.accessToken || req?.cookies?.refreshToken) {
				const loginStatus = await authService.isLoggedIn(req.cookies);

				if (loginStatus.isAuthenticated) {
					return res.status(200).json({
						message: "User is already logged in.",
						alreadyLoggedIn: true,
						accessToken: loginStatus.accessToken,
						refreshToken: loginStatus.refreshToken,
					});
				}
			}

			next();
		} catch (err) {
			next(err);
		}
	};
};

export default checkLogin;
