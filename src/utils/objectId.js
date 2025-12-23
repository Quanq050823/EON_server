import mongoose from "mongoose";

const getObjectId = (userId) => {
	let userIdString = Buffer.isBuffer(userId) ? userId.toString("hex") : userId;

	if (!mongoose.Types.ObjectId.isValid(userIdString)) {
		throw new Error("Invalid ObjectId");
	}
	return userIdString;
};

export default getObjectId;
