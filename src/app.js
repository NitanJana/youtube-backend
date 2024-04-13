import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ limit: '20kb', extended: true }));
app.use(express.static('public'));
app.use(cookieParser());

import userRoute from './routes/user.route.js';

app.use('/api/v1/users', userRoute);

export default app;
