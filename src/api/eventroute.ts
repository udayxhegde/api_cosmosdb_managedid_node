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
    .get(function(req: any, res: any, next: any) {
        eventHelper.readEvent(req.params.id)
        .then(function(event: any) {
            req.log.trace("EventRoute for id %s success", req.params.id);
            return res.json(event);
        })
        .catch(function(error: any) {
            if (error instanceof ErrorStatus) {
                req.log.info("EventRoute Get for id %s failed %d %s", req.params.id, error.statusCode, error.message);
                return res.status(error.statusCode).send(error.message);
            }
            req.log.error("error in Eventroute get for id %s error %s", req.params.id, error.message);
            next(error);
        });
    })
    .put(function(_req: any, _res: any) {

    })
    .post(function(req: any, res: any) {
        req.log.error("EventRoute post not allowed for id");
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json({message: "post not allowed"});
    })
    .delete(function(req: any, res: any, next: any) {
        eventHelper.readEvent(req.params.id)
        .then(function(_event: any) {
            return eventHelper.deleteEvent(req.params.id);
        })
        .then(function(id: string) {
            req.log.info("EventRoute delete success for %s ", id);
            return res.json({'id' : id});
        })
        .catch(function(error: any) {
            if (error instanceof ErrorStatus) {
                req.log.info("EventRoute delete for id %s failed %d %s", req.params.id, error.statusCode, error.message);
                return res.status(error.statusCode).send(error.message);
            }
            req.log.error("error in Eventroute delete for id %s error %s", req.params.id, error.message);
            next(error);
        });;
    });

eventRoute.route('/')
    .get(function(req: any, res: any, next: any) {
        for (const key in req.query) {
            console.log(key, req.query[key])
        }
        req.log.trace("eventRoute, reading all events");
        eventHelper.queryEvents(req.query)
        .then(function(events: any) {
            req.log.info("EventRoute read success %d items", events.length);
            return res.json(events);
        })
        .catch(function(error:any) {
            if (error instanceof ErrorStatus) {
                req.log.info("EventRoute get all failed %d %s", error.statusCode, error.message);
                return res.status(error.statusCode).send(error.message);
            }
            req.log.error("error in Eventroute get all, error %s", req.params.id, error.message);
            next(error);
        });
    })
    .post(function(req: any, res: any, next: any) {
        eventHelper.validateEventCreate(req)
        .then(function(event: any) {
            return eventHelper.addEvent(event);
        })
        .then(function(addedEvent: any) {
            req.log.info("createEvent succeeded %s", addedEvent.id);
            return res.json(addedEvent);
        })
        .catch(function(error: any) {
            if (error instanceof ErrorStatus) {
                req.log.info("EventRoute post failed %d %s", error.statusCode, error.message);
                return res.status(error.statusCode).send(error.message);
            }
            req.log.error("error in Eventroute post, error %s", req.params.id, error.message);
            next(error);
        });
    });

module.exports = eventRoute;
