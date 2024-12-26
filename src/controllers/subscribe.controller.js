import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynHandler.js";

const subscribe = asyncHandler(async (req, res) => {
  const { channelId } = req.body;
  const { _id: subscriberId } = req.user;

  if (!subscriberId || !channelId) {
    throw new ApiError(400, "subscriberId or channelId not found!");
  }

  const existedUser = await Subscription.findOne({
    subscriber: subscriberId,
    channel: channelId,
  });
  //  unsubscribing the existed user
  if (existedUser) {
    await Subscription.findByIdAndDelete(existedUser?._id);
    return res.status(
      new ApiResponse(200, { status: false }, "Unsubscribed successfully")
    );
  }

  const newSubscriber = await Subscription.create({
    subscriber: subscriberId,
    channel: channelId,
  });
  return res
    .status(201)
    .json(new ApiResponse(201, { status: true, newSubscriber }, "Subscribed"));
});
export { subscribe };
