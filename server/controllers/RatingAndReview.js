const RatingAndReview = require("../models/RatingAndReview");
const Course = require("../models/Course");
const { default: mongoose } = require("mongoose");

// Create rating
exports.createRating = async (req, res) => {
  try {
    // Get user ID
    const userId = req.user.id;

    // Fetch data from request body
    const { rating, review, courseId } = req.body;

    // Check if user is enrolled or not
    const courseDetails = await Course.findOne({
      _id: courseId,
      studentsEnrolled: {
        $elemMatch: {
          $eq: userId,
        },
      },
    });

    if (!courseDetails) {
      return res.status(404).json({
        success: false,
        message: "Student is not enrolled in the course",
      });
    }

    // Check if user already reviewed the course
    const alreadyReviewed = await RatingAndReview.findOne({
      user: userId,
      course: courseId,
    });

    console.log("alreadyReviewed", alreadyReviewed);

    if (alreadyReviewed) {
      return res.status(403).json({
        success: false,
        message: "Course is already reviewed by the user.",
      });
    }

    // Create rating and review
    const ratingReview = await RatingAndReview.create({
      rating,
      review,
      course: courseId,
      user: userId,
    });

    // Update course with this rating and review
    const updatedCourseDetails = await Course.findByIdAndUpdate(
      { _id: courseId },
      {
        $push: {
          ratingAndReviews: ratingReview._id,
        },
      },
      { new: true }
    );

    console.log(
      "Updated course details after Rating and review: ",
      updatedCourseDetails
    );

    // Return response
    return res.status(200).json({
      success: true,
      message: "Rating and Review created Successfully",
      data: ratingReview,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get average Rating
exports.getAverageRating = async (req, res) => {
  try {
    // Get course ID
    const courseId = req.body.courseId;

    // Calculate Average rating
    const result = await RatingAndReview.aggregate([
      {
        $match: {
          course: new mongoose.Types.ObjectId(courseId),
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
        },
      },
    ]);

    // Return Rating
    if (result.length > 0) {
      return res.status(200).json({
        success: true,
        averageRating: result[0].averageRating,
      });
    }

    // If no rating/review exist
    return res.status(200).json({
      success: true,
      message: "Average rating is 0, no ratings given till now.",
      averageRating: 0,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All rating and reviews
exports.getAllRating = async (req, res) => {
  try {
    const allReviews = await RatingAndReview.find({})
      .sort({ rating: "desc" })
      .populate({
        path: "user",
        select: "firstName lastName email image",
      })
      .populate({
        path: "course",
        select: "courseName",
      })
      .exec();

    return res.status(200).json({
      success: true,
      message: "All reviews and ratings fetched successfully",
      data: allReviews,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All rating and reviews for a particular course
exports.particularCourseReview = async (req, res) => {
  try {
    // Get course ID
    const { courseId } = req.body;

    // Validate course ID
    if (!courseId) {
      return res.status(404).json({
        success: false,
        message: "Please provide a course ID",
      });
    }

    // Get ratings and reviews for particular course
    const courseDetails = await Course.find({ _id: courseId }).populate(
      "ratingAndReviews"
    );

    if (!courseDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find Rating and Reviews for course with ${courseId}`,
      });
    }

    // Return response
    return res.status(200).json({
      success: true,
      message: "Course details fetched Successfullyy",
      data: courseDetails.ratingAndReviews,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
