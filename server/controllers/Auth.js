const otpGenerator = require("otp-generator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("../models/User");
const OTP = require("../models/OTP");
const Profile = require("../models/Profile");
const mailSender = require("../utils/mailSender");
const { passwordUpdated } = require("../mail/templates/passwordUpdate");

// Send OTP For Email Verification ---------------->
exports.sendOTP = async (req, res) => {
  try {
    // Email is fetched from body
    const { email } = req.body;

    // Check if user already exists
    const checkUserPresent = await User.findOne({ email });

    // If user already exists, then response is returned
    if (checkUserPresent) {
      return res.status(401).json({
        success: false,
        message: "User is already Registered",
      });
    }

    // Generate the OTP
    var otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });
    console.log("OTP is generate", otp);

    // Check unique OTP or not
    const result = await OTP.findOne({ otp: otp });

    while (result) {
      otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
      });
    }

    const otpPayload = { email, otp };

    // Create an entry for OTP
    const otpBody = await OTP.create(otpPayload);
    console.log("OTP Body", otpBody);

    // Return success response
    return res.status(200).json({
      success: true,
      message: "OTP sent Successfully",
      otp,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// SignUp Controller for Registering Users -------->
exports.signUp = async (req, res) => {
  try {
    // Data is fetched from request body
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      accountType,
      contactNumber,
      otp,
    } = req.body;

    // Data is validated
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !confirmPassword ||
      !otp
    ) {
      return res.status(403).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Both passwords are matched
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Password and ConfirmPassword does not match, please try again!!",
      });
    }

    // Check User already exists or not
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User is already registered. Please sign in to continue.",
      });
    }

    // Find the most recent OTP stored for the user
    const recentOtp = await OTP.find({ email })
      .sort({ createdAt: -1 })
      .limit(1);

    console.log("Recent OTP - ", recentOtp);

    // Validate the OTP
    if (recentOtp.length === 0) {
      // OTP not found
      return res.status(400).json({
        success: false,
        message: "OTP not found",
      });
    } else if (otp !== recentOtp[0].otp) {
      console.log("Recent OTP--> ", recentOtp[0].otp);
      // Invalid OTP
      return res.status(403).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    let approved = "";
    approved === "Instructor" ? (approved = false) : (approved = true);

    // Create the Additional Profile For User
    const profileDetails = await Profile.create({
      gender: null,
      dateOfBirth: null,
      about: null,
      contactNumber: null,
    });

    const user = await User.create({
      firstName,
      lastName,
      email,
      contactNumber,
      password: hashedPassword,
      accountType,
      additionalDetails: profileDetails._id,
      image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName}%20${lastName}`,
    });

    // Response is returned
    return res.status(200).json({
      success: true,
      message: "User is registered Successfully",
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "User cannot be registered. Please try again.",
    });
  }
};

// Login controller for authenticating users ------>
exports.login = async (req, res) => {
  try {
    // Get data from body
    const { email, password } = req.body;

    // Check if email or password is missing
    if (!email || !password) {
      return res.status(403).json({
        success: false,
        message: "Please Fill up All the Required Fields",
      });
    }

    // Check if user already exist or not
    const user = await User.findOne({ email }).populate("additionalDetails");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: " User is not registeredwith Us Please SignUp to Continue",
      });
    }

    // Generate JWT and Compare Password
    if (await bcrypt.compare(password, user.password)) {
      const token = jwt.sign(
        { email: user.email, id: user._id, accountType: user.accountType },
        process.env.JWT_SECRET,
        {
          expiresIn: "24h",
        }
      );

      // Save token to user document in database
      user.token = token;
      user.password = undefined;

      // Create cookie for token and send success response
      const options = {
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        httpOnly: true,
      };

      res.cookie("token", token, options).status(200).json({
        success: true,
        token,
        user,
        message: "User logged in successfully",
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Password is incorrect",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Login Failure, Please try again",
    });
  }
};

// Change Password -------------------------------->
exports.changePassword = async (req, res) => {
  try {
    // Get data from request user
    const userDetails = await User.findById(req.user.id);

    // Get oldPassword, newPassword, confirmNewPassword
    const { oldPassword, newPassword, confirmNewPassword } = req.body;

    // Validate old password
    const isPasswordMatch = await bcrypt.compare(
      oldPassword,
      userDetails.password
    );

    if (!isPasswordMatch) {
      // If old password does not match, return a 401 (Unauthorized) error
      return res.status(401).json({
        success: false,
        message: "The password is incorrect",
      });
    }

    // Match new password and confirm new password
    if (newPassword !== confirmNewPassword) {
      // If new password and confirm new password do not match, return a 400 (Bad Request) error
      return res.status(400).json({
        success: false,
        message: "The password and confirm password does not match",
      });
    }

    // Update password in DB
    const encryptedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUserDetails = await User.findByIdAndUpdate(
      req.user.id,
      { password: encryptedPassword },
      { new: true }
    );

    // Send notification email that password is Updated
    try {
      const emailResponse = await mailSender(
        updatedUserDetails.email,
        passwordUpdated(
          updatedUserDetails.email,
          `Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
        )
      );
      console.log("Email sent successfully:", emailResponse.response);
    } catch (error) {
      // If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
      console.error("Error occurred while sending email:", error);
      return res.status(500).json({
        success: false,
        message: "Error occurred while sending email",
        error: error.message,
      });
    }

    // Response is returned
    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error occurred while updating password:", error);
    return res.status(500).json({
      success: false,
      message: "Error occurred while updating password",
      error: error.message,
    });
  }
};
