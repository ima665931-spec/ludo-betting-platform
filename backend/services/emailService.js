const nodemailer = require('nodemailer');

// Gmail transporter using app password
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

class EmailService {
    static async sendOTP(toEmail, otp, username) {
        try {
            const mailOptions = {
                from: `"Ludo Battle" <${process.env.EMAIL_USER}>`,
                to: toEmail,
                subject: 'Ludo Battle — Verify Your Email',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 30px; background: #1a1a2e; border-radius: 15px;">
                        <h1 style="color: #f7971e; text-align: center;">🎲 Ludo Battle</h1>
                        <h2 style="color: white; text-align: center;">Email Verification</h2>
                        <p style="color: #ccc; text-align: center;">Hi ${username},</p>
                        <p style="color: #ccc; text-align: center;">Your verification code is:</p>
                        <div style="text-align: center; margin: 25px 0;">
                            <span style="font-size: 2.5rem; font-weight: bold; color: #f7971e; letter-spacing: 8px; background: rgba(255,255,255,0.1); padding: 15px 30px; border-radius: 10px;">
                                ${otp}
                            </span>
                        </div>
                        <p style="color: #999; text-align: center; font-size: 0.85rem;">
                            This code expires in 10 minutes.<br>
                            If you didn't create an account, ignore this email.
                        </p>
                    </div>
                `,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('OTP email sent:', info.messageId);
            return { success: true };
        } catch (err) {
            console.error('Email send error:', err.message);
            return { success: false, error: err.message };
        }
    }
}

module.exports = EmailService;
