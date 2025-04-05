import { v2 as cloudinary } from "cloudinary";
import fs from "fs" //FILE SYSTEM --> LOCAL SERVER MAI UPLOAD KARNA KE LIYE
import dotenv from "dotenv"

dotenv.config({
  path: "./.env",
});


//cloudinary Configuration
cloudinary.config({
  cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
  api_key : process.env.CLOUDINARY_API_KEY,
  api_secret : process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(
            localFilePath,{
                resource_type: "auto"
            } 
        )
        //file has been uploded successfully
        // console.log("file Uploaded on cloudiary .file src : "+ response.url);
        fs.unlinkSync(localFilePath) //we would like to delete from our server when succesfully upload
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) //removed the locally saved temporary file as the upload operation got failed
       return null;
    }
}

function getPublicIdFromUrl(url) {
    const urlWithoutParams = url.split('?')[0]; // Remove query parameters
    const parts = urlWithoutParams.split('/'); // Split the URL by '/'
    const publicIdWithExtension = parts.pop(); // Get the last part of the URL
    const publicId = publicIdWithExtension.split('.')[0]; // Remove the file extension
    return publicId;
  }

const deleteFromCloudinary = async (url) => {
    try {
        const publicId = getPublicIdFromUrl(url)
        const result = await cloudinary.uploader.destroy(publicId)
        return result;
    } catch (error) {
        console.log("Error deleting from cloudinary",error)
        return null
    }
}

export {uploadOnCloudinary , deleteFromCloudinary}


//unlink ----> if path refers to a symbolic path then the link is removed without affecting the file or directory to which that link refers. if the path refers to the file path that is not a symbolic link, the file is delteded.


// this is way we minuplate in cloudinary
// {
//     "asset_id": "1234567890",
//     "public_id": "sample_image_id",
//     "version": 1234567890,
//     "signature": "abc123signature",
//     "width": 800,
//     "height": 600,
//     "format": "jpg",
//     "resource_type": "image",
//     "created_at": "2023-10-01T12:34:56Z",
//     "tags": [],
//     "bytes": 12345,
//     "type": "upload",
//     "url": "http://res.cloudinary.com/demo/image/upload/v1234567890/sample_image_id.jpg",
//     "secure_url": "https://res.cloudinary.com/demo/image/upload/v1234567890/sample_image_id.jpg"
//   }
  