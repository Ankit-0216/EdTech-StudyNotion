const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("../models/User");

// auth ---------------------------------------->
exports.auth = async (req, res, next) => {
  try {
    // Extract token
    const token =
      req.cookies.token ||
      req.body.token ||
      req.header("Authorization").replace("Bearer ", "");

    // If token is missing response is returned
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "JWT Token is missing",
      });
    }

    // Verify the Token
    try {
      const decode = jwt.verify(token, process.env.JWT_SECRET);
      console.log(decode);
      req.user = decode;
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Token is Invalid",
      });
    }
    next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while validating the Token!!!",
    });
  }
};

// isStudent ---------------------------------------->
exports.isStudent = async (req, res, next) => {
  try {
    if (req.user.accountType !== "Student") {
      return res.status(401).json({
        success: false,
        message: "This is a protected route for Students only",
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "User role cannot be verified for Student. Please try again",
    });
  }
};

// isInstructor ---------------------------------------->
exports.isInstructor = async (req, res, next) => {
  try {
    if (req.user.accountType !== "Instructor") {
      return res.status(401).json({
        success: false,
        message: "This is a protected route for Instructor only",
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "User role cannot be verified for Instructor. Please try again",
    });
  }
};

// isAdmin ---------------------------------------->
exports.isAdmin = async (req, res, next) => {
  try {
    console.log("Account Type-->", req.user.accountType);
    if (req.user.accountType !== "Admin") {
      return res.status(401).json({
        success: false,
        message: "This is a protected route for Admin only",
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "User role cannot be verified for Admin. Please try again",
    });
  }
};
