import asyncHandler from '../utils/asyncHandler.util.js';
import ApiError from '../utils/ApiError.util.js';
import ApiResponse from '../utils/ApiResponse.util.js';
import { uploadToCloudinary } from '../utils/cloudinary.util.js';
import { Video } from '../models/video.model.js';

const publishVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, 'Title and description are required');
  }

  const videoPath = req.files?.videoFile?.[0]?.path;

  if (!videoPath) {
    throw new ApiError(400, 'Video file is required');
  }

  const thumbnailPath = req.files?.thumbnail?.[0]?.path;

  if (!thumbnailPath) {
    throw new ApiError(400, 'Thumbnail is required');
  }

  const videoFile = await uploadToCloudinary(videoPath);

  if (!videoFile) {
    throw new ApiError(500, 'Failed to upload video');
  }

  const thumbnailFile = await uploadToCloudinary(thumbnailPath);

  if (!thumbnailFile) {
    throw new ApiError(500, 'Failed to upload thumbnail');
  }

  const video = await Video.create({
    videoFile: videoFile.secure_url,
    thumbnail: thumbnailFile.secure_url,
    owner: req.user._id,
    title,
    description,
    duration: videoFile.duration,
  });

  res.status(201).json(new ApiResponse(201, 'Video published successfully', video));
});

export { publishVideo };
