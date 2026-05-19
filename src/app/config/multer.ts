import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinary_upload } from "./file-uploder";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary_upload,
  params: async (req, file) => {
    const originalName = file.originalname;
    const extension = originalName.split(".").pop()?.toLocaleLowerCase();

    const fileNameWithoutExtension = originalName
      .split(".")
      .slice(0, -1)
      .join(".")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");

    const uniqueName =
      fileNameWithoutExtension +
      "-" +
      Math.random().toString(36).substring(2) +
      "-" +
      Date.now() +
      "-";
    const folder = extension === "pdf" ? "pdfs" : "images";

    return {
      folder: `healthcare/${folder}`,
      public_id: uniqueName,
      resource_type: "auto",
    };
  },
});

export const multer_upload = multer({ storage });
