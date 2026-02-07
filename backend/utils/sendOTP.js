// This file contains utility functions for sending OTP via Email and SMS
// You'll need to configure your email service (Gmail, SendGrid, etc.) and SMS service (Twilio, etc.)

import { createTransport } from "nodemailer";
import twilio from "twilio";

// Email configuration
const createEmailTransporter = () => {
  // For production, use actual SMTP credentials
  // For development, you can use services like Mailtrap, Gmail, or SendGrid
  
  return createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASSWORD, // Your email password or app password
    },
  });
};

// Send OTP via Email
export async function sendOTPEmail(email, otp, name) {
  try {
    const transporter = createEmailTransporter();

    const mailOptions = {
      from: `"Grievance Portal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your OTP for Grievance Portal',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 50px auto;
              background-color: #ffffff;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              width: 80px;
              height: 80px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 16px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin: 0;
              font-size: 24px;
            }
            .otp-box {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 25px;
              border-radius: 10px;
              text-align: center;
              margin: 30px 0;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 8px;
              margin: 10px 0;
            }
            .message {
              color: #666;
              line-height: 1.6;
              margin: 20px 0;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              color: #856404;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #999;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">⚖️</div>
              <h1>Grievance Portal</h1>
            </div>
            
            <p class="message">Hello ${name},</p>
            <p class="message">Your One-Time Password (OTP) for verification is:</p>
            
            <div class="otp-box">
              <div>Your OTP Code</div>
              <div class="otp-code">${otp}</div>
              <div style="font-size: 14px; margin-top: 10px;">Valid for 15 minutes</div>
            </div>
            
            <p class="message">
              Please enter this code to complete your verification. 
              This OTP will expire in 15 minutes.
            </p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> Never share this OTP with anyone. 
              Our team will never ask for your OTP.
            </div>
            
            <p class="message">
              If you didn't request this OTP, please ignore this email or contact our support team.
            </p>
            
            <div class="footer">
              <p>© 2026 Grievance Portal. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw error - we don't want to fail the entire request if email fails
    return { success: false, error: error.message };
  }
}

// Send OTP via SMS (using Twilio or similar service)
const formatPhoneE164 = (phone) => {
  if (!phone) return phone;
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return trimmed;
  const countryCode = process.env.TWILIO_COUNTRY_CODE || "+91";
  return `${countryCode}${trimmed}`;
};

const getTwilioClient = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
};

export async function sendOTPSMS(phone, otp) {
  try {
    const client = getTwilioClient();
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!client || !from) {
      // Fallback for development/testing
      console.log(`SMS OTP for ${phone}: ${otp}`);
      return { success: true, note: "SMS service not configured" };
    }

    const message = await client.messages.create({
      body: `Your Grievance Portal OTP is: ${otp}. Valid for 15 minutes. Do not share this with anyone.`,
      from,
      to: formatPhoneE164(phone),
    });

    console.log("SMS sent successfully:", message.sid);
    return { success: true, messageSid: message.sid };
  } catch (error) {
    console.error("Error sending SMS:", error);
    return { success: false, error: error.message };
  }
}

// Send welcome email after successful registration
export async function sendWelcomeEmail(email, name) {
  try {
    const transporter = createEmailTransporter();

    const mailOptions = {
      from: `"Grievance Portal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Grievance Portal!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 50px auto;
              background-color: #ffffff;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              width: 80px;
              height: 80px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 16px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin: 0;
              font-size: 28px;
            }
            .message {
              color: #666;
              line-height: 1.8;
              margin: 20px 0;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px 40px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              margin: 20px 0;
            }
            .features {
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .feature-item {
              margin: 10px 0;
              padding-left: 25px;
              position: relative;
            }
            .feature-item:before {
              content: "✓";
              position: absolute;
              left: 0;
              color: #667eea;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #999;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">⚖️</div>
              <h1>Welcome to Grievance Portal!</h1>
            </div>
            
            <p class="message">Dear ${name},</p>
            <p class="message">
              Thank you for registering with Grievance Portal. Your account has been successfully created 
              and verified. We're excited to have you onboard!
            </p>
            
            <div class="features">
              <h3>What you can do now:</h3>
              <div class="feature-item">File and track grievances easily</div>
              <div class="feature-item">Get real-time updates on your complaints</div>
              <div class="feature-item">View resolution history and status</div>
              <div class="feature-item">Communicate directly with assigned officers</div>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/dashboard" class="cta-button">
                Go to Dashboard
              </a>
            </div>
            
            <p class="message">
              If you have any questions or need assistance, please don't hesitate to contact our support team.
            </p>
            
            <div class="footer">
              <p>© 2026 Grievance Portal. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully');

  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
}
