const mongoose = require("mongoose");

const mailSender = require("../utils/mailSender");
const emailTemplate = require("../mail/templates/emailVerificationTemplate");

const OTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
    expires: 60 * 5, // The document will be automatically deleted after 5 minutes of its creation time
  },
});

// Function to send verification email
async function sendVerificationEmail(email, otp) {
  try {
    const mailResponse = await mailSender(
      email,
      "Verification Email from StudyNotion",
      emailTemplate(otp)
    );

    console.log("Verification mail sent Successfully", mailResponse);
  } catch (error) {
    console.log("Error occurred while sending verification mail.", error);
    throw error;
  }
}

// Define a post-save hook to send email after the document has been saved
OTPSchema.pre("save", async function (next) {
  console.log("New document saved to database");

  // Only send an email when a new document is created
  if (this.isNew) {
    await sendVerificationEmail(this.email, this.otp);
  }
  next();
});

module.exports = mongoose.model("OTP", OTPSchema);
