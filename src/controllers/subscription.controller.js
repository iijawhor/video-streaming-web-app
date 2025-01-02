import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynHandler.js";
import { subscribe } from "diagnostics_channel";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.body;
  const { _id: subscriberId } = req.user;

  if (!subscriberId || !channelId) {
    throw new ApiError(400, "subscriberId or channelId not found!");
  }

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channelId");
  }

  const isSubscribed = await Subscription.findOne({
    subscriber: subscriberId,
    channel: channelId,
  });
  //  unsubscribing the existed user
  if (isSubscribed) {
    await Subscription.findByIdAndDelete(isSubscribed?._id);
    return res.status(
      new ApiResponse(200, { susbscribed: false }, "Unsubscribed successfully")
    );
  }

  const newSubscriber = await Subscription.create({
    subscriber: subscriberId,
    channel: channelId,
  });
  return res
    .status(201)
    .json(
      new ApiResponse(201, { subscribed: true, newSubscriber }, "Subscribed")
    );
});

// controller to return subscriber list of a channel
const getChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const subscribers = await Subscription.aggregate([
    { $match: { channel: new mongoose.Types.ObjectId(channelId) } },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "subscriber",
              foreignField: "channel",
              as: "subscribedChannel",
            },
          },
          {
            $addFields: {
              subscribedChannel: {
                $cond: {
                  if: {
                    $in: [channelId, "subscribedChannel.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
              subscribersCount: {
                $size: "$subscribedChannel",
              },
            },
          },
        ],
      },
    },
    { $unwind: "$subscriber" },
    { $replaceRoot: "$subscriber" },
    {
      $project: {
        _id: 0,
        _id: 1,
        username: 1,
        fullname: 1,
        avatar: 1,
        subscribedChannel: 1,
        subscribersCount: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribers, "Subscribers fetched successfully")
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  const subscribedChannels = await Subscription.aggregate([
    // these stage will filter all the channels which is subscribed by subscriberID,
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    // first lookup to join the subscription doc with user
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "subscribedChannel",
      },
    },
    {
      $addFields: {
        subscribedCount: { $size: "$subscribedChannel" },
      },
    },
    {
      $unwind: "$subscribedChannel",
    },
    { $replaceRoot: "$subscribedChannel" },
    {
      $project: {
        _id: 0,
        username: 1,
        fullname: 1,
        subscribedCount: 1,
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannels,
        "Channels that you subscribed is fetched"
      )
    );
});

export { toggleSubscription, getSubscribedChannels, getChannelSubscribers };
