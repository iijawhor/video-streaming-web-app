import { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynHandler.js";

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
export { toggleSubscription };
