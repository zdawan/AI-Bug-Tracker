import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, text, html = null) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email delivery is not configured.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Bug Tracker" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  };

  return transporter.sendMail(mailOptions);
};
