import asyncHandler from '../utils/asyncHandler.util.js';
import ApiError from '../utils/ApiError.util.js';
import ApiResponse from '../utils/ApiResponse.util.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.util.js';
import { User } from '../models/user.model.js';
import jwt from 'jsonwebtoken';

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

const renewAccessToken = asyncHandler(async (req, res) => {
  try {
    // Get refresh token from cookie or request body
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    // Ensure that the user is making a valid request
    if (!incomingRefreshToken) {
      throw new ApiError(401, 'Unauthorized request');
    }

    // Verify refresh token and get user document from database
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodedToken._id);

    // Ensure that the refresh token is valid and not expired
    if (!user) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, 'Refresh token is used or expired');
    }

    // Generate new access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    // Set secure and httpOnly options for cookies
    const options = {
      httpOnly: true,
      secure: true,
    };

    // Set cookies for new access and refresh tokens and return new tokens in response body
    res
      .status(200)
      .cookie('refreshToken', refreshToken, options)
      .cookie('accessToken', accessToken, options)
      .json(new ApiResponse(200, 'Access token renewed successfully', { accessToken, refreshToken }));
  } catch (error) {
    throw new ApiError(500, 'Failed to renew access token', error);
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, 'User retrieved successfully', req.user));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { userName, fullName, email } = req.body;

  // Ensure that all fields are present in the request body
  if (!userName || !fullName || !email) {
    throw new ApiError(400, 'All fields are required');
  }

  // Find and update user document based on the authenticated user's ID
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        userName,
        fullName,
        email,
      },
    },
    { new: true },
  ).select('-password -refreshToken');

  res.status(200).json(new ApiResponse(200, 'User details updated successfully', user));
});

const updateAvatar = asyncHandler(async (req, res) => {
  try {
    const avatarPath = req?.file?.path;
    if (!avatarPath) {
      throw new ApiError(400, 'Avatar is required');
    }

    const avatar = await uploadToCloudinary(avatarPath);

    // Delete old avatar from cloudinary
    const publicId = req.user?.avatar?.split('/').pop().split('.')[0];
    if (publicId) {
      await deleteFromCloudinary(publicId);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          avatar: avatar.url,
        },
      },
      { new: true },
    ).select('-password -refreshToken');

    res.status(200).json(new ApiResponse(200, 'Avatar updated successfully', user));
  } catch (error) {
    throw new ApiError(500, 'Failed to update avatar', error);
  }
});

const updatePassword = asyncHandler(async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      throw new ApiError(400, 'All fields are required');
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (!(await user.checkPassword(oldPassword))) {
      throw new ApiError(400, 'Old password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json(new ApiResponse(200, 'Password updated successfully'));
  } catch (error) {
    throw new ApiError(500, error?.message || 'Failed to update password', error);
  }
});

export {
  registerUser,
  loginUser,
  logOutUser,
  renewAccessToken,
  getCurrentUser,
  updateUserDetails,
  updateAvatar,
  updatePassword,
};
