import dotenv from "dotenv";
dotenv.config();

import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import { env_config } from "../config/env-config";

const uri = env_config.DATABASE_URL!;
const client = new MongoClient(uri);

let isConnected = false;

export const connectDB = async () => {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
    console.log("MongoDB connected");
  }
};

export const connectMongoose = async () => {
  try {
    await mongoose.connect(env_config.DATABASE_URL as string);
    console.log("Mongoose connected");
  } catch (error) {
    console.error("Mongoose connection error", error);
    process.exit(1);
  }
};

export const db = client.db("test");
