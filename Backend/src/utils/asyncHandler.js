const asyncHandler = (requestHandler) => {
    return(req, res, next) => {
        Promise
        .resolve(requestHandler(req, res, next))
        .catch((err) => next(err)) //if error to next jispe jayega usko next(err) err argument milega 
    }
}

export {asyncHandler}



// const asyncHandler = () => {}
    //high order function -> argument mai func
// const asyncHandler = (func) => {() => {}}

// const asyncHandler = (fn) => async (err,req,res,next) =>{
//     try {
//         await fn(err,req,res,next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success:false,
//             message : err.message
//         })
//     }
// }