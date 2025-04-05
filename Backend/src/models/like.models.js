import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    //either of `vedio`,`comment` or `tweet` will be assigned others are null
    vedio: {
        type: Schema.Types.ObjectId,
        ref: "Vedio",
    },
    commnet: {
        type: Schema.Types.ObjectId,
        ref: "Comment",
    },
    tweet:{
        type: Schema.Types.ObjectId,
        ref:"Tweet",
    },
    likeBy:{
        type: Schema.Types.ObjectId,
        ref:"User",
    },
  },
  { timestamps: true }
);

export const Like = mongoose.model("Like", likeSchema);
