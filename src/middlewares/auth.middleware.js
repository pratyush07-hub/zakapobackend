import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import config from "../config/config.js";

export const verifyJWTToken = asyncHandler( async(req , res , next) =>{

    try 
    {
        const accessToken = req.cookies?.accessToken;

        if(!accessToken) return res.status(401).json({ success : false , message : "unauthorised access detected"});

        // now , if we have access token 

        const decodedToken = jwt.verify(accessToken , config.ACCESS_TOKEN_SECRET);

        const targetUser = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if(!targetUser) return res.status(401).json({ success : false , message : "invalid access token"});

        req.specificUser = targetUser;
        next(); 
    } 
    catch (error) 
    {
        throw new Error(`Error while verifying the token: ${error.message}`);
    }
});