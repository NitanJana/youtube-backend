import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (localFilePath) => {
  if (!localFilePath) return null;
  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto',
    });

    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    console.log('Failed to upload image', error);
    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;
  try {
    const response = await cloudinary.uploader.destroy(publicId);
    return response;
  } catch (error) {
    console.log('Failed to delete image', error);
    return null;
  }
};

export { uploadToCloudinary, deleteFromCloudinary };
