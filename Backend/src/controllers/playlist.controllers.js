import mongoose,{Aggregate, isValidObjectId, Schema} from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import {asyncHandler} from "../utils/asyncHandler.js"
import {apierror} from "../utils/apieroor.js"
import {apiresponse} from "../utils/apiresponse.js"

const createPlaylist = asyncHandler( async (req,res) => {
    const {name,description} = req.body;
    if(!name || !description){
        throw new apierror(400,"ALl feilds required");
    }
    const existingPlaylist = await Playlist.findOne({
        $and : [{
            name:name,
        },
        {
            owner : req.user._id
        }
        ]
    })
    if(existingPlaylist){
        throw new apierror(400,"Playlist with this name is already exists");
    }

    const playlist = await  Playlist.create({
        name : name,
        description : description,
        owner : req.user?._id
    })
    if(!playlist){
        throw new apierror(400,"Error while Playlist creating");
    }

    return res.status(200).json(new apiresponse(200,playlist,"Playlist created"))
})

const getUserPlaylist = asyncHandler( async(req,res) => {

    const { userId } = req.params;

    if(!isValidObjectId(userId)){
        throw new apierror(400,"Invalid User ID");
    }

    const userPlaylist = await Playlist.aggregate([
        //Filters playlists that belong to a specific user(userId).
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
        },
        //Joins the videos collection where videos._id matches playlists.videos.
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField : "_id",
                as:"videos",
                pipeline : [
                    //Looks up video owner (from users collection).
                    //Projects only fullname, username, avatar.
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"user",
                            pipeline :[
                                {
                                    $project : {
                                        fullname : 1,
                                        username :1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    },
                    //Extracts the first element from owner array (since $lookup returns an array).
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner",
                            }
                        }
                    },
                    //Keeps only title, thumbnail, description, owner from videos.
                    {
                        $project : {
                            title : 1,
                            thumbnail : 1,
                            description :1,
                            owner :1,
                        }
                    }
                ]
            }
        },
        //Joins users to fetch playlist creator details.
        //Keeps only avatar, fullname, username.
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "createdBy",
                pipeline : [
                    {
                        $project : {
                            avatar :1,
                            fullname :1,
                            username :1
                        }
                    }
                ]
            }
        },
        //Extracts the first element from createdBy array.
        {
            $addFields : {
                createdBy : {
                    $first : "$createdBy"
                }
            }
        },
        //Keeps only videos, createdBy, name, description.
        {
            $project : {
                videos : 1,
                createdBy : 1,
                name :1,
                description :1
            }
        }
    ]);

    if (userPlaylist.length === 0) {
        throw new apierror(504, "No Playlists found");
    }
    
    return res
    .status(200)
    .json(new apiresponse(200, userPlaylist, "Playlists Fetched"));
});

const getPlaylistById = asyncHandler(async (req,res) => {
    
    const {playlistId} = req.params;
    
    if(!isValidObjectId(playlistId)){
        throw new apierror(400,"Invalid playlist Id");
    }

    const playlist = await Playlist.aggregate([
        //is filters the playlists collection to find the document with the given playlistId.
       //The _id field in playlists is expected to be an ObjectId.
        {
            $match : {
                _id : new mongoose.Types.ObjectId(playlistId)
            }
        },
        //Performs a lookup from the users collection where the owner field in playlists matches the _id field in users.
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "createdBy", // owner details are stored in the createdBy array.
                pipeline : [
                    //It returns only three fields
                    {
                       $project : {
                        fullname :1,
                        username :1,
                        avatar:1
                       } 
                    }
                ]
            }
        },
        //Since $lookup returns an array, $first is used to extract the first (and only) user object from createdBy.
        {
            $addFields : {
                createdBy : {
                    $first : "$createdBy"
                }
            }
        },
        //Fetches the videos from the videos collection whose _id matches the ones listed in the videos field of the playlist.
        {
            $lookup : {
                from : "videos",
                localField : "videos",
                foreignField : "_id",
                as:"videos",
                pipeline:[
                    //Performs a lookup on the users collection to fetch the owner details of each video.
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : [
                                {
                                    $project : {
                                        fullname :1,
                                        username :1,
                                        avatar :1
                                    }
                                }
                            ]
                        }
                    },
                    //Extracts the first user object from the owner array for each video.
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    },
                    //Keeps only specific fields in the videos collection.
                    {
                        $project: {
                            thumbnail: 1,
                            title: 1,
                            duration: 1,
                            views: 1,
                            owner: 1,
                            createdAt: 1,
                            updatedAt: 1,
                        }    
                    }
                ]
            }
        },
        //Returns only the following fields in the final result
        {
            $project : {
                videos : 1,
                description : 1,
                name :1,
                createdBy :1
            }
        }
    ]);
    if (!playlist) {
        throw new apierror(500, "Error fetching playlist");
    }
    return res
    .status(200)
    .json(new apiresponse(200, playlist, "Playlist Fetched"));
})



