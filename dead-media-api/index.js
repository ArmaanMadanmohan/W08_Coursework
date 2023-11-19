//@ts-check
"use strict";

//Q5 ids replaced with/rewritten as URLs 
//Q8 https://stackoverflow.com/questions/4981891/node-js-equivalent-of-pythons-if-name-main
//Q11 HTTP requests R10, Q12
//pagination should work with search query (i.e. count is 4 for 4 results)
//Q3

const express = require("express");
const path = require('path');
const fs = require('fs');

const app = express();
const port = 23720;
app.use(express.json());

//headers?

const MediaStore = require('./store.js').MediaStore;
const store = new MediaStore(false); //code must be robust against store suddenly going into error mode. 
//try with true & skip past error parsing

if (process.argv.length !== 3) {
    console.error('Usage is: node index.js <filepath>');
    process.exit(1);
}

const filepath = process.argv[2];
const absoluteFilepath = path.resolve(filepath);

if (!fs.existsSync(absoluteFilepath)) {
    console.error('File not found. Please input a correct file name');
    process.exit(1);
}

const fileData = fs.readFileSync(absoluteFilepath, 'utf8');

let jsonData;

try {
    jsonData = JSON.parse(fileData);
} catch (error) {
    console.error('Error parsing file');
    process.exit(1);
}

const ids = new Set();

// if (!validateData(jsonData)) {
//      console.error('Data does not satisfy validation constraints');
// }

async function processObjects() {
    for (const mediaObject of jsonData) {
        try {
            const { name, type, desc } = mediaObject;
            const id = await store.create(name, type, desc);
            ids.add(id);
        } catch (error) {
            console.log(`Error adding object ${mediaObject.name}`);
            process.exit(1);
        }
    }
    console.log("All objects added successfully.");
}

processObjects();

const formattedMediaObject = media => ({
    id: `/media/${media.id}`,
    name: media.name,
    type: media.type,
    desc: media.desc,
});

const defaultLimit = 4;
const defaultOffset = 0;

app.get('/media', async (req, res) => {  //split into functions?
    try {
        const queryLimit = req.query.limit ? Number(req.query.limit) : defaultLimit;
        const queryOffset = req.query.offset ? Number(req.query.offset) : defaultOffset; //or parseInt

        const queryName = req.query.name ? req.query.name.toString.toLowerCase() : null; //toLowerCase()?
        const queryType = req.query.type ? req.query.type.toString.toLowerCase() : null;
        const queryDesc = req.query.desc ? req.query.desc.toString.toLowerCase() : null;

        const returnedObjects = await store.retrieveAll();

        const filteredObjects = returnedObjects.filter(mediaObject => {
            const matchName = !queryName || mediaObject.name.toLowerCase() === queryName;
            const matchType = !queryType || mediaObject.type.toLowerCase() === queryType; //URL encoding characters?
            const matchDesc = !queryDesc || mediaObject.desc.toLowerCase().includes(queryDesc);

            return matchName && matchType && matchDesc;
        });


        const totalCount = filteredObjects.length;

        if (queryOffset < 0 || queryLimit < 0 || queryOffset >= totalCount) {
            res.status(500).send();
        }

        //index for slice is correct?
        const paginatedResources = filteredObjects.slice(queryOffset, queryOffset + queryLimit).map(formattedMediaObject);

        //if offset + limit is greater than count but offset is less, return the remaining objects
        const next = (queryOffset + queryLimit < totalCount) ? `/media?limit=${queryLimit}&offset=${queryOffset + queryLimit}` : null;
        const previous = (queryOffset > 0) ? `/media?limit=${queryLimit}&offset=${queryOffset - queryLimit}` : null;

        if (ids.size === 0) {
            res.status(204);
        }
        const formattedResponse = {
            count: totalCount,
            next: next,
            previous: previous,
            response: paginatedResources
        };
        res.status(200).json(formattedResponse);
    } catch (error) {
        res.status(500).send();
    }
}) //semi colon?

app.get('/media/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!ids.has(id)) {
            res.status(404).send();
        }
        else {
            const returnedObject = await store.retrieve(id); //doesnt work for media/:5 since :5 cant be converted to number
            const formattedObject = formattedMediaObject(returnedObject);
            res.status(200).json(formattedObject);
        }
    } catch (error) {
        res.status(500).send();
    }
})

app.post('/media', async (req, res) => {
    try {
        const { name, type, desc } = req.body;
        //DataSet validaton
        const createId = await store.create(name, type, desc);
        ids.add(createId);
        const newResource = await store.retrieve(createId);
        const formattedObject = formattedMediaObject(newResource);
        res.status(201).json(formattedObject);
    } catch (error) {
        res.status(500).send();
    }
})

app.put('/media/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, type, desc } = req.body;

        if (ids.has(id)) { //worth caching over using one promise? 
            await store.update(id, name, type, desc);
            const updatedResource = await store.retrieve(id);
            const formattedObject = formattedMediaObject(updatedResource);
            res.status(200).json(formattedObject);
        } else {
            res.status(404).send();
        }
    } catch (error) {
        res.status(500).send();
    }
})

app.delete('/media/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (ids.has(id)) {
            await store.delete(id);
            res.status(204).send();
            ids.delete(id);
        } else {
            res.status(404).send();
        }
    } catch (error) {
        res.status(500).send();
    }
})

app.listen(port, function () {
    console.log(`Server is running on port ${port}`)
});




// if (error === `Error: cannot find media with ID: ${req.params.id}`) { //unnecessary?
//     res.status(404).send();
// }