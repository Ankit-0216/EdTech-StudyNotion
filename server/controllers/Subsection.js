const Section = require("../models/Section");
const SubSection = require("../models/SubSection");
const { uploadImageToCloudinary } = require("../utils/imageUploader");

// Create SubSection for a given section ------------->
exports.createSubSection = async (req, res) => {
  try {
    // Data fetch
    const { sectionId, title, description } = req.body;

    // Extract video file
    const video = req.files.videoFile;

    // Data validation
    if (!sectionId || !title || !description || !video) {
      return res.status(404).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Upload video to cloudinary
    const uploadDetails = await uploadImageToCloudinary(
      video,
      process.env.FOLDER_NAME
    );

    console.log("uploadDetaails-->", uploadDetails);

    // Create a new sub-section with the necessary information
    const subSectionDetails = await SubSection.create({
      title: title,
      timeDuration: `${uploadDetails.duration}`,
      description: description,
      videoUrl: uploadDetails.secure_url,
    });

    // Update Section with SubSection objectId
    const updatedSection = await Section.findByIdAndUpdate(
      { _id: sectionId },
      {
        $push: {
          subSection: subSectionDetails._id,
        },
      },
      { new: true }
    ).populate("subSection");

    // Response is returned
    return res.status(200).json({
      success: true,
      message: "Sub Section created Successfully",
      data: updatedSection,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to create Sub Section, please try again.",
      error: error.message,
    });
  }
};

// Update SubSection ---------------------------------------->
exports.updateSubSection = async (req, res) => {
  try {
    // Data fetch
    const { sectionId, subSectionId, title, description } = req.body;

    const subSection = await SubSection.findById(subSectionId);

    if (!subSection) {
      return res.status(404).json({
        success: false,
        message: "SubSection not found",
      });
    }

    if (title !== undefined) {
      subSection.title = title;
    }

    if (description !== undefined) {
      subSection.description = description;
    }
    if (req.files && req.files.video !== undefined) {
      const video = req.files.video;
      const uploadDetails = await uploadImageToCloudinary(
        video,
        process.env.FOLDER_NAME
      );
      subSection.videoUrl = uploadDetails.secure_url;
      subSection.timeDuration = `${uploadDetails.duration}`;
    }

    await subSection.save();

    const updatedSection = await Section.findById(sectionId).populate(
      "subSection"
    );

    // Response is returned
    return res.status(200).json({
      success: true,
      message: "Sub Section updated Successfully",
      data: updatedSection,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Unable to update Sub Section, please try again.",
      error: error.message,
    });
  }
};

// Delete SubSection ---------------------------------------->
exports.deleteSubSection = async (req, res) => {
  try {
    // Data fetch
    const { subSectionId, sectionId } = req.body;
    await Section.findByIdAndUpdate(
      { _id: sectionId },
      {
        $pull: {
          subSection: subSectionId,
        },
      }
    );

    // Delete data
    const subSection = await SubSection.findByIdAndDelete({
      _id: subSectionId,
    });

    if (!subSection) {
      return res.status(404).json({
        success: false,
        message: "SubSection not found",
      });
    }

    const updatedSection = await Section.findById(sectionId).populate(
      "subSection"
    );

    // Response is returned
    return res.status(200).json({
      success: true,
      data: updatedSection,
      message: "SubSection deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete Sub Section, please try again.",
      error: error.message,
    });
  }
};
