import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const connectDB = async () => {
  try {
    const dbInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log(`MongoDB Connected on HOST: ${dbInstance.connection.host}`);
  } catch (err) {
    console.error('MongoDB connetion failed', err);
    process.exit(1);
  }
};

export default connectDB;
