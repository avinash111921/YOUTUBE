import { asyncHandler } from "../utils/asyncHandler.js";

import { apierror } from "../utils/apieroor.js";

import { User } from "../models/user.models.js";

import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

import { apiresponse } from "../utils/apiresponse.js";

import jwt from "jsonwebtoken";

//asyncHandler ke zarurat nhi hai because hum yaha web req pai focus nhi kar rahe hai ... internal method hai
const generateAccessAndRefereshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw apierror(401, "user not found");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    //save --> mongoDb sai ban ke aaya hai is leya iske pass save() hota hai
    //save karte hai to mongoose ke model kickIn ho jate hai --> like password -> true,"Password is required" ..aur yaha ek he parameter dal ke save kar rahe hai ... is leya validatebeforesave : true
    await user.save({ validateBeforeSave: false });
    //return access and refresh TOKEN
    return { accessToken, refreshToken };
  } catch (error) {
    throw new apierror(
      500,
      "something went wrong while generating acess and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //  <---TODO -->
  //get user detail from frontend
  //validation - not empty
  //check if user alredy exist : username or email
  //check for images
  // check for avatar
  //upload them to cloudinary
  //then check avatar upload or not
  //create user obejct - create entry in db
  //removed password and refresh token filed from response
  //check for user creation
  //return response

  const { fullname, email, username, password } = req.body;

  //validation
  //.some()--> return true false --> .map()
  // console.log(req.body);
  if (
    [fullname, username, email, password].some((field) => field?.trim() === "") //field hai to usko trim kar do
  ) {
    // if(fullname?.trim() === "")
    throw new apierror(400, "ALl fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }], //ya to email ya to username  $->operator
  });
  if (existedUser) {
    throw new apierror(409, "User with email or username already exists");
  }
  // console.log(req.file)
  //req.files is an array --> multer deta hai 
  //multer beech mai aata hai name -> avatar & coverImage
  //yaha pai localPath milta hai multer usko local server mai upload keya hai phir yaha sai localpath lenge aur cloudinary pai upload kar denge
  const avatarLocalPath = req.files?.avatar?.[0]?.path; //? means optionally chain (local path is leya bcoz yaha avatar abhi apna server pai hai cloudinary pai nhi gaya hai)
  const coverLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new apierror(400, "Avatar file is missing");
  }

  // const avatar = await uploadOnCloudinary(avatarLocalPath)
  // let coverImage = ""
  // if(coverLocalPath){
  //     const coverImage = await uploadOnCloudinary(coverImage)
  // }
//here we use await because file upload hone mai time lag skta hai ..aur is leya async halder mai jo function dal rahe hai usko v async bana rahe hai 
  let avatar;
  try {
    avatar = await uploadOnCloudinary(avatarLocalPath);
  } catch (error) {
    throw new apierror(500, "failed to upload Avatar");
  }

  let coverImage;
  try {
    coverImage = await uploadOnCloudinary(coverLocalPath);
  } catch (error) {
    throw new apierror(500, "failed to upload coverImage");
  }

  //create user:--->
  try {
    const user = await User.create({
      fullname: fullname,
      avatar: avatar.url, //cloudinary send response --> .url use karna hai
      coverImage: coverImage?.url || "",
      email: email,
      password: password,
      username: username.toLowerCase()
    });
    
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      throw new apierror(500, "soemthing went wrong while registering a user ");
    }
    return res.status(201).json(new apiresponse(200, createdUser, "user register successfully"));
  } catch (error) {
    //error in user creation!!
    if (avatar) {
      await deleteFromCloudinary(avatar.public_id);
    }
    if (coverImage) {
      await deleteFromCloudinary(coverImage.public_id);
    }
    throw new apierror(
      500,
      "soemthing went wrong while registering a user and iamges are deleted"
    );
  }
});

//login user --->

const loginUser = asyncHandler(async (req, res) => {
  //req body -> data
  //username or email
  //find user
  //login hai to password check
  //password right hua to acess and refresh token
  //send cookie


  //get data from body
  const { email, username, password } = req.body;

  //validation
  if (!(email || username)) {
    throw new apierror(400, "Email or username is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }], //or,set,match .. etc are mongodb opreator
  });

  if (!user) {
    throw new apierror(404, "User does not exist");
  }

  //validation password
  const isPasswordValid = await user.isPasswordCorrect(password); //yaha jo  password dal rahe hai woh body sai aa raha hai ...

  if (!isPasswordValid) {
    throw new apierror(401, "Invalid user cradentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshToken(
    user._id
  );

  //loogedin User --->
  const loggedInUser = await User.findById(user._id).select(
    "-password  -refreshToken"
  );

  //jab hum cookies send karta hai to options design karna padta hai
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // secure : true,
  };

  return res
    .status(200)
    .cookie("acessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiresponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in sucessfully"
      )
    );
});

