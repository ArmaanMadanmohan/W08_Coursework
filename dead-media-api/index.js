//@ts-check
"use strict";

const express = require("express");
const path = require('path');
const fs = require('fs');

const app = express();
const port = 23720;
app.use(express.json());

const ids = new Set();

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

// if (!validateData(jsonData)) {
//      console.error('Data does not satisfy validation constraints');
// }


jsonData.forEach(mediaObject => {
    const { name, type, desc } = mediaObject;
    store.create(name, type, desc).then(createId => {
        console.log(`Object added: ${createId}`); //move to outside?
        ids.add(createId);
    }).catch(error => {
        console.error('Error adding object');
        process.exit(1);
    });
});

const formattedMediaObject = media => ({
    id: `/media/${media.id}`,
    name: media.name,
    type: media.type,
    desc: media.desc,
});

app.get('/media', async (req, res) => {  //test with remove
    try {
        const returnedObjects = await store.retrieveAll(); 
        if (ids.size === 0) {
            res.status(204);
        } else {
            const formattedObjects = returnedObjects.map(formattedMediaObject);
            res.status(200).json(formattedObjects);
        }
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
        if (error === `Error: cannot find media with ID: ${req.params.id}`) { //check
            res.status(404).send();
        }
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
