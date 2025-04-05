// import mongoose from "mongoose"
// import {apierror} from "../utils/apieroor.js"

// const errorHandler = (err,req,res,next) => {
//     let error = err
//     if(!(error instanceof apierror)){
//         const statusCode = error.statusCode || error instanceof mongoose.Error ? 400 : 500

//         const message = error.message || "something went wrong"
//         error = new apierror(statusCode,message,error?.errors || [],err.stack)
//     }

//     const response = {
//         ...error,
//         message : error.message,
//        ...(process.env.NODE_ENV === "development" ? {stack : error.stack} : {}) 
//     }

//     return res.status(error.statusCode).json(response)
// }

// export {errorHandler}

import mongoose from "mongoose";
import { apierror } from "../utils/apieroor.js";

const errorHandler = (err, req, res, next) => {
    let error = err;
    // Check if the error is not an instance of apierror
    if (!(error instanceof apierror)) {
        const statusCode = error.statusCode || (error instanceof mongoose.Error ? 400 : 500);
        const message = error.message || "Something went wrong";
        
        // Create a new instance of apierror
        error = new apierror(statusCode, message, error.errors || [], err.stack);
    }

    // Prepare the response object
    const response = {
        success: false, // Indicate the response is not successful
        statusCode: error.statusCode,
        message: error.message,
        ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {})
    };

    // Log the error for debugging purposes (optional)
    console.error("Error occurred:", response);
    return res.status(error.statusCode).json(response);
};

export { errorHandler };
