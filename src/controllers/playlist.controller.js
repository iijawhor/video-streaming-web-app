import { Playlist } from "../models/playlist.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynHandler.js";
import Video from "../models/video.models.js";
import mongoose, { isValidObjectId } from "mongoose";
const createPlaylist = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    throw new ApiError(400, "title and description are required");
  }

  const playlist = await Playlist.create({
    title,
    description,
    owner: req.user?._id,
  });
  if (!playlist) {
    throw new ApiError(400, "failed to create playlist!");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist successfully created"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { title, description } = req.body;

  if (!playlistId) {
    throw new ApiError(400, "playlistId is required");
  }
  if (!title || !description) {
    throw new ApiError(400, "title and description are required");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner?._id.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Only owner can update the playlist");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      title,
      description,
    },
    { new: true }
  );

  return res
    .status(201)
    .json(
      new ApiResponse(201, updatedPlaylist, "Playlist updated successfully")
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!playlistId) {
    throw new ApiError(400, " playlist id is required");
  }
  const playlist = await Playlist.findById(playlistId);
  if (playlist.owner?._id.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Only owner can delete the playlist");
  }

  await Playlist.findByIdAndDelete(playlistId);

  return res
    .status(204)
    .json(new ApiResponse(204, {}, "Playlist deleted successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!playlistId || !videoId) {
    throw new ApiError(404, "playlist ID and video ID are required");
  }
  const playlist = await Playlist.findById(playlistId);
  const video = await Video.findById(videoId);
  if (
    playlist?.owner._id.toString() !== req.user?._id.toString() ||
    video.owner?._id.toString() !== req.user?._id.toString()
  ) {
    throw new ApiError(403, "Only owner can add video to playlist");
  }
  const newPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: { video: videoId },
    },
    { new: true }
  );

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        newPlaylist,
        "video successfully added to the playlis"
      )
    );
});
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(404, "Not a valid video ID");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: { video: videoId },
    },
    { new: true }
  );

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        updatedPlaylist,
        "Video removed suuccessfully removed from playlist"
      )
    );
});
// get all the playlist of an user
const getUserPlaylist = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ApiError(404, "User not found");
  }

  const playlist = await Playlist.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(userId) } },

    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },

    {
      $addFields: {
        totalVideos: { $size: "$videos" },
        titalViewes: { $sum: "$videos?.views" },
      },
    },

    {
      $project: {
        name: 1,
        description: 1,
        createdAt: 1,
        updatedAt: 1,
        totalVideos: 1,
        totalViews: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});
// get all the user playlist videos
const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!playlistId) {
    return res.status(400).json({ error: "Playlist ID is required" });
  }

  const playlistVideos = await Playlist.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(playlistId) },
    },

    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
    {
      $match: { "videos.isPublished": true },
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
      $addFields: {
        totalVideos: {
          $size: "$videos",
        },
        totalViews: {
          $sum: "$videos.views",
        },
        owner: {
          $first: "$owner",
        },
      },
    },

    {
      $project: {
        name: 1,
        description: 1,
        createdAt: 1,
        updatedAt: 1,
        totalVideos: 1,
        totalViews: 1,
        videos: {
          _id: 1,
          videoFile: 1,
          thumbnail: 1,
          title: 1,
          description: 1,
          duration: 1,
          createdAt: 1,
          views: 1,
        },
        owner: {
          username: 1,
          fullName: 1,
          "avatar.url": 1,
        },
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        playlistVideos[0],
        "Playlist videos fetched successfully"
      )
    );
});
export {
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  getPlaylistById,
  getUserPlaylist,
};
