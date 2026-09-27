import crypto from "crypto";

export const generateMeetingLink = (): string => {
  const meetingId = crypto.randomBytes(8).toString("hex");

  const frontendUrl =
    process.env.FRONTEND_URL || "http://localhost:5173";

  return `${frontendUrl}/meeting/${meetingId}`;
};