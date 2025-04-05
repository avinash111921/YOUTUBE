import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.models.js"
import { Subscription } from "../models/subscription.models.js"
import {apierror} from "../utils/apieroor.js"
import {apiresponse} from "../utils/apiresponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    // TODO: toggle subscription
    const {channelId} = req.params

    if(!isValidObjectId(channelId)){
        throw new apierror(400,"Invalid channel ID")
    }

    const subscribed = await Subscription.findOne({
        $and : [{channel : channelId} , {subscriber : req.user._id}]
    })

    if(!subscribed){
        const subscribe = await Subscription.create({
            subscriber :req.user._id,
            channel : channelId
        })
        if(!subscribe){
            throw new apierror(500, "Eror while subscribing");
        }
        return res.status(200).json(new apiresponse(200,{},"channel Subscribed"));
    }

    const unsubscribed = await Subscription.findByIdAndDelete(subscribed._id);
    if(!unsubscribed){
        throw new apierror(500,"Error while unsubscribing")
    }
    return res.status(200).json(new apiresponse(200,{},"Channel unsubscribed"));
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
//if we want to get channel Subscriber then we need to check === channel name 
//because hum yaha array mai save nhi kar raha hai ; jab v koi subscribe kar raha hai to uska ek new document ban raha hai .. aur documnet mai same kya hoga subscirber pata karna ke liye ---> woh hai channel name
//bss mil gaya channel subscriber
    const {channelId} = req.params

    if(!isValidObjectId(channelId)){
        throw new apierror(400,"Invalid Subscriber ID")
    }

    const subscriberList = Subscription.aggregate([
        {
            $match : {
                channel : new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField:"subscriber",
                foreignField : "_id",
                as :"subscriber",
            }
        },
        {
            $unwind : "$subscriber"
        },
        {
            $project : {
                subscriber : {
                    _id :1,
                    username :1,
                    fullname :1,
                    avatar :1
                }
            }
        }
    ])

    if(!subscriberList){
        throw new apierror(400, "Error fetching subscribers List");
    }

    const info = {
        subscribers: subscriber || [],
        totalSubscribers: subscriber.length || 0
    }

    return res.status(200).json(new apiresponse(200,info,"Subscriber Fetched successfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!isValidObjectId(subscriberId)){
        throw new apierror(400,"Invalid Subscriber ID");
    }

    const user = await User.findById(subscriberId)

    if(!user){
        throw new apierror(404,"subscriber not found")
    }

    const subscribeChannelList = await Subscription.aggregate([
        {
            $match :{subscriber : subscriberId}
        },
        {
            $lookup : {
                from :"users",
                localField : "channel",
                foreignField : "_id",
                as : "$channel"
            }
        },
        {
            $unwind : "$channel"
        },
        {
            $project:{
                subscriber:{
                    _id:1,
                    userName:1,
                    fullName:1,
                    avatar:1
                }
            }    
        }
    ])
    if(!subscribeChannelList.length){
        throw new apierror(408,"the user have not subscribed to any channel")
    }

    return res
    .status(200)
    .json(new apiresponse(200,subscribeChannelList,"subscribed channel fetched successfully"))

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}