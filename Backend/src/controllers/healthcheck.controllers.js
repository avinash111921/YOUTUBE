import { apiresponse } from "../utils/apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (_,res) => {
    return res
    .status(200)
    .json(new apiresponse(
        200,
        "OK",
        "Health check pass"
    ))
})

export { healthcheck }