const CosmosClient = require('@azure/cosmos').CosmosClient;
var logger = require("../utils/loghelper").logger;
const secretHelper = require("../utils/secrethelper");
var HttpStatus = require('http-status-codes');
var ErrorStatus = require("../utils/errorhelper");


var isDatabaseInitialized = false;
var dbInitError: any = null;
var cosmosContainer : any = null;
var waitingForDbInit : any[] = [];


/*
 * configuration details about our cosmosdb using SQL.
 * the key should not be in this file! it is our password to this account and should not be in github
 */
storeInit();

//
// Initialize the database using the key, which came either from env or from keyvault
//
async function storeInit() {

    const configSql = {
        "endpoint"        : "https://" + process.env.COSMOS_DB_NAME +".documents.azure.com:443/",
        "databaseId"         : process.env.COSMOS_DB_DATABASE,
        "containerId" : process.env.COMSOS_DB_CONTAINER
    };

    logger.info("setting up cosmos %s database %s container %s", 
        configSql.endpoint, configSql.databaseId, configSql.containerId );

    try {
        var dbKey:string = await secretHelper.getCosmosDBSecret();
       /*
        * use the endpoint and our password, to get an instance of the cosmosclient ,we can then use the database and container from
        * config to get a handle on our database and container, from this endpoint.
        */
        const client = new CosmosClient({ 'endpoint': configSql.endpoint, 'key': dbKey });
        cosmosContainer = client.database(configSql.databaseId).container(configSql.containerId);

        waitingForDbInit.forEach(function(callback:any) {
            callback(dbInitError, cosmosContainer);
        });

    }
    catch(error) {
        logger.error("store init error %s", error.message);
        dbInitError = new ErrorStatus(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error initializing database");
        waitingForDbInit.forEach(function(callback:any) {
            callback(dbInitError);
        });
    }

     isDatabaseInitialized = true;
}

function waitForStoreInit(cb:Function) {
    waitingForDbInit.push(cb);
}


//
// Everyone calls getContainer to operate against the database. If things are not yet initialized, add ourselves to the
// callback array
//
function getContainer()
{
    return new Promise(function(resolve, reject) {
        if (isDatabaseInitialized) {
            if (dbInitError) reject(dbInitError);
            else resolve(cosmosContainer);
        }
        else {
            waitForStoreInit(function(error:any, container:any) {
                if (error) reject(error);
                else resolve(container);
            });
        }
    });
}

//
// delete an item from the database
//
async function deleteDBItem(id : string) {    
    var container:any = await getContainer();    
    await container.item(id, id).delete();
}

//
// update an item from the database
//
async function updateDBItem(item : any) {
    var container:any = await getContainer(); 
    return await container.item(item.id).replace(item);
}
       
//
// create an item in the database
//
async function createDBItem(item: any) {
    var container:any = await getContainer(); 
    var createdItem =  await container.items.create(item);
    return createdItem;
}

//
// createorupdate an item from the database
//
async function createOrUpdateDBItem(item:any) {
    var container:any = await getContainer(); 
    return await container.items.upsert(item);
}


//
// get an item from the database
//
async function readDBItem(id : string) {
    var container:any = await getContainer(); 
    var result: any = await container.item(id,id).read();

    if (result.statusCode == 200) {
        return result;
    }
    else {
        logger.info("readDBItem error %d %s", result.statusCode, result.message);
        throw new ErrorStatus(HttpStatus.NOT_FOUND, "Item not found");
    }
}

//
// query from the database
//
async function queryDBItems(queryStr: string) {
    var querySpec = {
        query: queryStr
    };
    var container:any = await getContainer(); 
    var result: any = await container.items.query(querySpec).fetchAll();
    
    logger.trace("Query DB, got %s records", result.resources.length);   

    return result;

    
}



//
// delete an item from the database
//
async function deleteArtifact(id: string) {    
    return await deleteDBItem(id);
}

async function updateArtifact(artifact : any, type: string) {
    const {id, ...artifactNoId} = artifact;
    var item : any = {"unit" : artifactNoId};
    item['type'] = type;
    item['id'] = id;

    var updatedItem = await updateDBItem(item);
    return { "id": updatedItem.resource.id, ...updatedItem.resource.unit };
}
    

async function createArtifact(artifact: any, type: string) {
    var item : any = {"unit" : artifact};
    item['type'] = type;

    var createdItem =  await createDBItem(item);  
    return { "id": createdItem.resource.id, ...createdItem.resource.unit };
}


async function createOrUpdateArtifact(artifact: any, type: string) {
    const {id, ...artifactNoId} = artifact;
    var item : any = {"unit" : artifactNoId};
    item['type'] = type;
    if (id != null) item['id'] = id;

    var updatedItem = await createOrUpdateDBItem(item);
    return { "id": updatedItem.resource.id, ...updatedItem.resource.unit };
}

//
// Reads the item and checks if it is the specified type, returns back a normalized object
// that is made of id and the rest of the item, but stripping out all the other things in the cosmosdb object
//
async function readArtifact(id : string, type: string) {    
    var result: any = await readDBItem(id);

    if (result.resource.type == type) {
        return({ "id" : id, ...result.resource.unit });
    }
    else {
        logger.info("incoming id % for type %s does not match found type %s", id, type, result.resource.type);
        throw new ErrorStatus(HttpStatus.NOT_FOUND, "Item not found");
    }    
}


async function queryArtifacts(queryScope: any, type: string) {

    var query: string = "SELECT * from r where r.type='" + type +"'";
    for (const key in queryScope) {
        query = query.concat(" AND r.item." + key + "= '" + queryScope[key] +"'");
    }

     logger.info("query is %s", query);
    var result: any = await queryDBItems(query);

    var returnArray = [];
    for (var index = 0; index < result.resources.length; index++) {
        returnArray.push({'id' :result.resources[index].id, ...result.resources[index].unit});
    }
    return returnArray;
}


module.exports = {createArtifact, readArtifact, updateArtifact, deleteArtifact, createOrUpdateArtifact, queryArtifacts};
