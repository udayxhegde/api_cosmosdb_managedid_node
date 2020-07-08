var pino = require('pino');

const pinoLogger = pino({
    prettyPrint: { colorize: true }
});
  
pinoLogger.level = process.env.LOG_LEVEL || "info";

function expressInit(app: any) {

    //
    // setup up the pinologger as middleware
    //
    const pinoMiddleware = require('express-pino-logger')({
        logger: pinoLogger
    });
    app.use(pinoMiddleware);
}

module.exports={logger: pinoLogger, expressInit:expressInit};
