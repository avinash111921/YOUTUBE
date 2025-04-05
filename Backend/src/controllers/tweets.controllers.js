import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.models.js"
import {apierror} from "../utils/apieroor.js"
import {apiresponse} from "../utils/apiresponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body
    if(!content){
        throw new apierror(400,"Please write some Tweet");
    }
    const postTweet = await Tweet.create({
        owner: req.user?._id,
        content:content
    })
    if(!postTweet){
        throw new apierror(400,"Tweet not posted!")
    }
    return res.status(200).json(new apiresponse(200,postTweet,"Tweet posted"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const {userId} = req.params;

    if(!isValidObjectId(userId)){
        throw new apierror(400,"Invalid UserId");
    }
    
    const userTweet = await Tweet.find({
        owner : new mongoose.Types.ObjectId(userId) //match owner and userId
    })
    
    if(userTweet.length === 0){
        throw new apierror(404,"No tweet found!!")
    }
    return res.status(200).json( new apiresponse(200,{"Total_tweets":userTweet.length,"Tweet":userTweet},"Tweet found!"))
})

const updateTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    const {content} = req.body

    if(!isValidObjectId(tweetId)){
        throw new apierror(400,"invalid tweetId")
    }
    if(!content){
        throw new apierror(400,"please write something to update!!")
    }

    // 2. find the tweet by tweetId and req.user._id. 
    //    only owner can update the tweet

    const findTweet = await Tweet.findOne({
        //Evaluates one or more expressions and returns true if all of the expressions are true or if run with no argument expressions. 
        // Otherwise, $and returns false.

        //The owner field matches the ObjectId of the current user (req.user._id).
        // The _id field matches the given tweetId.

        $and:[
        {
            owner: new mongoose.Types.ObjectId(req.user?._id)
        },
        {
            _id:tweetId    
        }
    ]
    })
/*     console.log(findTweet);
    {
        _id: new ObjectId('6799383aefbc5763435d7aeb'),
        content: 'hello in avinash world',
        owner: new ObjectId('67988bf56ab02abc8469917a'),
        createdAt: 2025-01-28T20:04:10.932Z,
        updatedAt: 2025-01-28T20:07:11.627Z,
        __v: 0
    } */

    if(!findTweet){
        throw new apierror(400,"You are not authorized to update this tweet")
    }
    findTweet.content = content
    const updateTweet = await findTweet.save()

    if(!updateTweet){
        throw new apierror( 500, "Tweet not updated!" ) 
    }
    return res.status( 200 )
        .json( new apiresponse( 200, updateTweet, "Tweet updated successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    
    if ( !isValidObjectId( tweetId ) ) { 
        throw new apierror( 400, "Invalid Tweet" ) 
    }

    const findTweet = await Tweet.findOne( {
        $and: [ { owner: new mongoose.Types.ObjectId( req.user?._id ) }, { _id: tweetId } ]
    } )

    if ( !findTweet ) { return res.status( 500 ).json( new apierror( 500, {}, "You are not authorized to delete this tweet" ) ) }

    const delTweet = await Tweet.findByIdAndDelete( tweetId )

    return res.status( 200 )
        .json( new apiresponse( 200, delTweet, "Tweet deleted successfully!" ) )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
// $project : used to specify which fields to return to the client.
