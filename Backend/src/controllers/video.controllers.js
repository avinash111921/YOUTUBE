import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/vedio.models.js"
import {User} from "../models/user.models.js"
import {apierror} from "../utils/apieroor.js"
import {apiresponse} from "../utils/apiresponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
  } from "../utils/cloudinary.js";
  

const getAllVideos = asyncHandler(async (req, res) => {

    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    const videos = await Video.aggregate([
        {
            $match : {
                $or : [
                    {
                        title : {$regex : query, $options : "i"},
                    },
                    {
                        description : {$regex : query, $options : "i"}
                    }
                ]
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "createdBy"
            }
        },
        {
            $unwind : "$createdBy"
        }, 
        {
            $project : {
                thumbnail :1,
                videoFile :1,
                title :1,
                description :1,
                createdby : {
                    fullname :1,
                    username :1,
                    avatar :1,
                }
            }
        },
        {
            $sort : {
                [sortBy] : sortType == "asc" ? 1 : -1,
            }
        },
        {
            $skip : (page-1)*limit
        },
        {
            $limit : parseInt(limit),
        }
    ])
    return res
    .status(200)
    .json(new apiresponse(200, videos, "Fetched All Videos"));
})

const publishAVideo = asyncHandler(async (req, res) => {
    // TODO: get video, upload to cloudinary, create video

    const { title, description} = req.body

    // const {userId} = req.user._id;

    // if(!isValidObjectId(userId)){
    //     throw new apierror(400,"you are not allowed to publish");
    // }

    const videoFilePath = req.files?.videoFile?.[0]?.path
    
    if(!videoFilePath){
        throw new apierror(400, "No video file found");
    }

    let videoFile;
    try {
        videoFile = await uploadOnCloudinary(videoFilePath)
    } catch (error) {
        throw new apierror(500, "failed to upload video");
    }

    const thumbnailFilePath = req.files?.thumbnail?.[0]?.path

    if(!thumbnailFilePath){
        throw new apierror(400, "Thumbnail file is missing");
    }


    let thumbnail;
    try {
        thumbnail = await uploadOnCloudinary(thumbnailFilePath);
    } catch (error) {
        throw new apierror(500,"failed to upload thumbnail");
    }

    try {
        const video = await Video.create({
            videoFile : videoFile.url,
            thumbnail:thumbnail.url,
            title : title,
            description : description,
            duration : videoFile.duration,
            owner : req.user._id
        });

        if(!video){
            throw new apierror(500,"Error while publishing the video");
        }
        return res.status(200).json(new apiresponse(200, video, "video publish successfully"));
    } catch (error) {
        if(thumbnail){
            await deleteFromCloudinary(thumbnail);
        }
        if(videoFile){
            await deleteFromCloudinary(videoFile);
        }
        throw new apierror(
            500,
            "soemthing went wrong while publishing a video and viedo are deleted"
          );
    }

})

const getVideoById = asyncHandler(async (req, res) => {
    //TODO: get video by id
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new apierror(400, "Invalid Video ID");
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new apierror(404,"No video found");
    }

    return res.status(200).json(new apiresponse(200,video,"Video fetched"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const newThumbnailLocalPath = req.file?.path;

    if (!isValidObjectId(videoId)) {
        throw new apierror(400, "Invalid video ID");
    }

    if (!title || !description) {
        throw new apierror(400, "Provide updated Title and Description");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new apierror(404, "Video not found");
    }

    if (!video.owner.equals(req.user._id)) {
        throw new apierror(403, "You are not allowed to update this video");
    }

    // Handle thumbnail update only if a new one is provided
    let newThumbnailUrl = video.thumbnail;
    
    if (newThumbnailLocalPath) {
        if (video.thumbnail) {
            try {
                // console.log("Deleting old thumbnail from Cloudinary:", video.thumbnail);
                const deleteThumbnail = await deleteFromCloudinary(video.thumbnail);
                if (!deleteThumbnail || deleteThumbnail.result?.toLowerCase() !== "ok") {
                    throw new apierror(500, "Error deleting old thumbnail from Cloudinary");
                }
            } catch (error) {
                throw new apierror(500, "Failed to delete old thumbnail: " + error.message);
            }
        }

        const newThumbnail = await uploadOnCloudinary(newThumbnailLocalPath);
        if (!newThumbnail.url) {
            throw new apierror(500, "Error while uploading new thumbnail");
        }
        newThumbnailUrl = newThumbnail.url;
    }

    // Update video details
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: newThumbnailUrl,
            },
        },
        { new: true }
    );

    return res.status(200).json(new apiresponse(200, updatedVideo, "Video details updated"));
});


const deleteVideo = asyncHandler(async (req, res) => {
    //TODO: delete video
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new apierror(400, "Invalid Video Id");
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new apierror(403,"Video not Found");
    }

    if(!video.owner.equals(req.user._id)){
        throw new apierror(402,"You are not allowed to manipulate the data");
    }

    const cloudinaryDeleteVideoResponse = await deleteFromCloudinary(video.videoFile)

    if(!cloudinaryDeleteVideoResponse){
        throw new apierror(500,"Error while delteing vedio from cloudinary");
    }

    const cloudinaryDeleteThumbnailResponse = await deleteFromCloudinary(video.thumbnail);

    if(!cloudinaryDeleteThumbnailResponse){
        throw new apierror(500,"Error while deleting the thumbnail from cloudinary");
    }

    const deleteVideo = await Video.findByIdAndDelete(videoId)

    if(!deleteVideo){
        throw new apierror(500,"Error while deleting the vedio");
    }

    return res.status(200).json(new apiresponse(200,{},"Video Deleted"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!isValidObjectId(videoId)){
        throw new apierror(400,"Invalid Video Id");
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new apierror(404,"Video Not found");
    }

    if(!video.owner.equals(req.user._id)){
        throw new apierror(403,"You are not allowed to modify this video status");
    }

    const modifyVideoPublishStatus = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                isPublished : !video.isPublished
            }
        },{new : true}
    )
    return res.status(200).json(new apiresponse(200,modifyVideoPublishStatus,"Video Publish status modified"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