const addvideoToplaylist = asyncHandler(async (req,res) => {

    const {playlistId,videoId} = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new apierror(400, "Invalid Playlist or Video ID");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new apierror(400, "No Playlist found");
    }

    if (!playlist.owner.equals(req.user._id)) {
        throw new apierror(403, "You are not allowed to modify this playlist");
    }

    const VideoExists = playlist.videos.filter((Video) => Video.toString() == videoId);

    if (VideoExists.length > 0) {
        throw new apierror(400, "Video already in the Playlist");
    }

    const addVideo = await Playlist.findByIdAndUpdate(
        playlist,
        {
            $set : {
                videos : [...playlist.videos,videoId]
            },
        },{new : true});

    if (!addVideo) {
        throw new apierror(500, "Error while adding video to playlist");
    }
    
    return res
    .status(200)
    .json(new apiresponse(200, addVideo, "Video Added to Playlist"));
});

const removeVideoFromPlaylist = asyncHandler(async (req,res) => {
    const {playlistId,videoId} = req.params;

    if (!isValidObjectId(videoId) || !isValidObjectId(playlistId)) {
        throw new apierror(400, "Invalid Video or Playlist ID");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new apierror(400, "No Playlist found with the ID");
    }

    if(!playlist.owner.equals(req.user._id)){
        throw new apierror(403,"You are not allowed to modify the playlist");
    }

    const videoExist = playlist.videos.find((video) => video.toString() === videoId);

    if (!videoExist) {
        throw new apierror(400, "No video found with the ID in the playlist");
    }
    
    const modifiedPlaylistVideos = playlist.videos.filter((video) => video.toString() !== videoId)

    const removeVideo = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set : {
                videos : modifiedPlaylistVideos,
            }
        },{new : true}
    )

    if (!removeVideo) {
        throw new apierror(500, "Error while removing video");
    }
    
    return res
    .status(200)
    .json(new apiresponse(200, removeVideo, "Video removed from playlist"));
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if (!isValidObjectId(playlistId)) {
        throw new apierror(400, "Invalid Playlist ID");
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new apierror(400, "No Playlist found with this ID");
    }

    if (!playlist.owner.equals(req.user._id)) {
        throw new apierror(403, "You are not allowed to delete this playlist");
    }

    const deletePlaylist = await Playlist.findByIdAndDelete(playlist._id);

    if (!deletePlaylist) {
        throw new apierror(500, "Error while deleting playlist");
    }
    return res.status(200).json(new apiresponse(200, {}, "Playlist Deleted"));
})

const updatePlaylist = asyncHandler(async (req,res) => {
    const {playlistId} = req.params;
    const{name,description} = req.body;

    if (!name || !description) {
        throw new apierror(400, "All Fields are required");
    }
    if (!isValidObjectId(playlistId)) {
        throw new apierror(400, "Invalid Playlist ID");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      throw new apierror(400, "No Playlist found with this ID");
    }
  
    if (!playlist.owner.equals(req.user._id)) {
      throw new apierror(403, "You are not allowed to modify this playlist");
    }

    const updatePlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set:{
                name,
                description
            }
        },{new : true}
    );

    if (!updatePlaylist) {
        throw new apierror(500, "Error while updating playlist");
    }
    
    return res
    .status(200)
    .json(new apiresponse(200, updatePlaylist, "Playlist Updated"));
})

export {
    createPlaylist,
    addvideoToplaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
    getUserPlaylist,
    getPlaylistById
}