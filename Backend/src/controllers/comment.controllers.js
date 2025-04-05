import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.models.js"
import {apierror} from "../utils/apieroor.js"
import {apiresponse} from "../utils/apiresponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/vedio.models.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const video = await Video.findById(videoId);
    if(!video){
        throw new apierror(404,"Video not found")
    }

    // const option = {
    //     page,
    //     limit
    // }
    
    const comments = await Comment.aggregate([
        {
            $match : {
                video : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField:"_id",
                as : "createdBy",
                pipeline : [
                    {
                        $project : {
                            username :1,
                            fullname :1,
                            avatar :1
                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                createdBy : {
                    $first : "$createdBy"
                }
            }
        },
        {
            $unwind : "$createdBy"
        },
        {
            $project : {
                content :1,
                createdBy :1
            }
        },
        {
            $skip : (page-1)*limit
        },
        {
            $limit : parseInt(limit)
        }
    ])
    return res.status(200).json(new apiresponse(200, comments , "Comments fetched"))
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params;
    const {content} = req.body;

    const user = req.user._id;

    if(!isValidObjectId(videoId)){
        throw new apierror(400,"Invalid video Id");
    }

    if(!content){
        throw new apierror(400,"Comment content is missing");
    }

    if(!user){
        throw new apierror(404,"User not found")
    }

    const comment = await Comment.create({
        content,
        video : videoId,
        owner : user
    })

    if(!comment){
        throw new apierror(500,"Error while saving the comment");
    }
    return res.status(200).json(new apiresponse(200,comment,"Comment saved"))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {content} = req.body;
    const {commentId} = req.params
    const user = req.user._id;

    if(!isValidObjectId(commentId)){
        throw new apierror(400,"Invalid video Id");
    }

    if(!content){
        throw new apierror(400,"Comment content is missing");
    }

    if(!user){
        throw new apierror(404,"User not found")
    }

    const originalComment = await Comment.findById(commentId);
    if(!originalComment){
        throw new apierror(403,"Comment not found");
    }

    if(!originalComment.owner.equals(user)){
        throw new apierror(404,"You don't have permission to update the commnet")
    }

    const updateComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set : {
                content
            }
        },{new : true}
    )

    if(!updateComment){
        throw new apierror(500,"Error while updating the comment");
    }
    return res.status(200).json(new apiresponse(200,updateComment,"Comment saved"))
})

const deleteComment = asyncHandler(async (req, res) => {
     //TODO: delete a comment
    const { commentId } = req.params;
    const user = req.user._id;
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new apierror(404, "Comment not found");
    }
    if (!comment.owner.equals(user)) {
        throw new apierror(404, "You don't have permission to delete this comment");
    }
    const deleteComment = await Comment.findByIdAndDelete(commentId);
    if (!deleteComment) {
        throw new apierror(500, "Error while deleting comment");
    }
    return res
    .status(200)
    .json(new apiresponse(200, deleteComment, "Comment deleted"));
});

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
    }
