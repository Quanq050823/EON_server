"use strict";

import mongoose from "mongoose";
import config from "./environment.js";
import chalk from "chalk";

const db = async () => {
  try {
    await mongoose.connect(config.connStr);
    console.log(chalk.blueBright("Connected to MongoDB Atlas"));
  } catch (error) {
    console.error("Error connecting to the database:", error);
    process.exit(1);
  }
};

const closeConnection = async () => {
  try {
    await mongoose.connection.close();
    console.log(chalk.red("MongoDB Atlas connection closed"));
  } catch (error) {
    console.error("Error closing connection:", error);
    throw new Error(error);
  }
};

export { db, closeConnection };
