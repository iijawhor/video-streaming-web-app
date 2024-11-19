const asyncHandler = (requestHandler) => {
  (req, res, next) => {
    Promise.resolve(requestHandler(req.res.next)).catch((err) => next(err));
  };
  return requestHandler;
};

export { asyncHandler };
// const asyncHandler = (fn)=>async(req,res,next)=>{ // using try/catch
//     try {
//         await fn(req,res,next)

//     } catch (error) {
//         console.log();
//         res.status(error.code|| 500).json({
//             success:false,
//             message:error.message
//         })
//     }
// }
