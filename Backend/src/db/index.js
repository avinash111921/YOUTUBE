import mongoose from "mongoose";
import { DB_NAME } from "../constants.js"
 
const connectDB = async ()=>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB connected ! DB host : ${connectionInstance.connection.host}`)

    } catch (error) {
        console.error("MongoDB connection Error ",error)
        process.exit(1) //The process.exit() method instructs Node.js to terminate the process synchronously with an exit status of code. If code is omitted, exit uses either the 'success' code 0 or the value of process.exitCode if it has been set. Node.js will not terminate until all the 'exit' event listeners are called.
    }
}

export default connectDB

//we can use promise or try catch block
//;( async () => {})() imidiate function

/* 
import mongoose from "mongoose";
import { DB_NAME } from "../constants.js"
import express from "express";

const app = express()

;( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("error",(error) => {
            console.log("Error : ",error);
            throw err;
        })
        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.error("Error:",error);
        throw err
    }
})() */