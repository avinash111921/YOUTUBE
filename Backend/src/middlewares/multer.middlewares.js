import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {//cb--->callback
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        //todo for user
    //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.originalname)
    }
  })
export const upload = multer({ 
    storage:storage 
})
//COPY PASTE MULTER DOCUMENT

//middleware means jana sai phale humesha mil ke jana
//multer alternative fileexpress