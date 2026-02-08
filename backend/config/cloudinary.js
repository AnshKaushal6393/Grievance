import {v2 as cloudinary} from "cloudinary";
import multer from "multer";
import {CloudinaryStorage} from "multer-storage-cloudinary";
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary:cloudinary,
    params:{
        folder:"grievance-portal/complaints",
        allowed_formats:["jpg","jpeg","png","gif","mp4","mov","avi"],
        resource_type:"auto",
        transformation:[{
            width:1920,
            height:1080,
            crop:"limit"
        }]
    }
});

const upload = multer({storage:storage,limits:{fileSize:10*1024*1024,files:5},
fileFilter:(req,file,cb)=>{
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const minetype = allowedTypes.test(file.mimetype);

    if(minetype){
        cb(null,true);
    }else{
        cb(new Error("Invalid file type. Only images and videos are allowed."));
    }
}});

const deleteFile = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    return false;
  }
};

const getFileType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  return 'unknown';
};


export {cloudinary, upload, deleteFile, getFileType};