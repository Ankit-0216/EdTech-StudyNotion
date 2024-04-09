import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import IconBtn from "../../common/IconBtn";
import { IoIosArrowBack } from "react-icons/io";
import { BsChevronDown } from "react-icons/bs";

const VideoDetailsSidebar = ({ setReviewModal }) => {
  const [activeStatus, setActiveStatus] = useState("");
  const [videoBarActive, setVideoBarActive] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { sectionId, subSectionId } = useParams();
  const {
    courseSectionData,
    courseEntireData,
    completedLectures,
    totalNoOfLectures,
  } = useSelector((state) => state.viewCourse);

  useEffect(() => {
    const setActiveFlags = () => {
      if (!courseSectionData.length) {
        return;
      }

      const currentSectionIndex = courseSectionData.findIndex(
        (data) => data._id === sectionId
      );

      const currentSubSectionIndex = courseSectionData?.[
        currentSectionIndex
      ]?.subSection.findIndex((data) => data._id === subSectionId);

      const activeSubSectionId =
        courseSectionData[currentSectionIndex]?.subSection?.[
          currentSubSectionIndex
        ]?._id;

      setActiveStatus(courseSectionData?.[currentSectionIndex]?._id);
      setVideoBarActive(activeSubSectionId);
    };

    setActiveFlags();

    // eslint-disable-next-line
  }, [courseSectionData, courseEntireData, location.pathname]);

  return (
    <>
      <div className="flex h-[calc(100vh-3.5rem)] w-[320px] max-w-[350px] flex-col border-r-[1px] border-r-richblack-700 bg-richblack-800">
        {/* for buttons and headings */}
        <div className="mx-5 flex flex-col items-start justify-between gap-2 gap-y-4 border-b border-richblack-600 py-5 text-lg font-bold text-richblack-25">
          {/* for buttons */}
          <div className="flex w-full items-center justify-between">
            <div
              onClick={() => navigate("/dashboard/enrolled-courses")}
              className="flex h-[35px] w-[35px] items-center justify-center rounded-full bg-richblack-100 p-1 text-richblack-700 hover:scale-90"
              title="back"
            >
              <IoIosArrowBack size={30} />
            </div>

            <IconBtn
              text="Add review"
              onclick={() => setReviewModal(true)}
              customClasses="ml-auto"
            />
          </div>
          {/* for headings */}
          <div className="flex flex-col">
            <p>{courseEntireData?.courseName}</p>

            <p className="text-sm font-semibold text-richblack-500">
              {completedLectures?.length} / {totalNoOfLectures}
            </p>
          </div>
        </div>

        {/* for sections and subSections */}
        <div className="h-[calc(100vh - 5rem)] overflow-y-auto">
          {courseSectionData.map((section, index) => {
            return (
              <div
                onClick={() => {
                  activeStatus === section?._id
                    ? setActiveStatus("")
                    : setActiveStatus(section?._id);
                }}
                key={index}
                className="mt-2 cursor-pointer text-sm text-richblack-5"
              >
                {/* section */}
                <div className="flex flex-row justify-between bg-richblack-600 px-5 py-4">
                  <div className="w-[70%] font-semibold">
                    {section?.sectionName}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* <span className="text-[12px] font-medium">
                      Lession {section?.subSection.length}
                    </span> */}
                    <span
                      className={`${
                        activeStatus === section?._id
                          ? "rotate-0"
                          : "rotate-180"
                      } transition-all duration-500`}
                    >
                      <BsChevronDown />
                    </span>
                  </div>
                </div>

                {/* subSection */}

                {activeStatus === section?._id && (
                  <div className="transition-[height] duration-500 ease-in-out">
                    {section.subSection.map((topic, index) => {
                      return (
                        <div
                          className={`flex gap-3 px-5 py-2 ${
                            videoBarActive === topic._id
                              ? "bg-yellow-200 font-semibold text-richblack-900"
                              : "hover:bg-richblack-900"
                          }`}
                          key={index}
                          onClick={() => {
                            navigate(
                              `/view-course/${courseEntireData?._id}/section/${section?._id}/sub-section/${topic?._id}`
                            );

                            setVideoBarActive(topic?._id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={completedLectures.includes(topic?._id)}
                            onChange={() => {}}
                          />
                          <span>{topic.title}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default VideoDetailsSidebar;
