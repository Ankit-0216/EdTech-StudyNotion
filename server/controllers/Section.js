const Section = require("../models/Section");
const Course = require("../models/Course");
const SubSection = require("../models/SubSection");

// Create Section ---------------------------------------->
exports.createSection = async (req, res) => {
  try {
    // Data fetch
    const { sectionName, courseId } = req.body;

    // Data validation
    if (!sectionName || !courseId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Create a new section with the given name
    const newSection = await Section.create({ sectionName });

    console.log("newSection-->", newSection);
    console.log("id---->", newSection._id);

    // Update course with section objectID
    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      {
        $push: {
          courseContent: newSection._id,
        },
      },
      { new: true }
    )
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec();

    console.log("updated course-->", updatedCourse);

    // Response is returned
    return res.status(200).json({
      success: true,
      message: "Section created Successfully",
      updatedCourse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to create Section, please try again.",
      error: error.message,
    });
  }
};

// Update Section ---------------------------------------->
exports.updateSection = async (req, res) => {
  try {
    // Data fetch
    const { sectionName, sectionId, courseId } = req.body;

    // Data validation
    if (!sectionName || !sectionId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Update data
    const section = await Section.findByIdAndUpdate(
      sectionId,
      { sectionName },
      { new: true }
    );

    const course = await Course.findById(courseId)
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec();

    // Response is returned
    return res.status(200).json({
      success: true,
      message: section,
      data: course,
    });
  } catch (error) {
    console.error("Error updating section: ", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update Section, please try again.",
      error: error.message,
    });
  }
};

// Delete Section ---------------------------------------->
exports.deleteSection = async (req, res) => {
  try {
    // Data fetch
    const { sectionId, courseId } = req.body;

    await Course.findByIdAndUpdate(courseId, {
      $pull: {
        courseContent: sectionId,
      },
    });

    const section = await Section.findById(sectionId);
    console.log(sectionId, courseId);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not Found",
      });
    }

    // Delete data
    await SubSection.deleteMany({ _id: { $in: section.subSection } });

    await Section.findByIdAndDelete(sectionId);

    //find the updated course and return
    const course = await Course.findById(courseId)
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec();

    // Response is returned
    return res.status(200).json({
      success: true,
      message: "Section deleted Successfully",
      data: course,
    });
  } catch (error) {
    console.error("Error deleting section:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete Section, please try again.",
      error: error.message,
    });
  }
};
