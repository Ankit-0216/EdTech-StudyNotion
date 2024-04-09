const Profile = require("../models/Profile");
const User = require("../models/User");
const Course = require("../models/Course");
const CourseProgress = require("../models/CourseProgress");
const { uploadImageToCloudinary } = require("../utils/imageUploader");
const { convertSecondsToDuration } = require("../utils/secToDuration");

// Update Profile ---------------------------------------->
exports.updateProfile = async (req, res) => {
  try {
    // Data fetch
    const { dateOfBirth = "", about = "", contactNumber, gender } = req.body;

    // Get userId
    const id = req.user.id;

    // // Data validation
    // if (!contactNumber || !gender || !id) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "All fields are required",
    //   });
    // }

    // Find profile
    const userDetails = await User.findById(id);
    const profileId = userDetails.additionalDetails;
    const profile = await Profile.findById(profileId);

    // console.log("userDetails-->", userDetails);
    // conole.log("profileId-->", profileId);
    // console.log("profile-->", profile);

    // Update profile
    profile.dateOfBirth = dateOfBirth;
    profile.about = about;
    profile.gender = gender;
    profile.contactNumber = contactNumber;

    // Save the updated profile
    await profile.save();

    // Response is returned
    return res.status(200).json({
      success: true,
      message: "Profile details updated Successfully",
      profile,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to update profile, please try again.",
      error: error.message,
    });
  }
};

// Delete Account ---------------------------------------->
exports.deleteAccount = async (req, res) => {
  try {
    // Get Id
    const id = req.user.id;

    // Validate Id
    const userDetails = await User.findById({ _id: id });

    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "User not Found!!",
      });
    }

    // Delete Profile
    await Profile.findByIdAndDelete({ _id: userDetails.additionalDetails });

    // Delete User
    await User.findByIdAndDelete({ _id: id });

    // TODO: Unenroll user from enrolled courses

    // Response is returned
    return res.status(200).json({
      success: true,
      message: "User's account deleted Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to delete User, please try again.",
      error: error.message,
    });
  }
};

// Get All User Details ---------------------------------------->
exports.getAllUserDetails = async (req, res) => {
  try {
    const id = req.user.id;
    const userDetails = await User.findById(id)
      .populate("additionalDetails")
      .exec();

    // console.log(userDetails);

    res.status(200).json({
      success: true,
      message: "User Data fetched successfully",
      data: userDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Display Picture ---------------------------------------->
exports.updateDisplayPicture = async (req, res) => {
  try {
    const displayPicture = req.files.displayPicture;
    const userId = req.user.id;
    const image = await uploadImageToCloudinary(
      displayPicture,
      process.env.FOLDER_NAME,
      1000,
      1000
    );
    console.log(image);
    const updatedProfile = await User.findByIdAndUpdate(
      { _id: userId },
      { image: image.secure_url },
      { new: true }
    );
    res.send({
      success: true,
      message: `Image Updated successfully`,
      data: updatedProfile,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Enrolled Courses ---------------------------------------->
exports.getEnrolledCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    let userDetails = await User.findOne({
      _id: userId,
    })
      .populate({
        path: "courses",
        populate: {
          path: "courseContent",
          populate: {
            path: "subSection",
          },
        },
      })
      .exec();

    userDetails = userDetails.toObject();
    var SubsectionLength = 0;
    for (var i = 0; i < userDetails.courses.length; i++) {
      let totalDurationInSeconds = 0;
      SubsectionLength = 0;
      for (var j = 0; j < userDetails.courses[i].courseContent.length; j++) {
        totalDurationInSeconds += userDetails.courses[i].courseContent[
          j
        ].subSection.reduce(
          (acc, curr) => acc + parseInt(curr.timeDuration),
          0
        );
        userDetails.courses[i].totalDuration = convertSecondsToDuration(
          totalDurationInSeconds
        );
        SubsectionLength +=
          userDetails.courses[i].courseContent[j].subSection.length;
      }
      let courseProgressCount = await CourseProgress.findOne({
        courseID: userDetails.courses[i]._id,
        userId: userId,
      });
      courseProgressCount = courseProgressCount?.completedVideos.length;
      if (SubsectionLength === 0) {
        userDetails.courses[i].progressPercentage = 100;
      } else {
        // To make it up to 2 decimal point
        const multiplier = Math.pow(10, 2);
        userDetails.courses[i].progressPercentage =
          Math.round(
            (courseProgressCount / SubsectionLength) * 100 * multiplier
          ) / multiplier;
      }
    }

    if (!userDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find user with id: ${userDetails}`,
      });
    }
    return res.status(200).json({
      success: true,
      data: userDetails.courses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.instructorDashboard = async (req, res) => {
  try {
    const courseDetails = await Course.find({ instructor: req.user.id });

    const courseData = courseDetails.map((course) => {
      const totalStudentsEnrolled = course.studentsEnrolled.length;
      const totalAmountGenerated = totalStudentsEnrolled * course.price;

      //create an new object with the additional fields
      const courseDataWithStats = {
        _id: course._id,
        courseName: course.courseName,
        courseDescription: course.courseDescription,
        totalStudentsEnrolled,
        totalAmountGenerated,
      };
      return courseDataWithStats;
    });

    res.status(200).json({
      success: true,
      courses: courseData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: true,
      message: "Error while fetching instructor dashboard data",
      error: error.message,
    });
  }
};
