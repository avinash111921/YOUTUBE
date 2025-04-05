import { Router } from 'express';

import {
    createPlaylist,
    addvideoToplaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
    getUserPlaylist,
    getPlaylistById
} from "../controllers/playlist.controllers.js"

import {verifyJWT} from "../middlewares/auth.middlewares.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(createPlaylist)

router.route("/:playlistId").get(getPlaylistById).patch(updatePlaylist).delete(deletePlaylist);

router.route("/add/:videoId/:playlistId").patch(addvideoToplaylist);
router.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist);

router.route("/user/:userId").get(getUserPlaylist);

export default router 