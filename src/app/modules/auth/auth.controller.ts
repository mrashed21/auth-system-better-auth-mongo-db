import catch_async from "@/app/helper/catch-async";
import send_response from "@/app/helper/send-response";
import { Request, Response } from "express";
import status from "http-status";
import { auth_service } from "./auth.service";

export const auth_controller = {
  //! register
  register: catch_async(async (req: Request, res: Response) => {
    const result = await auth_service.register(req.body);
    send_response(res, {
      status_code: status.OK,
      success: true,
      message: "Users retrieved successfully",
      data: result,
    });
  }),

  get_all_users: catch_async(async (req: Request, res: Response) => {
    const result = await auth_service.get_all_users();
    send_response(res, {
      status_code: status.OK,
      success: true,
      message: "Users retrieved successfully",
      data: result,
    });
  }),
};
