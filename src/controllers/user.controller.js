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

  const { fullname, username, password, email } = req.body;
  console.log("Email :", email);
  // if (usernmame === "") {
  //   throw new ApiError(400, "full name is required");
  // }
  if (
    [fullname, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  if (!email.includes("@")) {
    throw new ApiError(400, "email is not valid");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exist");
  }
  // console.log("Existed user in user controll : ", existedUser);

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }
  // upload files in images,files
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
    username: username,
  });
  console.log(user);

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User regitered successfully"));
});

export { registerUser };
