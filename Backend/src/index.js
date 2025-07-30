import dotenv from "dotenv"; 
import { app } from "./app.js";
import connectDB from "./db/index.js";

dotenv.config({
  path: "./.env",
});

const PORT = process.env.PORT || 8001;

;(async () => {
  try {
    // Connect to the database
    await connectDB()
    // Start the server only after successful DB connection
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1); // Exit the process with failure
  }
})(); //IFFE immideatly excute ho jayega
