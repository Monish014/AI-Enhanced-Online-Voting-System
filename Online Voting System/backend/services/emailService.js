const nodemailer = require('nodemailer');

let transporter = null;
let testAccountUrl = null;

/**
 * Initialise transporter.
 * - If EMAIL_USER + EMAIL_PASS are set → use Gmail SMTP
 * - Otherwise → create a free Ethereal test account automatically
 *   (emails are caught and viewable at https://ethereal.email)
 */
const initTransporter = async () => {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS &&
      process.env.EMAIL_PASS !== 'your_gmail_app_password_here') {
    // Real Gmail
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    console.log('[Email] Using Gmail SMTP');
  } else {
    // Auto-create a free Ethereal test account
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      testAccountUrl = `https://ethereal.email/login — user: ${testAccount.user} / pass: ${testAccount.pass}`;
      console.log('[Email] Using Ethereal test account');
      console.log(`[Email] Preview URL: ${testAccountUrl}`);
    } catch (err) {
      console.warn('[Email] Could not create Ethereal account:', err.message);
    }
  }
};

/**
 * Sends an OTP email.
 * In dev mode, always prints the OTP to the console as a fallback.
 */
const sendOtpEmail = async ({ to, name, otp }) => {
  // Always log OTP to console in development — instant fallback
  console.log(`\n${'='.repeat(50)}`);
  console.log(`[OTP] Email: ${to}`);
  console.log(`[OTP] Code:  ${otp}`);
  console.log(`${'='.repeat(50)}\n`);

  if (!transporter) {
    await initTransporter();
  }

  if (!transporter) {
    console.warn('[Email] No transporter — OTP only shown in console above');
    return { success: false };
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"VoteAI" <${process.env.EMAIL_USER || 'noreply@voteai.dev'}>`,
    to,
    subject: 'Your VoteAI Verification Code',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
        <div style="background:#1d4ed8;padding:20px 24px;border-radius:8px;margin-bottom:24px;">
          <h1 style="color:white;margin:0;font-size:24px;">VoteAI</h1>
          <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px;">Secure Online Voting Platform</p>
        </div>
        <h2 style="color:#1e293b;margin-bottom:8px;">Hello, ${name}!</h2>
        <p style="color:#475569;margin-bottom:24px;">Your One-Time Password for account verification:</p>
        <div style="background:white;border:2px solid #2563eb;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#1d4ed8;margin:0;font-family:monospace;">${otp}</p>
        </div>
        <p style="color:#64748b;font-size:13px;">⏱ Expires in <strong>10 minutes</strong>. Never share this code.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      console.log(`[Email] Preview link (Ethereal): ${preview}`);
    } else {
      console.log(`[Email] Sent to ${to} — ID: ${info.messageId}`);
    }
    return { success: true, preview };
  } catch (err) {
    console.error(`[Email] Send failed: ${err.message}`);
    return { success: false, error: err.message };
  }
};

const verifyEmailConfig = async () => {
  await initTransporter();
  if (transporter) {
    try {
      await transporter.verify();
      console.log('[Email] SMTP connection verified ✓');
    } catch (err) {
      console.warn(`[Email] SMTP verify warning: ${err.message}`);
    }
  }
};

module.exports = { sendOtpEmail, verifyEmailConfig };
