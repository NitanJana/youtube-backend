import { Router } from 'express';
import { upload } from '../middlewares/multer.middleware.js';
import { getCurrentUser, logOutUser, loginUser, registerUser, renewAccessToken } from '../controllers/user.controller.js';
import verifyToken from '../middlewares/auth.middleware.js';

const router = Router();

router.route('/register').post(
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  registerUser,
);

router.route('/login').post(loginUser);
router.route('/logout').post(verifyToken, logOutUser);
router.route('/renew-token').post(renewAccessToken);
router.route('/current-user').get(verifyToken,getCurrentUser);

export default router;
