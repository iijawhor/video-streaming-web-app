import asyncHandler from "../utils/asynHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import Video from "../models/video.models.js";
import mongoose, { isValidObjectId } from "mongoose";

// get all videos based on query, sort, pagination
const getAllVideos = asyncHandler(async (req, res) => {
  //   for using full text based search you need to create a search index in MongoDB
  //   you can include field mapings in search index ex. title,description
  //   field mapping specify which fields within your documents should be indexed for text search
  //   this helps in searching only in title,desc providing faster search results
  //   here the name of search index is -search-videos

  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  const pipeline = [];
  if (query) {
    pipeline.push({
      $search: {
        index: "video-search",
        text: {
          query: query,
          path: ["title", "description"], // search based on ttitle , desc
        },
      },
    });
  }
  //   filter by user ID
  if (userId) {
    pipeline.push({
      $match: {
        owner: userId,
      },
    });
  }
  //   match only publish video
  pipeline.push({
    $match: { isPublished: true },
  });

  //   add sorting stage
  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    });
  } else {
    pipeline.push({
      $sort: { createdAt: -1 },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    { $unwind: "$ownerDetails" }
  );

  const videoAggregate = Video.aggregate(pipeline);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };
  const video = await Video.aggregatePaginate(videoAggregate, options);
  return res
    .status(200)
    .json(new ApiResponse(200, video, "videos are fetched successfully"));
});

// get video by ID
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  // let userId = req.body;

  // userId = new mongoose.Types.ObjectId(userId)
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(400, "Invalid userId");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscribers.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              "avatar.url": 1,
              subscribersCount: 1,
              isSubscribed: 1,
            },
          },
        ],
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
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        "videoFile.url": 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
      },
    },
  ]);

  if (!video) {
    throw new ApiError(500, "failed to fetch video");
  }

  // increment views if video fetched successfully
  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1,
    },
  });

  // add this video to user watch history
  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "video details fetched successfully"));
});

// update video details like title, description, thumbnail
const updateVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  if (!(title && description)) {
    throw new ApiError(400, "title and description are required");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "No video found");
  }

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't edit this video as you are not the owner"
    );
  }

  //deleting old thumbnail and updating with new one
  const thumbnailToDelete = video.thumbnail.public_id;

  const thumbnailLocalPath = req.file?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnail is required");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!thumbnail) {
    throw new ApiError(400, "thumbnail not found");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: {
          public_id: thumbnail.public_id,
          url: thumbnail.url,
        },
      },
    },
    { new: true }
  );

  if (!updatedVideo) {
    throw new ApiError(500, "Failed to update video please try again");
  }

  if (updatedVideo) {
    await deleteOnCloudinary(thumbnailToDelete);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

// delete video
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "No video found");
  }

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't delete this video as you are not the owner"
    );
  }

  const videoDeleted = await Video.findByIdAndDelete(video?._id);

  if (!videoDeleted) {
    throw new ApiError(400, "Failed to delete the video please try again");
  }

  await deleteOnCloudinary(video.thumbnail.public_id); // video model has thumbnail public_id stored in it->check videoModel
  await deleteOnCloudinary(video.videoFile.public_id, "video"); // specify video while deleting video

  // delete video likes
  await Like.deleteMany({
    video: videoId,
  });

  // delete video comments
  await Comment.deleteMany({
    video: videoId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

// toggle publish status of a video
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't toogle publish status as you are not the owner"
    );
  }

  const toggledVideoPublish = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video?.isPublished,
      },
    },
    { new: true }
  );

  if (!toggledVideoPublish) {
    throw new ApiError(500, "Failed to toogle video publish status");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: toggledVideoPublish.isPublished },
        "Video publish toggled successfully"
      )
    );
});

export {
  publishAVideo,
  updateVideo,
  deleteVideo,
  getAllVideos,
  getVideoById,
  togglePublishStatus,
};
