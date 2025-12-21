import { Organisation } from "../models/organisation.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Create or update organisation details
const createOrUpdateOrganisation = asyncHandler(async (req, res) => {
  const {
    company,
    address1,
    address2,
    city,
    state,
    pincode,
    industry,
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
  if (!company || !address1 || !city || !state || !pincode || !industry) {
    return res.status(400).json({
      success: false,
      message: "Required fields are missing",
    });
  }

  try {
    // Try to find existing organisation details
    let organisation = await Organisation.findOne({ userId });

    if (organisation) {
      // Update existing organisation details
      organisation.company = company;
      organisation.address1 = address1;
      organisation.address2 = address2 || "";
      organisation.city = city;
      organisation.state = state;
      organisation.pincode = pincode;
      organisation.industry = industry;

      await organisation.save();

      return res.status(200).json({
        success: true,
        message: "Organisation details updated successfully",
        data: organisation,
      });
    } else {
      // Create new organisation details
      const newOrganisation = await Organisation.create({
        userId,
        company,
        address1,
        address2: address2 || "",
        city,
        state,
        pincode,
        industry,
      });

      return res.status(201).json({
        success: true,
        message: "Organisation details created successfully",
        data: newOrganisation,
      });
    }
  } catch (error) {
    console.error("Error in organisation details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save organisation details",
      error: error.message,
    });
  }
});

// Get organisation details for a user
const getOrganisationDetails = asyncHandler(async (req, res) => {
  const userId = req.specificUser._id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  try {
    const organisation = await Organisation.findOne({ userId });

    if (!organisation) {
      return res.status(404).json({
        success: false,
        message: "Organisation details not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: organisation,
    });
  } catch (error) {
    console.error("Error fetching organisation details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch organisation details",
      error: error.message,
    });
  }
});

export { createOrUpdateOrganisation, getOrganisationDetails };
