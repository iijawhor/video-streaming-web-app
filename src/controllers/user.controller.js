import { asyncHandler } from "../utils/asynHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
const registerUser = asyncHandler(async (req, res) => {
  // return res.status(200).json({
  //   message: "ok", its nothing just for testing that its working or n ot
  // });
  // to register a user u need to follow these steps
  // 1. get user details from frontend -- for now from postman
  // 2. validation - not empty
  // 3. check if user already exist :username ,email
  // 4.check for images,avatar
  // --upload them to cloudinary
  // 5. create user object - create entry in db
  // 6. remove pasword and refresh token field from response
  // 7. check for user creation
  // 8. return response

  const { fullname, usernmame, password, email } = req.body;
  console.log("Email :", email);
  // if (usernmame === "") {
  //   throw new ApiError(400, "full name is required");
  // }
  if (
    [fullname, usernmame, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "full name is required");
  }

  const existedUser = User.findOne({
    $or: [{ usernmame }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with email or username already active");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    usernmame: usernmame.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(
      500,
      " Something went wrong while registering the user "
    );
  }
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User regitered successfully"));
});

export { registerUser };
