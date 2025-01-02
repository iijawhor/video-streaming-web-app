import { asyncHandler } from "../utils/asynHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
const healthcChecker = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, { status: OK }, "Everything is OK"));
});
export { healthcChecker };
