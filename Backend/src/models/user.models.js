import mongoose, { Schema } from "mongoose"; //{Schema } sai mongoose.schema() yaha nhi likhna padega

import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";

const userSchema = new Schema(
{
  //mongo db apna aap id de deta hai BSON data mai save karta hai na ke JSON data mai

  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  fullname: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  avatar: {
    type: String, //cloudinary URL
    required: true
  },
  coverImage: {
    type: String, //cloudinary URL
  },
  watchHistroy: [
    {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
  ],
  password: {
    type: String,
    required: [true, "Password is required"], //if passwrod nhi dalenge to message aayega password is req.
  },
  refreshToken: {
    type: String
  }
},{ timestamps : true} //created at and updated at
);

//pre hook middleware function are excuted one after another, when each middleware call next ...aur yaha.... save hona sai just phale hota hai....

//password encrypted
userSchema.pre("save",async function(next){ //always use standard function not arrow function because arrow function mai this nhi use hota hai
    if(!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password,10)
    next()
}) 

//password check
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function (){
    //short lived access token
    return jwt.sign(
      {
        _id : this._id, //mongoDB
        email : this.email,
        username: this.username,
        fullname : this.fullname
      },
      process.env.ACCESS_TOKEN_SECRET,
      { 
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
      }
    );
  }


userSchema.methods.generateRefreshToken = function (){
    return jwt.sign({
        _id : this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    { 
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
);
}



export const User = mongoose.model("User", userSchema);