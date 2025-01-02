// Toggle Video Like

import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asynHandler";
import { ApiError } from "../utils/ApiError";
import { Like } from "../models/like.models";
import { ApiResponse } from "../utils/ApiResponse";
import { Comment } from "../models/comment.models";

const toggleVideoLike = asyncHandler(async (req, res) => {
  // get the video (videoId) from params
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(401, "Invalid video ID");
  }
  // check thatvideo is already liked or not
  const alreadyLiked = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });
  //  if already liked than toggle to false
  if (alreadyLiked) {
    await Like.findByIdAndDelete(alreadyLiked._id);
    return res
      .status(201)
      .json(new ApiResponse(201, { isLiked: false }, "Like removed"));
  }

  await Like.create({
    video: videoId,
    likedBy: req.user?._id,
  });
  return res.status(201, { isLiked: true });
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  // Get the comment id from params
  const { commentId } = req.params;
  const { id: _id } = req.user;
  //   check comment is already liked or not
  if (!isValidObjectId(id)) {
    throw new ApiError(401, "Invalid comment ID");
  }

  const alreadyLiked = await Comment.findOne({
    comment: commentId,
    likedBy: id,
  });

  if (alreadyLiked) {
    await Like.findByIdAndDelete(alreadyLiked._id);
    return res
      .status(200)
      .json(new ApiResponse(201, { isLiked: false }, "Like removed"));
  }
  await Like.create({
    comment: commentId,
    likedBy: req.user?._id,
  });

  return res.status(201).json(2001, { isLiked: true });
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  const alreadyLiked = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  if (alreadyLiked) {
    await Like.findByIdAndDelete(alreadyLiked._id);
    return res
      .status(201)
      .json(new ApiResponse(201, { isLiked: false }, "Like removed"));
  }
  await Like.create({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  return res.status(201).json(201, { isLiked: true });
});
// need to learn about aggregation pipeline
const getLikedVideos = asyncHandler(async (req, res) => {
  const likeVideoAggregate = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideo",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
            },
          },
          { $unwind: "$ownerDetails" },
        ],
      },
    },
    {
      $unwind: "$likedVideo",
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $project: {
        _id: 0,
        likedBy: {
          _id: 1,
          "videoFile.url": 1,
          "thumbnail.url": 1,
          owner: 1,
          title: 1,
          description: 1,
          views: 1,
          duration: 1,
          createdAt: 1,
          ownerDetails: {
            username: 1,
            fullname: 1,
            "avatar.url": 1,
          },
        },
      },
    },
  ]);
  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        likeVideoAggregate,
        "liked videos fetched successfully"
      )
    );
});
export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
