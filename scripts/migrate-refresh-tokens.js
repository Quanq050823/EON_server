import crypto from "crypto";
import { db, closeConnection } from "../src/config/mongodb.js";
import User from "../src/models/User.js";
import RefreshToken from "../src/models/RefreshToken.js";
import * as jwtUtil from "../src/utils/jwtUtil.js";

const APPLY = process.env.APPLY === "true";

const hashRefreshToken = (refreshToken) => {
	return crypto.createHash("sha256").update(refreshToken).digest("hex");
};

const migrate = async () => {
	await db();

	const users = await User.find({
		refreshToken: { $exists: true, $type: "array", $ne: [] },
	}).select("_id refreshToken");

	let validTokenCount = 0;
	let invalidTokenCount = 0;
	const operations = [];
	const userIdsToClear = [];

	for (const user of users) {
		userIdsToClear.push(user._id);

		for (const refreshToken of user.refreshToken) {
			const tokenDetails = await jwtUtil.verifyRefreshToken(refreshToken);

			if (!tokenDetails?.exp) {
				invalidTokenCount += 1;
				continue;
			}

			validTokenCount += 1;
			operations.push({
				updateOne: {
					filter: { tokenHash: hashRefreshToken(refreshToken) },
					update: {
						$setOnInsert: {
							userId: user._id,
							tokenHash: hashRefreshToken(refreshToken),
							expiresAt: new Date(tokenDetails.exp * 1000),
						},
					},
					upsert: true,
				},
			});
		}
	}

	console.log(
		JSON.stringify(
			{
				mode: APPLY ? "apply" : "dry-run",
				usersWithLegacyTokens: users.length,
				validTokenCount,
				invalidTokenCount,
			},
			null,
			2
		)
	);

	if (!APPLY) {
		await closeConnection();
		return;
	}

	if (operations.length > 0) {
		await RefreshToken.bulkWrite(operations, { ordered: false });
	}

	if (userIdsToClear.length > 0) {
		await User.updateMany(
			{ _id: { $in: userIdsToClear } },
			{ $set: { refreshToken: [] } }
		);
	}

	await closeConnection();
};

migrate().catch(async (error) => {
	console.error(error);
	await closeConnection();
	process.exit(1);
});