// ----> logout User

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,  //req.body,req.cockies,req.user 3 hai
    {
      $unset: {
        refreshToken: 1, //this removes the feild from document
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // secure:true
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiresponse(200, {}, "user logout sucessfully"));
});

// after expire of access token
const refreshAcessToken = asyncHandler(async (req, res) => {
  
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new apierror(401, "unauthorized request 1");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new apierror(401, "invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new apierror(401, "invalid or expired refresh token");
    }
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new apiresponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new apierror(
      401,
      "something went wrong while refreshing acess token"
    );
  }
});

//change password
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  //here user is login --> and want to change his password
  const user = await User.findById(req.user?._id);

  // Check if user exists
  if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
      throw new apierror(400, "Invalid password");
  }

  // Update password
  user.password = newPassword; //pre-save middleware to hash it in usermodels
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new apiresponse(200, {}, "Password changed successfully"));
});

//get current user
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new apiresponse(200, req.user, "current user fatched succesfully")); //req.user is main
});

//update account details
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  if (!fullname || !email) {
    throw new apierror(400, "All fields are required");
  } 

  try {
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          fullname:fullname,
          email,
        },
      },
      { new: true }  //update hone ke baad jo information hai wo return hota hai
    ).select("-password");

    if (!user) {
      throw new apierror(404, "User not found");
    }
    
    return res.status(200).json(new apiresponse(200, user, "Account details updated successfully"));
  } catch (error) {
    // You may want to log the error or handle it in a way that suits your application
    throw new apierror(500, "An error occurred while updating account details");
  }
});

 //update userAvtar
const updateUserAvatar = asyncHandler(async (req, res) => {

  const avatarLocalPath = req.file?.path; //multer sai req.file(file not a files because only one avatar)

  if (!avatarLocalPath) {
    throw new apierror(400, "Avatar file is missing!!");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new apierror(400, "error while uploading Avatar!");
  }
  const user = await User.findByIdAndUpdate(
    req.user._id, //auth middleware sai req.user
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  const oldAvatarurl = req.user?.avatar
  // console.log(oldAvatarurl)
  const deleteOldAvatar = await deleteFromCloudinary(oldAvatarurl)
    if(!deleteOldAvatar){
      throw new apierror(400,"Error while delete old avatar!!")
    }

  return res
    .status(200)
    .json(new apiresponse(200, user, "Avatar image updated succesfully!"));
});
//update coverimage

const updateUsercoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new apierror(400, "coverImage file is missing!!");
  }


  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new apierror(400, "error while uploading coverIamge!");
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverIamge: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  const oldcoverImageurl = req.user?.coverImage
  const deleteOldcoverIamge = await deleteFromCloudinary(oldcoverImageurl)
    if(!deleteOldcoverIamge){
      throw new apierror(400,"Error while delete old coverImage!!")
    }

  return res
    .status(200)
    .json(new apiresponse(200, user, "cover image updated succesfully!"));
});

//getuserChannelProfile
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new apierror(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username : username?.toLowerCase(), //yaha sai ek document aaya like chai aur code aaya
      },
    },
    {
      $lookup: {
        from: "subscriptions", //model name  - > Subscription
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverIamge: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new apierror(404, "channel does not exists");
  }

  return res
    .status(200)
    .json(new apiresponse(200, channel[0], "User channel fatched succesfully"));
});

// getWatchHistory
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoos.Types.ObjectId(req.user._id),
      }, //yaha sai user mil jayega
    },
    {
      $lookup: {
        from: "vedios",
        localField: "watchHistroy",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "Owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new apiresponse(
        200,
        user[0].watchHistory,
        "watch hsitory fetched succesfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  refreshAcessToken,
  logoutUser,
  getCurrentUser,
  changeCurrentPassword,
  updateAccountDetails,
  updateUserAvatar,
  updateUsercoverImage,
  getUserChannelProfile,
  getWatchHistory,
};