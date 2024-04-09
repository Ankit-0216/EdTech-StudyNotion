const User = require("../models/User");
const mailSender = require("../utils/mailSender");

const bcrypt = require("bcrypt");
const { randomBytes } = require("node:crypto");

// resetPasswordToken
exports.resetPasswordToken = async (req, res) => {
  try {
    // Get email from req body
    const email = req.body.email;

    // Check user for this email, ermail validation
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: `The email ${email} is not Registered With Us, Please enter a Valid Email `,
      });
    }

    // Generate token
    const token = randomBytes(20).toString("hex");

    // Update user by adding token and expiration time
    const updatedDetails = await User.findOneAndUpdate(
      {
        email: email,
      },
      {
        token: token,
        resetPasswordExpires: Date.now() + 3600000,
      },
      { new: true }
    );
    console.log("DETAILS: ", updatedDetails);

    // Create Url
    const url = `http://localhost:3000/update-password/${token}`;

    // Send mail containing the Url
    await mailSender(
      email,
      "Password Reset Link",
      `Your Link for email verification is ${url}. Please click this url to reset your password.`
    );

    // Response is returned
    return res.status(200).json({
      success: true,
      message:
        "Email sent successfully. Please check your email and change the password",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while sending Reset passord email",
      error: error.message,
    });
  }
};

// resetPassword
exports.resetPassword = async (req, res) => {
  try {
    // Data is fetched
    const { password, confirmPassword, token } = req.body;

    // Validation
    if (password !== confirmPassword) {
      return res.status(401).json({
        success: false,
        message:
          "Password and Confirm password doesn't match. Please try again",
      });
    }

    // Get user details from db using token
    const userDetails = await User.findOne({ token: token });

    // Check if token is valid or not
    if (!userDetails) {
      return res.status(401).json({
        success: false,
        message: "Token is Invalid.",
      });
    }

    // Check time of the token
    if (!(userDetails.resetPasswordExpires > Date.now())) {
      return res.status(403).json({
        success: false,
        message: "Token is expired. Please regenerate your token.",
      });
    }

    // Hash the password
    const encryptedPassword = await bcrypt.hash(password, 10);

    // Update the password
    await User.findOneAndUpdate(
      { token: token },
      { password: encryptedPassword },
      { new: true }
    );

    // Response is returned
    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error occurred while Password was being reset.",
    });
  }
};
