import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema(
  {
    userName: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    fullName: {
      type: String,
      required: [true, 'Fullname is required'],
      trim: true,
      index: true,
    },
    avatar: {
      type: String,
      required: [true, 'Avatar is required'],
    },
    coverImage: {
      type: String,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Video',
      },
    ],
  },
  {
    timestamps: true,
  },
);

export const User = mongoose.model('User', userSchema);
