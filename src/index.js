import dotenv from 'dotenv';
import connectDB from './db/index.js';

dotenv.config({ path: './.env' });

connectDB()
  .then(() => {
    console.log('Database connected');
  })
  .catch((err) => {
    console.error(err.message);
  });
