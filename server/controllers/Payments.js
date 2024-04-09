const { mongoose } = require("mongoose");

const { instance } = require("../config/razorpay");
const mailSender = require("../utils/mailSender");

const Course = require("../models/Course");
const User = require("../models/User");
const CourseProgress = require("../models/CourseProgress");

const { createHmac } = require("node:crypto");

const {
  courseEnrollmentEmail,
} = require("../mail/templates/courseEnrollmentEmail.js");
const {
  paymentSuccessEmail,
} = require("../mail/templates/paymentSuccessEmail.js");

// initiate the razorpay order
exports.capturePayment = async (req, res) => {
  const { courses } = req.body;
  const userId = req.user.id;

  if (courses.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide courseId",
    });
  }

  let totalAmount = 0;
  for (const course_id of courses) {
    let course;
    try {
      console.log("course_id--->", course_id);
      course = await Course.findById(course_id);
      if (!course) {
        return res.status(400).json({
          success: false,
          message: "Could not find the course",
        });
      }

      const uid = new mongoose.Types.ObjectId(userId);
      if (course.studentsEnrolled.includes(uid)) {
        return res.status(400).json({
          success: false,
          message: "Student is already enrolled",
        });
      }

      totalAmount += course.price;
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  const options = {
    amount: totalAmount * 100,
    currency: "INR",
    receipt: Math.random(Date.now()).toString(),
  };

  try {
    const paymentResponse = await instance.orders.create(options);

    res.json({
      success: true,
      message: paymentResponse,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// verify the payment
exports.verifyPayment = async (req, res) => {
  const razorpay_order_id = req.body?.razorpay_order_id;
  const razorpay_payment_id = req.body?.razorpay_payment_id;
  const razorpay_signature = req.body?.razorpay_signature;
  const courses = req.body?.courses;
  const userId = req.user.id;

  if (
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature ||
    !courses ||
    !userId
  ) {
    return res.status(400).json({
      success: false,
      message: "Payment failed, all fields are required",
    });
  }

  let body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    // enroll the students
    await enrollStudents(courses, userId, res);

    return res.status(200).json({
      success: true,
      message: "Paymnet verified",
    });
  }

  return res.status(200).json({
    success: false,
    message: "Paymnet failed",
  });
};

// enroll the student in the courses
const enrollStudents = async (courses, userId, res) => {
  if (!courses || !userId) {
    return res.status(400).json({
      success: false,
      message: "courses and userId is required to enroll student",
    });
  }

  for (const courseId of courses) {
    try {
      const enrolledCourse = await Course.findOneAndUpdate(
        { _id: courseId },
        { $push: { studentsEnrolled: userId } },
        { new: true }
      );

      if (!enrolledCourse) {
        return res.status(400).json({
          success: false,
          message: "Course not Found",
        });
      }

      const courseProgress = await CourseProgress.create({
        courseID: courseId,
        userId: userId,
        completedVideos: [],
      });

      const enrolledStudent = await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            courses: courseId,
            courseProgress: courseProgress._id,
          },
        },
        { new: true }
      );

      // send mail to student
      const emailResponse = await mailSender(
        enrolledStudent.email,
        `Successfully Enrolled into ${enrolledCourse.courseName}`,
        courseEnrollmentEmail(
          enrolledCourse.courseName,
          `${enrolledStudent.firstName} ${enrolledStudent.lastName}`
        )
      );

      console.log("Email sent successfully: ", emailResponse.response);
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
};

// Send Payment Success Email
exports.sendPaymentSuccessEmail = async (req, res) => {
  const { orderId, paymentId, amount } = req.body;

  const userId = req.user.id;

  if (!orderId || !paymentId || !amount || !userId) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all the details" });
  }

  try {
    const enrolledStudent = await User.findById(userId);

    await mailSender(
      enrolledStudent.email,
      `Payment Received`,
      paymentSuccessEmail(
        `${enrolledStudent.firstName} ${enrolledStudent.lastName}`,
        amount / 100,
        orderId,
        paymentId
      )
    );
  } catch (error) {
    console.log("error in sending mail", error);
    return res
      .status(400)
      .json({ success: false, message: "Could not send email" });
  }
};

// for single item
// // Capture the payment and Initiate the Razorpay order
// exports.capturePayment = async (req, res) => {
//   // Get courseId and userId
//   const { course_id } = req.body;
//   const userId = req.user.id;

//   // Valid  courseId
//   if (!course_id) {
//     return res.status(404).json({
//       success: false,
//       message: "Please provide a valid Course ID",
//     });
//   }

//   // valid courseDetail
//   let course;
//   try {
//     course = await Course.findById(course_id);

//     if (!course) {
//       return res.status(404).json({
//         success: false,
//         message: "Course couldn't be found",
//       });
//     }

//     // Check if user already paid for the same course
//     const uid = new mongoose.Types.ObjectId(userId);

//     if (course.studentsEnrolled.includes(uid)) {
//       return res.status(200).json({
//         success: false,
//         message: "Student is already enrolled in the Course",
//       });
//     }
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }

//   // Create order
//   const amount = course.price;
//   const currency = "INR";

//   const options = {
//     amount: amount * 100,
//     currency,
//     receipt: Math.random(date.now()).toString(),
//     notes: {
//       courseId: course_id,
//       userId,
//     },
//   };

//   try {
//     // Initiate the payment using razorpay
//     const paymentResponse = await instance.orders.create(options);
//     console.log(paymentResponse);

//     // Return response
//     return res.status(200).json({
//       success: true,
//       courseName: course.courseName,
//       courseDescription: course.courseDescription,
//       thumbnail: course.thumbnail,
//       orderId: paymentResponse.id,
//       currency: paymentResponse.currency,
//       amount: paymentResponse.amount,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       success: false,
//       message: "Could not initiate order",
//     });
//   }
// };

// // Verify signature(Auhtorization)
// exports.verifySignature = async (req, res) => {
//   const webhookSecret = "12345678";

//   const signature = req.headers("x-razorpay-signature");

//   const shasum = crypto.createHmac("sha256", webhookSecret);
//   shasum.update(JSON.stringify(req.body));
//   const digest = shasum.digest("hex");

//   if (signature === digest) {
//     console.log("Payment is Authorised.");

//     const { courseId, userId } = req.body.payload.payment.entity.notes;

//     try {
//       // Find the course and enroll the student in it
//       const enrolledCourse = await Course.findOneAndUpdate(
//         { _id: courseId },
//         { $push: { studentsEnrolled: userId } },
//         { now: true }
//       );

//       if (!enrolledCourse) {
//         return res.status(500).json({
//           success: false,
//           message: "Course not Found",
//         });
//       }

//       console.log("Enrolled course:", enrolledCourse);

//       // Find the student and add the course to their list of enrolled courses
//       const enrolledStudent = await User.findOneAndUpdate(
//         { _id: userId },
//         { $push: { courses: courseId } },
//         { new: true }
//       );

//       console.log("Enrolled student:", enrolledStudent);

//       // Send confirmation email
//       const emailResponse = await mailSender(
//         enrolledStudent.email,
//         "course Onboarding mail",
//         "congratulations, you are onboarded into new course"
//       );

//       console.log(emailResponse);
//       return res.status(200).json({
//         success: true,
//         message: "Signature verified and Course added",
//       });
//     } catch (error) {
//       console.log(error);
//       return res.status(200).json({
//         success: false,
//         message: error.message,
//       });
//     }
//   } else {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid request.",
//     });
//   }
// };
