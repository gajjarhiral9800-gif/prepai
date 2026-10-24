import nodemailer from 'nodemailer';

/**
 * Brevo (Sendinblue) Transactional Email Sender via HTTPS REST API
 * Bypasses cloud SMTP blocking on Render / Netlify.
 */
async function sendViaBrevo({ toEmail, otp, userName, htmlContent, textContent }) {
  const apiKey = (process.env.BREVO_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || '').trim().replace(/^['"]|['"]$/g, '');
  const senderName = process.env.BREVO_SENDER_NAME || 'PrepAI Security';

  if (!apiKey || !senderEmail) {
    return null;
  }

  // Check if user accidentally pasted an SMTP key (starts with xsmtpsib-) instead of an API Key (starts with xkeysib-)
  if (apiKey.startsWith('xsmtpsib-')) {
    throw new Error("You used an SMTP Key (starts with 'xsmtpsib-'). In Brevo, go to 'SMTP & API' -> click the 'API Keys' tab (next to SMTP) -> click 'Generate a new API key' (starts with 'xkeysib-').");
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail.trim(),
      },
      to: [
        {
          email: toEmail.trim(),
          name: userName || 'PrepAI User',
        },
      ],
      subject: `Your PrepAI Verification Code: ${otp}`,
      htmlContent,
      textContent,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorDetails = data.message || data.code || `HTTP ${response.status}`;
    throw new Error(`Brevo API Error (${response.status}): ${errorDetails}`);
  }

  return { messageId: data.messageId || 'sent_via_brevo' };
}

// Helper to create nodemailer transporter (fallback if EMAIL_USER/EMAIL_PASS are configured)
function getNodemailerTransporter() {
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
 * Sends a 6-digit OTP code to the user's email address.
 * Primary Provider: Brevo REST API (HTTPS port 443 - 100% reliable on Render/Netlify)
 * Fallback 1: Nodemailer (if EMAIL_USER & EMAIL_PASS provided)
 * Fallback 2: Server console log (for local testing when credentials are not yet set)
 */
export async function sendOtpEmail(toEmail, otp, userName = 'PrepAI User') {
  const textContent = `Hello ${userName},\n\nYour PrepAI verification code is: ${otp}\n\nThis code is valid for 5 minutes. Do not share this code with anyone.\n\nBest regards,\nThe PrepAI Team`;

  const htmlContent = `
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
        Use the following 6-digit One-Time Password (OTP) to securely complete your verification on PrepAI:
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
          🔒 <strong>Security Warning:</strong> PrepAI will never ask you for your verification code. If you did not initiate this request, please ignore this email or change your password.
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

      <p style="text-align: center; font-size: 12px; color: #9ca3af; margin: 0;">
        &copy; ${new Date().getFullYear()} PrepAI Platform. All rights reserved.
      </p>
    </div>
  `;

  // 1. Check if Brevo is configured (Primary recommendation for Render)
  if (process.env.BREVO_API_KEY) {
    try {
      const result = await sendViaBrevo({ toEmail, otp, userName, htmlContent, textContent });
      console.log(`🚀 [BREVO SUCCESS] OTP email sent to ${toEmail}. MessageId: ${result.messageId}`);
      return { sent: true, provider: 'brevo', messageId: result.messageId };
    } catch (err) {
      console.error(`❌ [BREVO ERROR] Failed to send email to ${toEmail}:`, err.message);
      console.log(`🔐 [FALLBACK CONSOLE OTP] Code for ${toEmail}: [ ${otp} ]`);
      return {
        sent: false,
        devMode: true,
        error: err.message,
        message: `Brevo failed: ${err.message}. Fallback code logged to console.`,
      };
    }
  }

  // 2. Check if legacy Nodemailer SMTP is configured
  const transporter = getNodemailerTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"PrepAI Security" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `Your PrepAI Verification Code: ${otp}`,
        text: textContent,
        html: htmlContent,
      });
      console.log(`🚀 [NODEMAILER SUCCESS] OTP sent to ${toEmail}. MessageId: ${info.messageId}`);
      return { sent: true, provider: 'nodemailer', messageId: info.messageId };
    } catch (err) {
      console.error(`❌ [NODEMAILER ERROR] Failed to send email to ${toEmail}:`, err.message);
      console.log(`🔐 [FALLBACK CONSOLE OTP] Code for ${toEmail}: [ ${otp} ]`);
      return {
        sent: false,
        devMode: true,
        error: err.message,
        message: `SMTP failed: ${err.message}. Fallback code logged to console.`,
      };
    }
  }

  // 3. Fallback when neither Brevo nor Nodemailer are configured
  console.log('\n======================================================');
  console.log(`✉️  [EMAIL SERVICE - DEV MODE] Email credentials not configured`);
  console.log(`🔐 OTP for: ${toEmail} (${userName})`);
  console.log(`🔑 Verification Code: [ ${otp} ] (Valid for 5 minutes)`);
  console.log(`👉 Add BREVO_API_KEY and BREVO_SENDER_EMAIL to .env and Render to send live emails`);
  console.log('======================================================\n');

  return {
    sent: false,
    devMode: true,
    message: 'Email credentials not configured in environment; OTP logged to server console.',
  };
}
