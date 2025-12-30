"use strict";

import express from "express";
import config from "./config/environment.js";
import { db } from "./config/mongodb.js";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import routes from "./routes/index.js";
import chalk from "chalk";
import session from "express-session";
import passport from "passport";

const START_SERVER = () => {
	const app = express();

	app.use(cookieParser());
	app.use(
		session({
			secret: "your-secret-key",
			resave: false,
			saveUninitialized: true,
			cookie: { secure: false },
		})
	);
	app.use(passport.initialize());
	app.use(express.json({ extended: true }));
	app.use(
		cors({
			origin: true,
			credentials: true,
		})
	);
	app.use(express.urlencoded({ extended: true }));
	app.use(morgan("combined"));
	const port = config.port;

	routes(app);

	app.listen(config.port, () => {
		console.log(chalk.blueBright(`Listen on http://localhost:${port}`));
	});
};

db()
	.then(() => {
		START_SERVER();
	})
	.catch((error) => {
		console.error(chalk.red("Error on starting server: ", error));
		process.exit(0);
	});
