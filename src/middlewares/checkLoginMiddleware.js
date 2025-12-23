import config from "../config/environment.js";

const checkLogin = () => {
	return async (req, res, next) => {
		try {
			if (req?.cookies?.accessToken || req?.cookies?.refreshToken) {
				console.log(req?.cookies);
				return res.status(200).json({
					message: `User is already logged in.`,
					accessToken: `${req.cookies.accessToken}`,
					alreadyLoggedIn: true,
				});
			}
			next();
		} catch (err) {
			next(err);
		}
	};
};

export default checkLogin;
