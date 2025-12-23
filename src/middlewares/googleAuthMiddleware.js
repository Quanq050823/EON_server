import GoogleStrategy from "passport-google-oauth20";
import config from "../config/environment.js";
import passport from "passport";
import User from "../models/User.js";

// Check if Google OAuth is configured
if (config.googleAuthConfig.clientId && config.googleAuthConfig.clientSecret) {
	passport.use(
		new GoogleStrategy(
			{
				clientID: config.googleAuthConfig.clientId,
				clientSecret: config.googleAuthConfig.clientSecret,
				callbackURL: `${config.googleAuthConfig.googleRedirectUri}`,
				passReqToCallback: true,
			},
			async (request, accessToken, refreshToken, profile, done) => {
				try {
					let user = await User.findOne({ email: profile.emails[0].value });
					const hasGoogleProvider = user?.federatedCredentials.some(
						(credential) => credential.provider === "google"
					);
					if (user) {
						if (!hasGoogleProvider) {
							user.federatedCredentials.push({
								_id: profile.id,
								provider: "google",
							});
							await user.save();
						}
					} else {
						// Generate a unique username based on email or profile info
						const baseUsername = profile.emails[0].value.split("@")[0];
						let username = baseUsername;
						let counter = 1;

						// Check if username already exists and increment if needed
						while (await User.findOne({ username: username })) {
							username = `${baseUsername}${counter}`;
							counter++;
						}

						user = new User({
							email: profile.emails[0].value,
							name: profile.displayName,
							username: username,
							federatedCredentials: [{ _id: profile.id, provider: "google" }],
							isVerified: true,
							avatar: profile.photos[0].value,
						});
						await user.save();
					}
					return done(null, user);
				} catch (error) {
					console.error("Error in Google OAuth callback:", error);
					return done(error);
				}
			}
		)
	);

	passport.serializeUser((user, done) => {
		done(null, user.id); // Serialize user ID into session
	});

	passport.deserializeUser((id, done) => {
		User.findById(id, (err, user) => {
			done(err, user); // Deserialize user object
		});
	});
} else {
	console.warn(
		"Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file"
	);
}
