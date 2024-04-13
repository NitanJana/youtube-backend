import asyncHandler from '../utils/asyncHandler.util.js';
import ApiError from '../utils/ApiError.util.js';
import ApiResponse from '../utils/ApiResponse.util.js';
import uploadToCloudinary from '../utils/cloudinary.util.js';
import { User } from '../models/user.model.js';

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, userName, email, password } = req.body;
  if (
    [fullName, userName, email, password].some((field) => !field || typeof field !== 'string' || field.trim() === '')
  ) {
    throw new ApiError(400, 'All fields are required');
  }

  const userWithSameEmailOrUsername = await User.findOne({ $or: [{ email }, { userName }] });
  if (userWithSameEmailOrUsername) {
    throw new ApiError(409, 'User with this email or username already exists');
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar is required');
  }

  let coverImageLocalPath = null;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }

  const avatar = await uploadToCloudinary(avatarLocalPath);
  const coverImage = await uploadToCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, 'Failed to upload avatar');
  }

  const newUser = await User.create({
    fullName,
    userName: userName.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || '',
  });

  const createdUser = await User.findById(newUser._id).select('-password -refreshToken');
  if (!createdUser) {
    throw new ApiError(500, 'Failed to create user');
  }

  return res.status(201).json(new ApiResponse(createdUser, 200, 'User registered successfully'));
});

export { registerUser };

