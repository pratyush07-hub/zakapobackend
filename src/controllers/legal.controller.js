import { LegalDetails } from "../models/legal.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Create or update legal details
const createOrUpdateLegalDetails = asyncHandler(async (req, res) => {
  const {
    companyId,
    gstNo,
    otherTax,
    taxNo,
    contactMemberName,
    designation,
    contactNo,
    websiteLink,
    emailAddress, // Add email for user identification
  } = req.body;

  let userId;

  // Check if user is authenticated via JWT
  if (req.specificUser && req.specificUser._id) {
    userId = req.specificUser._id;
  } else {
    // If not authenticated, try to find user by email
    if (!emailAddress) {
      return res.status(400).json({
        success: false,
        message: "Email address is required for unauthenticated users",
      });
    }

    try {
      const { User } = await import("../models/user.model.js");
      const user = await User.findOne({ emailAddress });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found with the provided email",
        });
      }
      
      userId = user._id;
    } catch (error) {
      console.error("Error finding user by email:", error);
      return res.status(500).json({
        success: false,
        message: "Error finding user",
      });
    }
  }

  // Check if required fields are present
  if (!companyId || !gstNo || !contactNo) {
    return res.status(400).json({
      success: false,
      message: "Required fields are missing",
    });
  }

  try {
    // Try to find existing legal details
    let legalDetails = await LegalDetails.findOne({ userId });

    if (legalDetails) {
      // Update existing legal details
      legalDetails.companyId = companyId;
      legalDetails.gstNo = gstNo;
      legalDetails.otherTax = otherTax || "";
      legalDetails.taxNo = taxNo || "";
      legalDetails.contactMemberName = contactMemberName || "";
      legalDetails.designation = designation || "";
      legalDetails.contactNo = contactNo;
      legalDetails.websiteLink = websiteLink || "";

      await legalDetails.save();

      return res.status(200).json({
        success: true,
        message: "Legal details updated successfully",
        data: legalDetails,
      });
    } else {
      // Create new legal details
      const newLegalDetails = await LegalDetails.create({
        userId,
        companyId,
        gstNo,
        otherTax: otherTax || "",
        taxNo: taxNo || "",
        contactMemberName: contactMemberName || "",
        designation: designation || "",
        contactNo,
        websiteLink: websiteLink || "",
      });

      return res.status(201).json({
        success: true,
        message: "Legal details created successfully",
        data: newLegalDetails,
      });
    }
  } catch (error) {
    console.error("Error in legal details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save legal details",
      error: error.message,
    });
  }
});

// Get legal details for a user
const getLegalDetails = asyncHandler(async (req, res) => {
  const userId = req.specificUser._id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  try {
    const legalDetails = await LegalDetails.findOne({ userId });

    if (!legalDetails) {
      return res.status(404).json({
        success: false,
        message: "Legal details not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: legalDetails,
    });
  } catch (error) {
    console.error("Error fetching legal details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch legal details",
      error: error.message,
    });
  }
});

export { createOrUpdateLegalDetails, getLegalDetails };
