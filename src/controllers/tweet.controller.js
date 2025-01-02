// get tweets

import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { asyncHandler } from "../utils/asynHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(404, "User not found");
  }

  const tweets = await Tweet.aggregate([
    {
      $match: { owner: new mongoose.Types.ObjectId(userId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likeDetails",
      },
    },
    {
      $addFields: {
        likeCount: { $size: "$likeDetails" },
        ownerDetails: { $first: "$ownerDetails" },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likeDetails.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $project: {
        content: 1,
        ownerDetails: { username: 1, fullname: 1, avatar: 1 },
        likeCount: 1,
        createdAt: 1,
        isLiked: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
});

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) {
    throw new ApiError(401, "Content Required!");
  }

  const tweet = await Tweet.create({
    content,
    owner: req.user?._id,
  });
  if (!tweet) {
    throw new ApiError(401, "Faild to make tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet created successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { tweetId } = req.params;

  if (!content) {
    throw new ApiError(401, "Content can not be empty!");
  }

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(401, "Not a valid twwet ID!");
  }
  const tweet = await Tweet.findById(tweetId);

  if (tweet?.owner.toString() !== req.user?._id) {
    throw new ApiError(401, "Only owner can update the tweet!");
  }
  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: { content },
    },
    {
      new: true,
    }
  );
  if (!updateTweet) {
    throw new ApiError(401, "Failed to update the tweet!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});
const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId) {
    throw new ApiError(401, "Not a valid tweet id!");
  }
  const tweet = await Tweet.findById(tweetId);
  if (tweet?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(401, "Only owner can delete the tweet");
  }
  await Tweet.findByIdAndDelete(tweetId);

  return res
    .status(200)
    .json(new ApiResponse(200, { tweetId }, "Tweet deleted successfully"));
});
export { getUserTweets, createTweet, updateTweet, deleteTweet };
