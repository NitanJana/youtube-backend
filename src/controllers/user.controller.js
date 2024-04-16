import asyncHandler from '../utils/asyncHandler.util.js';
import ApiError from '../utils/ApiError.util.js';
import ApiResponse from '../utils/ApiResponse.util.js';
import uploadToCloudinary from '../utils/cloudinary.util.js';
import { User } from '../models/user.model.js';

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, 'Failed to generate access and refresh token', error);
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // Required fields
  const { fullName, userName, email, password } = req.body;
  // Check if all fields are present and are strings
  if (
    [fullName, userName, email, password].some((field) => !field || typeof field !== 'string' || field.trim() === '')
  ) {
    throw new ApiError(400, 'All fields are required');
  }

  // Check if user with same email or username exists
  const userWithSameEmailOrUsername = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { userName: userName.toLowerCase() }],
  });

  if (userWithSameEmailOrUsername) {
    throw new ApiError(409, 'User with this email or username already exists');
  }

  // Avatar is required
  const avatarLocalPath = req.files?.avatar?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar is required');
  }

  // Upload avatar to Cloudinary and get URL
  const avatar = await uploadToCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(400, 'Failed to upload avatar');
  }

  // Cover image is optional
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  const coverImage = await uploadToCloudinary(coverImageLocalPath);

  // Create user document
  const newUser = await User.create({
    fullName,
    userName: userName.toLowerCase(),
    email: email.toLowerCase(),
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || '',
  });

  // Find user document without password and refreshToken
  const createdUser = await User.findById(newUser._id).select('-password -refreshToken');

  if (!createdUser) {
    throw new ApiError(500, 'Failed to create user');
  }

  // Return created user
  res.status(201).json(new ApiResponse(201, 'User created successfully', createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
  const { userName, email, password } = req.body;

  // Check if at least one of username or email is present
  if (!userName && !email) {
    throw new ApiError(400, 'Username or email is required');
  }

  if (!password) {
    throw new ApiError(400, 'Password is required');
  }

  // Find user by username or email
  const user = await User.findOne({
    $or: [{ email: email?.toLowerCase() }, { userName: userName?.toLowerCase() }],
  });

  // Throw error if user not found
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Check if provided password matches user password
  const isMatch = await user.checkPassword(password);

  if (!isMatch) {
    throw new ApiError(401, 'Incorrect password');
  }

  // Generate access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  // Find user without password and refresh token
  const loggedInUser = await User.findById(user._id).select('-password -refreshToken');

  // Set secure and httpOnly options for cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  // Set cookies for access and refresh tokens and return logged in user data
  res
    .status(200)
    .cookie('refreshToken', refreshToken, options)
    .cookie('accessToken', accessToken, options)
    .json(
      new ApiResponse(200, 'User logged in successfully', {
        user: loggedInUser,
        accessToken,
        refreshToken,
      }),
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  // Remove refresh token from user document in database
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 },
    },
    { new: true },
  );

  // Set secure and httpOnly options for cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  // Clear access and refresh tokens from cookies and send success response
  res
    .status(200)
    .clearCookie('refreshToken', options)
    .clearCookie('accessToken', options)
    .json(new ApiResponse(200, 'User logged out successfully'));
});

export { registerUser, loginUser, logOutUser };
