import ejs from "ejs";
import status from "http-status";
import nodemailder from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import path from "path";
import { env_config } from "../config/env-config";
import api_error from "../helper/api-error";

const transporter = nodemailder.createTransport({
  host: env_config.EMAIL_SENDER_SMTP_HOST,
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: env_config.EMAIL_SENDER_SMTP_USER,
    pass: env_config.EMAIL_SENDER_SMT_PASS,
  },
  family: 4,
} as SMTPTransport.Options);

// এটা যোগ করুন
transporter.verify((error, success) => {
  if (error) {
    console.log("SMTP Connection Failed:", error);
  } else {
    console.log("SMTP Server Ready:", success);
  }
});
// dn7q0rd8l1xlzdhi3nr4685cg

interface SendEmailOptions {
  to: string;
  subject: string;
  templateName?: string;
  templateData?: Record<string, any>;
  html?: string;
  text?: string;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType: string;
  }[];
}

export const send_email = async ({
  subject,
  templateData,
  templateName,
  to,
  html,
  text,
  attachments,
}: SendEmailOptions) => {
  try {
    const renderedHtml = html
      ? html
      : templateName
        ? await ejs.renderFile(
            path.resolve(process.cwd(), `src/templates/${templateName}.ejs`),
            templateData || {},
          )
        : undefined;

    const info = await transporter.sendMail({
      from: env_config.EMAIL_SENDER_SMTP_FROM,
      to: to,
      subject: subject,
      html: renderedHtml,
      text,
      attachments: attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      })),
    });

    console.log(`Email sent to ${to} : ${info.messageId}`);
  } catch (error: any) {
    console.log("Email Sending Error", error.message);
    throw new api_error(status.INTERNAL_SERVER_ERROR, "Failed to send email");
  }
};
