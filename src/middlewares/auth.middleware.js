import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import ApiError from '../utils/ApiError.util.js';
import asyncHandler from '../utils/asyncHandler.util.js';

const verifyToken = asyncHandler(async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken || req.header('Authorization').replace('Bearer ', '');
    if (!token) {
      throw new ApiError(401, 'Unauthorized access');
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded._id).select('-password -refreshToken');
    if (!user) {
      throw new ApiError(401, 'Invalid access token');
    }

    req.user = user;

    next();
  } catch (error) {
    throw new ApiError(401, error?.message || 'Unauthorized access');
  }
});

export default verifyToken;
