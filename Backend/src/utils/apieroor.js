class apierror extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        //this for overwrite or nhi hoga to likh dega 
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.success = false; 
        this.errors = errors;
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { apierror };

//async and try catch to use karna he padega is liye uska liye utility bana diya