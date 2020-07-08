"use strict";

const eventRoute = require("express").Router();
var HttpStatus = require('http-status-codes');
var eventHelper = require("../data/events");
var ErrorStatus = require("../utils/errorhelper")

//
// add middleware to log all incoming requests
//
eventRoute.use(function timeLog(req: any, _res: any, next: any) {
    var date = new Date();

    // use our pino logger setup in req, is this necessary?
    req.log.info(`EventRoute Got request ${req.method} at time`, date.toLocaleString());
    next();
});


eventRoute.route('/:id')
    .get(async function(req: any, res: any, next: any) {
        try {
            var event: any = await eventHelper.readEvent(req.params.id)
            req.log.trace("EventRoute for id %s success", req.params.id);
            return res.json(event);
        }
        catch(error) {
            next(error);
        }
    })
    .put(function(_req: any, _res: any) {

    })
    .post(function(req: any, res: any) {
        req.log.error("EventRoute post not allowed for id");
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json({message: "post not allowed"});
    })
    .delete(async function(req: any, res: any, next: any) {
        try {
            await eventHelper.readEvent(req.params.id)
            await eventHelper.deleteEvent(req.params.id);
            req.log.info("EventRoute delete success for %s ", req.params.id);
            return res.json({'id' : req.params.id});
        }
        catch(error) {
            next(error);
        }
    });

eventRoute.route('/')
    .get(async function(req: any, res: any, next: any) {
        try {
            for (const key in req.query) {
                console.log(key, req.query[key])
            }
            req.log.trace("eventRoute, reading all events");
            var events: any = await eventHelper.queryEvents(req.query)
            req.log.info("EventRoute read success %d items", events.length);
            return res.json(events);
        }
        catch(error) {
            next(error);
        }
    })
    .post(async function(req: any, res: any, next: any) {
        try {
            var event: any = await eventHelper.validateEventCreate(req)
            var addedEvent:any = await eventHelper.addEvent(event);
            req.log.info("createEvent succeeded %s", addedEvent.id);
            return res.json(addedEvent);
        }
        catch(error) {
            next(error);
        }
    });

module.exports = eventRoute;
