import { Router } from "express";

import { 
    registerUser,
    logoutUser,
    loginUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUsercoverImage,
    getUserChannelProfile,
    getWatchHistory,
    refreshAcessToken
 } from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";


const router = Router();

///api/v1/users

//feils --> accept array
//upload --> multer middleware
router.route("/register").post(upload.fields([
    {
        name : "avatar",
        maxCount : 1
    },{
        name : "coverImage",
        maxCount : 1
    }
]), 
registerUser);

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT,logoutUser)
//phale verifyJwt ko karega excute then next() hone ke wajah sai logoutuser karega excute
router.route("/refresh-token").post(refreshAcessToken)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-account").patch(verifyJWT,updateAccountDetails)
router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateUsercoverImage)
router.route("/c/:username").get(verifyJWT,getUserChannelProfile)
router.route("/history").get(verifyJWT,getWatchHistory)

export default router;
 