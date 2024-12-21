import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file hasbeen uploaded successfully
    console.log("File is uploaded on cloudinary ", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the  load operation got failed
    return null;
  }
};
const oldImageToBeDeleted = async (publicId) => {
  try {
    if (!publicId) return null;
    // upload the file on cloudinary
    const response = await cloudinary.uploader.destroy(publicId);
    // file has been deketed successfully
    console.log("File is deleted from cloudinary ", response);
    return response;
  } catch (error) {
    throw new ApiError(500, `Error while deleting file from Cloudinary`);
  }
};

export { uploadOnCloudinary, oldImageToBeDeleted };
