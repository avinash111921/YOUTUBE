import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js"
import { apierror } from "../utils/apieroor.js"
import { asyncHandler } from "../utils/asyncHandler.js"

export const verifyJWT = asyncHandler(async (req,_,next) =>{
    let token = req.cookies?.acessToken || req.header("Authorization")?.replace("Bearer ","")
    //Authorization: Bearer <token>
    //request ke pass cookie ka access hai ..bcoz hume he diya hai app.use(cookieParser()) ye kar ke 

    if(!token){
        throw new apierror(401,"Unauthorized: No token provided")
    }
    try {
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        
        if(!user){
            throw new apierror(401,"Invalid access token")
        }
        req.user = user  //req.anything = user;
        next()
    } catch (error) {
        throw new apierror(401,error?.message || "invalid access token")
    }
})