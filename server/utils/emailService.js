import nodemailer from 'nodemailer';

// Helper to create nodemailer transporter
function getTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Sends a 6-digit OTP code to the user's Gmail/Email address.
 * Falls back gracefully to console logging if EMAIL_USER/EMAIL_PASS are not configured yet.
 */
export async function sendOtpEmail(toEmail, otp, userName = 'PrepAI User') {
  const transporter = getTransporter();

  // If email credentials are not yet configured in .env, log to console for instant local development
  if (!transporter) {
    console.log('\n======================================================');
    console.log(`✉️  [EMAIL SERVICE - DEV MODE] Email credentials not set in .env`);
    console.log(`🔐 OTP for: ${toEmail} (${userName})`);
    console.log(`🔑 Verification Code: [ ${otp} ] (Valid for 5 minutes)`);
    console.log(`👉 Configure EMAIL_USER and EMAIL_PASS in .env for live Gmail delivery`);
    console.log('======================================================\n');
    return {
      sent: false,
      devMode: true,
      message: 'Email credentials not configured in .env; OTP logged to server console.',
    };
  }

  const mailOptions = {
    from: `"PrepAI Security" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Your PrepAI Verification Code: ${otp}`,
    text: `Hello ${userName},\n\nYour PrepAI one-time login verification code is: ${otp}\n\nThis code will expire in 5 minutes. Do not share this code with anyone.\n\nBest regards,\nThe PrepAI Team`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 14px; background-color: #ffffff; color: #1f2937;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; width: 54px; height: 54px; line-height: 54px; border-radius: 14px; font-size: 26px; font-weight: bold;">
            ⚡
          </div>
          <h2 style="margin: 12px 0 4px; color: #111827; font-size: 22px; font-weight: 700;">PrepAI Login Verification</h2>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">AI-Powered Placement & Interview Preparation</p>
        </div>

        <p style="font-size: 15px; line-height: 1.6; color: #374151; margin-bottom: 18px;">
          Hello <strong>${userName}</strong>,
        </p>

        <p style="font-size: 15px; line-height: 1.6; color: #374151; margin-bottom: 24px;">
          Use the following 6-digit One-Time Password (OTP) to securely complete your sign-in to PrepAI:
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background: #f0f4ff; border: 2px dashed #6366f1; border-radius: 12px; padding: 16px 32px; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #4338ca;">
            ${otp}
          </div>
          <p style="color: #ef4444; font-size: 13px; font-weight: 600; margin-top: 10px;">
            ⏱️ Valid for 5 minutes only
          </p>
        </div>

        <div style="background-color: #f9fafb; border-left: 4px solid #6366f1; padding: 12px 16px; border-radius: 6px; margin: 24px 0;">
          <p style="margin: 0; font-size: 13px; color: #4b5563; line-height: 1.5;">
            🔒 <strong>Security Warning:</strong> PrepAI will never ask you for your verification code. If you did not initiate this login request, please change your password immediately.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

        <p style="text-align: center; font-size: 12px; color: #9ca3af; margin: 0;">
          &copy; ${new Date().getFullYear()} PrepAI Platform. All rights reserved.
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`🚀 [EMAIL SENT] OTP delivered to ${toEmail}. MessageId: ${info.messageId}`);
    return { sent: true, devMode: false, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [EMAIL ERROR] Failed to send email to ${toEmail}:`, err.message);
    // Even if sending fails, log OTP to console as fallback so the user can test during dev
    console.log(`🔐 [FALLBACK CONSOLE OTP] Code for ${toEmail}: [ ${otp} ]`);
    return {
      sent: false,
      devMode: true,
      error: err.message,
      message: 'Failed to send email via SMTP; fallback OTP printed to console.',
    };
  }
}
