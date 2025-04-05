import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.models.js"
import {apierror} from "../utils/apieroor.js"
import {apiresponse} from "../utils/apiresponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on video
    const {videoId} = req.params

    if(!isValidObjectId(videoId)){
        throw new apierror(400, " Invalid Video Id");
    }
    const user = req.user._id

    const likeVideo = await Like.findOne({
        $and : [{video:videoId},{likeBy : user}]
    })

    let like;
    let unlike;
    if(likeVideo){
        unlike =  await Like.findByIdAndDelete({ _id: likeVideo._id });
        if(!unlike){
            throw new apierror(500, "Error while unliking the video")
        }
        return res.status(200).json(new apiresponse(200,unlike,"User unliked the video"))
    }else{
        like = await Like.create({
            video : videoId,
            likeBy : user
        })
        if(!like){
            throw new apierror(500, "Error while liking the video")
        }
    }
    return res.status(200).json(new apiresponse(200,like,"User Liked the video"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on comment
    const {commentId} = req.params
    if(!isValidObjectId(commentId)){
        throw new apierror(400, " Invalid comment Id");
    }
    const user = req.user._id

    const likeComment = await Like.findOne({
        $and : [{commnet: commentId},{likeBy : user}]
    })

    let like;
    let unlike;
    if(likeComment){
        unlike =  await Like.findByIdAndDelete({ _id: likeComment._id });
        if(!unlike){
            throw new apierror(500, "Error while unliking the comment")
        }
        return res.status(200).json(new apiresponse(200,unlike,"User unliked the comment"))
    }else{
        like = await Like.create({
            commnet : commentId,
            likeBy : user
        })
        if(!like){
            throw new apierror(500, "Error while liking the comment")
        }
    }
    return res.status(200).json(new apiresponse(200,like,"User Liked the comment"))


})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!isValidObjectId(tweetId)){
        throw new apierror(400, " Invalid Tweet Id");
    }
    const user = req.user._id

    const likeTweet = await Like.findOne({
        $and : [{commnet: tweetId},{likeBy : user}]
    })

    let like;
    let unlike;
    if(likeTweet){
        unlike =  await Like.findByIdAndDelete({ _id: likeTweet._id });
        if(!unlike){
            throw new apierror(500, "Error while unliking the Tweet")
        }
        return res.status(200).json(new apiresponse(200,unlike,"User unliked the Tweet"))
    }else{
        like = await Like.create({
            tweet : tweetId,
            likeBy : user
        })
        if(!like){
            throw new apierror(500, "Error while liking the Tweet")
        }
    }
    return res.status(200).json(new apiresponse(200,like,"User Liked the Tweet"))
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const likedVideos = await Like.aggregate([
        {
            $match : {
                likeBy : new mongoose.Types.ObjectId(req.user._id),
                video : {$exists : true, $ne : null}
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "video",
                foreignField : "_id",
                as: "video",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : [
                                {
                                    $project : {
                                        avatar :1,
                                        username :1,
                                        fullname :1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    },
                    {
                        $project : {
                            videoFile : 1,
                            thumbnail :1,
                            title :1,
                            duration :1,
                            views :1,
                            owner :1
                        }
                    }
                ]
            }
        },
        {
            $unwind : "$video"
        },
        {
            $project : {
                video :1,
                likeBy :1
            }
        }
    ])

    return res.status(200).json(new apiresponse(200,likedVideos,"Fetched liked videos succesfully"))
    
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}