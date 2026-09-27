import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

interface ParentEmailData {
  recipient: string;
  parentName: string;
  mentorName: string;
  date: string;
  time: string;
  parentTimezone: string;
  meetingLink: string;
}

interface MentorEmailData {
  recipient: string;
  mentorName: string;
  studentName: string;
  studentEmail: string;
  date: string;
  mentorLocalTime: string;
  mentorTimezone: string;
  meetingLink: string;
}

let cachedTransporter: Transporter | null | undefined;

const getTransporter = (): Transporter | null => {
  if (cachedTransporter !== undefined) {
    return cachedTransporter;
  }

  const smtpConfigured =
    Boolean(process.env.SMTP_HOST) &&
    Boolean(process.env.SMTP_USER) &&
    Boolean(process.env.SMTP_PASSWORD);

  cachedTransporter = smtpConfigured
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      })
    : null;

  return cachedTransporter;
};

/**
 * Confirmation email sent to the PARENT after a
 * successful booking.
 */
export const sendParentConfirmationEmail = async (
  data: ParentEmailData
): Promise<void> => {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[DEV] Parent email skipped → ${data.recipient}`);
    console.log(`[DEV] Trial class: ${data.date} at ${data.time} (${data.parentTimezone})`);
    console.log(`[DEV] Meeting link: ${data.meetingLink}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: data.recipient,
    subject: "Your Codeyoung Trial Class is Confirmed",
    text: `
Hello ${data.parentName},

Your Codeyoung trial class has been confirmed.

Mentor: ${data.mentorName}
Date: ${data.date}
Time: ${data.time}
Timezone: ${data.parentTimezone}

Join your trial class:
${data.meetingLink}

This is a simulated demo meeting link created for the Codeyoung
recruitment assignment.

Regards,
Codeyoung Trial Booking System
    `.trim(),
  });
};

/**
 * Assignment notification email sent to the MENTOR
 * when they are assigned a new trial class.
 */
export const sendMentorAssignmentEmail = async (
  data: MentorEmailData
): Promise<void> => {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[DEV] Mentor email skipped → ${data.recipient}`);
    console.log(`[DEV] New assignment: ${data.studentName} on ${data.date} at ${data.mentorLocalTime}`);
    console.log(`[DEV] Meeting link: ${data.meetingLink}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: data.recipient,
    subject: "New Codeyoung Trial Class Assigned",
    text: `
Hello ${data.mentorName},

You have been assigned a new Codeyoung trial class.

Student: ${data.studentName}
Student email: ${data.studentEmail}
Date: ${data.date}
Your local time: ${data.mentorLocalTime}
Timezone: ${data.mentorTimezone}

Join the trial class:
${data.meetingLink}

This is a simulated demo meeting link created for the Codeyoung
recruitment assignment.

Regards,
Codeyoung Trial Booking System
    `.trim(),
  });
};
