import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import status from "http-status";
import api_error from "../helper/api-error";
import { env_config } from "./env-config";

cloudinary.config({
  cloud_name: env_config.CLOUDINARY_CLOUD_NAME,
  api_key: env_config.CLOUDINARY_API_KEY,
  api_secret: env_config.CLOUDINARY_API_SECRET,
});

export const upload_file = async (
  buffer: Buffer,
  fileName: string,
): Promise<UploadApiResponse> => {
  if (!buffer || !fileName) {
    throw new api_error(
      status.BAD_REQUEST,
      "File buffer and file name are required for upload",
    );
  }

  const extension = fileName.split(".").pop()?.toLocaleLowerCase();

  const fileNameWithoutExtension = fileName
    .split(".")
    .slice(0, -1)
    .join(".")
    .toLowerCase()
    .replace(/\s+/g, "-")
    // eslint-disable-next-line no-useless-escape
    .replace(/[^a-z0-9\-]/g, "");

  const uniqueName =
    Math.random().toString(36).substring(2) +
    "-" +
    Date.now() +
    "-" +
    fileNameWithoutExtension;

  const folder = extension === "pdf" ? "pdfs" : "images";

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: "auto",
          public_id: `auth-system/${folder}/${uniqueName}`,
          folder: `auth-system/${folder}`,
        },
        (error, result) => {
          if (error) {
            return reject(
              new api_error(
                status.INTERNAL_SERVER_ERROR,
                "Failed to upload file to Cloudinary",
              ),
            );
          }
          resolve(result as UploadApiResponse);
        },
      )
      .end(buffer);
  });
};

export const delete_file = async (url: string) => {
  try {
    const regex = /\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/;
    const match = url.match(regex);

    if (!match?.[1]) return;

    const publicId = match[1];

    let resourceType: "image" | "raw" = "image";

    if (url.includes("/raw/upload/")) {
      resourceType = "raw";
    }

    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    console.log(`Deleted: ${publicId}`);
  } catch (error) {
    console.error(error);
    throw new api_error(
      status.INTERNAL_SERVER_ERROR,
      "Failed to delete file from Cloudinary",
    );
  }
};

export const cloudinary_upload = cloudinary;
