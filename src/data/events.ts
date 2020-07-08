const eventValidator = require("jsonschema").Validator;
const eventValidatorInstance = new eventValidator();
var HttpStatus = require('http-status-codes');
var logger = require("../utils/loghelper").logger;
var sqlstore = require('./sqlstore');
var ErrorStatus = require("../utils/errorhelper");


//
// this is our event schema... only details and created are required for now
//
const eventSchema = {
    "$schema": "http://json-schema.org/draft-04/schema#",
    "type": "object",
    "required": [ "details", "created"],
    "additionalProperties": false,
    "properties": {

        "details": { "type": "string"},  
        "created" : { "type": ["string", "null"] },      
        "startdate" : { "type": ["string", "null"] },
        "totaldays" : { "type": "int" },
        "completed": { "type": "boolean" },
        "where" : {"type" : "string"},

        "owner": { "type": "string" },
        "contributors" : { "type": "array",
            "items": { "type": "string" }
        },
        "shared" : { "type": "array",
            "items": { "type": "string" }
        },

        "generalLocation": {
            "lat": { "type": "number"  },
            "lng": { "type": "number"  }
        }
    }
};

//
// make sure we are accepting an event that conforms to the schema.
//
function validateEvent(event: any) {
  const validateResult = eventValidatorInstance.validate(event, eventSchema);

  if (validateResult.errors.length) {
    let errorReturn = "";
    for(var index = 0; index < validateResult.errors.length; index++) {
        errorReturn = errorReturn.concat(" " + validateResult.errors[index].message);
    }
    throw new ErrorStatus(HttpStatus.BAD_REQUEST, errorReturn);
  }
  return;
}
    
//
// remove empty things from our object before we store in database
//
function removeEmpty(event: any) {
  var cleanEvent: any = {};
  for (var key in event) { 
    if (event[key] !== null && event[key] !== undefined) {
      cleanEvent[key] = event[key];
    }
  }
  return cleanEvent;
}
  
async function readEvent(id: string) {
    const event: any = await sqlstore.readArtifact(id, "event");

    return event;            
}

async function addEvent(event: any) {
    const createdEvent: any = await sqlstore.createArtifact(event, "event");

    logger.info("add event completed %s", createdEvent.id);
    return createdEvent;
}



async function updateEvent(id: string, event: any) {
    const updatedEvent: any = await sqlstore.updateArtifact(id, event, "event");

    return updatedEvent;
}

async function queryEvents(queryScope: string) {
    const events = await sqlstore.queryArtifacts(queryScope, "event");

    return events;
}

async function deleteEvent(id: string) {
    await sqlstore.deleteArtifact(id);
    
    return id;
}

 

    
async function validateEventUpdate (req: any, eventId: string) {
  
    const {id, ...newEvent} = req.body;
    
    const event: any = await readEvent(eventId);
    
    newEvent.created = event.created;
    newEvent.owner = event.owner;
    if (!newEvent.contributors)
        newEvent.contributors = event.contributors;

    if (!newEvent.shared)
        newEvent.shared = event.shared;
                
    validateEvent(newEvent);
            
    req.log.info("validate event success");
    return removeEmpty(newEvent);
}
  
//
//during create, make sure we setup the event to have all the necessary info, and the incoming info is valid
//
async function validateEventCreate(req: any) {
    let event = req.body;

    event.created = new Date().toDateString();
    event.owner = ""; // TODO set this to current user
    if (!event.contributors)
        event.contributors = [];
    
    if (!event.shared) 
        event.shared = [];

    validateEvent(event);

    req.log.info("validated event success");
    return removeEmpty(event);
}

module.exports = {addEvent, readEvent, updateEvent, deleteEvent, queryEvents, validateEventUpdate, validateEventCreate};
