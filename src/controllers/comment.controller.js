// get video comment
import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynHandler.js";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";

const getVideoComment = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const { videoId } = req.params;
  const videoComments = await Comment.aggregate([
    //
    {
      $match: { video: new mongoose.Types.ObjectId(videoId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
      },
    },

    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: {
              $in: [req.user?._id, "$likes.likedBy"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        likesCount: 1,
        owner: {
          username: 1,
          fullname: 1,
          avatar: 1,
        },
        isLiked: 1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };
  const comments = await Comment.aggregatePaginate(videoComments, options);
  return res
    .status(200)
    .json(new ApiResponse(200, comments, "comments data fetched successfully"));
});

// add comment

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;
  if (!content) {
    throw new ApiError(401, "comment content is required");
  }
  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });
  if (!comment) {
    throw new ApiError(401, "Failed to add the comment");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment successfully added"));
});

// update comment

const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { commentId } = req.params;
  const comment = await Comment.findById(commentId);

  if (comment.owner.toString() !== req.user?._id) {
    throw new ApiError(401, "only onwer can update this comment");
  }
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  if (!content) {
    throw new ApiError(400, "Content cannot be empty");
  }
  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );
  if (!updatedComment) {
    throw new ApiError(401, "Failed to update the comment try again!");
  }
  res.json(
    new ApiResponse(200, updatedComment, "Comment successfully updated")
  );
});

// delete comment

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (comment.owner.toString() !== req.user?._id) {
    throw new ApiError(401, "only onwer can delete this comment");
  }
  await Comment.findByIdAndDelete(commentId);
  await Like.deleteMany({
    comment: commentId,
    likedBy: req.user,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { commentId }, "Comment deleted successfully"));
});
export { deleteComment, updateComment, addComment, getVideoComment };
