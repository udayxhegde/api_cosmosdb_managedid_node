require('dotenv').config();
const express = require("express");
var logHelper = require("./utils/loghelper");
var HttpStatus = require('http-status-codes');
const eventApi = require("./api/eventroute");
const cors = require("cors");
var ErrorStatus = require("./utils/errorhelper");

const port = process.env.PORT || 3001;

const app = express();
logHelper.expressInit(app);

//
// For now, whitelist all incoming sites... in production
// whitelist only selected sites
//
app.use(cors());
/* 
* now tell express that we want the body to be parsed for json and urlencoded strings
*/
app.use(express.json());
app.use(express.urlencoded({extended: true}));

/*
* Tell express to go to the apiRoute when it sees /API/notes in the URL
*/
app.use('/api/event', eventApi);

/*
* Now define the directory where I can serve static content
*/
app.use('/public', express.static('src/public'));

app.listen(port);
logHelper.logger.info("express now running on port " + port);

app.use(function handleError(error:any, _req: any, res: any, _next: any) {
    if (error instanceof ErrorStatus) {
        logHelper.logger.info("request error %d message %s", error.statusCode, error.message);
        return res.status(error.statusCode).send(error.message);
    }    
    logHelper.logger.error("in global error handler. Error is %s", error.message);    
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Internal server error");
});