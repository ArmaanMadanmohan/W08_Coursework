//@ts-check
"use strict";

const express = require("express");
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;
app.use(express.json());

const MediaStore = require('./store.js').MediaStore;
const store = new MediaStore(false); //code must be robust against store suddenly going into error mode. 

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
        console.log(`Object added: ${createId}`);
    }).catch(error => {
        console.error('Error adding object');
        process.exit(1);
    });
});

// function formatObject(mediaObject, isArray) {
//     if (isArray) {
//         return mediaObject.map(media => {
//             return {
//                 id: `/media/${media.id}`, //conside removing "/media/"
//                 name: media.name,
//                 type: media.type,
//                 desc: media.desc,
//             };
//         });
//     } else {
//         const formattedMediaObject = {
//             id: `/media/${mediaObject.id}`,
//             name: mediaObject.name,
//             type: mediaObject.type,
//             desc: mediaObject.desc,
//         };
//         return formattedMediaObject;
//     }
// }

const formattedMediaObject = {
    id: `/media/${mediaObject.id}`,
    name: mediaObject.name,
    type: mediaObject.type,
    desc: mediaObject.desc,
};

app.get('/media', async (req, res) => { // /:id for specific objects
    try {
        const returnedObjects = await store.retrieveAll(); //store.retrieveAll().then(function (something) { if (something) { }})
        if (returnedObjects) {
            const formattedMediaObjects = returnedObjects.map(formattedMediaObject);
            // formatObject(returnedObjects, true); //possible issue with accidentally using non-boolean values
            res.status(200).json(formattedMediaObjects);
        } else {
            res.status(204); //test this
        }
    } catch (error) {
        res.status(500).send(); //is this an empty body or is .json({}) better
    }
});

app.get('/media/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const returnedObject = await store.retrieve(id); //doesnt work for media/:5 since :5 cant be converted to number
        if (returnedObject) {
            const formattedMediaObject = formatObject(returnedObject, false);
            res.status(200).json(formattedMediaObject);
        } else {
            res.status(404).send(); //does this work
        }
    } catch (error) {
        res.status(500).send()
    }
});

app.post('/media', async (req, res) => {
    try {
        const { name, type, desc } = req.body; 
        //DataSet validaton
        const createId = await store.create(name, type, desc);
        const newResource = await store.retrieve(createId);
        if (newResource) { //conside removing
            const formattedMediaObject = formatObject(newResource, false);
            res.status(201).json(formattedMediaObject);
        } else {
            res.status(500).send();
        }
    } catch (error) {
        res.status(500).send();
    }
})

app.put('/media/:id', async (req, res) => { //can replace async and await with "then"
    try {
        const id = Number(req.params.id);
        const { name, type, desc } = req.body;

        const resourceExists = await store.retrieve(id);
        if (!(resourceExists)) {
            console.log("hi)");
            return res.status(404).send();
        }

        await store.update(id, name, type, desc);
        const updatedResource = await store.retrieve(id);
        if (updatedResource) {
            const formattedMediaObject = formatObject(updatedResource);
            res.status(200).json(formattedMediaObject);
        } else {
            res.status(500).send();
        }

    } catch (error) {
        if (error === `Error: cannot find media with ID: ${req.params.id}`) {
            res.status(404).send();
        }
        res.status(500).send();
    }

})

app.listen(port, function () {
    console.log(`Server is running on port ${port}`)
});
