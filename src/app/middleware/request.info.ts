import { Request } from "express";
import { UAParser } from "ua-parser-js";

export const get_request_info = (req: Request) => {
  // ! ip address
  const request_ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.socket.remoteAddress ||
    req.ip ||
    "unknown";

  // ! user agent
  const user_agent = req.headers["user-agent"] || "";

  // ! parser
  const parser = new UAParser(user_agent);

  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  return {
    request_ip,
    request_device: {
      browser: `${browser.name || "unknown"} ${browser.version || ""}`,
      os: `${os.name || "unknown"} ${os.version || ""}`,
      device_type: device.type || "desktop",
      device_vendor: device.vendor || "",
      device_model: device.model || "",
    },
    user_agent,
  };
};
