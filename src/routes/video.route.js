import { Router } from 'express';
import verifyToken from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';
import { publishVideo } from '../controllers/video.controller.js';

const router = Router();

router.use(verifyToken);

router.post(
  '/',
  upload.fields([
    { name: 'videoFile', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  publishVideo,
);

export default router;
