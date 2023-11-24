// //@ts-check
// "use strict";

// const express = require('express');
// const app = express();
// app.use(express.json());

// // const request = require("supertest");
// const fetch = require('node-fetch');

// const path = require('path');
// const fs = require('fs');

// const port = 23720;

// //headers?

// const MediaStore = require('./store.js').MediaStore;
// const store = new MediaStore(false); //code must be robust against store suddenly going into error mode. 
// //try with true & skip past error parsing

// const MediaController = require('./MediaController.js');
// const controller = new MediaController(store);

// if (process.argv.length !== 3) {
//     console.error('Usage is: node index.js <filepath>');
//     process.exit(1);
// }

// const filepath = process.argv[2];
// const absoluteFilepath = path.resolve(filepath); //consider commenting this out

// if (!fs.existsSync(absoluteFilepath)) {
//     console.error('File not found. Please input a correct file name');
//     process.exit(1);
// }

// const fileData = fs.readFileSync(absoluteFilepath, 'utf8');

// let jsonData;

// try {
//     jsonData = JSON.parse(fileData);
// } catch (error) {
//     console.error('Error parsing file');
//     process.exit(1);
// }

// const ids = new Set();

// // if (!validateData(jsonData)) {
// //      console.error('Data does not satisfy validation constraints');
// // }

// async function processObjects() {
//     for (const mediaObject of jsonData) {
//         try {
//             const { name, type, desc } = mediaObject;
//             const id = await store.create(name, type, desc);
//             ids.add(id); ///media/id?
//         } catch (error) {
//             console.log(`Error adding object ${mediaObject.name}`);
//             process.exit(1);
//         }
//     }
//     console.log("All objects added successfully.");
// }

// processObjects();

// const formattedMediaObject = media => ({
//     id: `/media/${media.id}`,
//     name: media.name,
//     type: media.type,
//     desc: media.desc,
// });

// const defaultLimit = 4;
// const defaultOffset = 0;

// app.get('/media', async (req, res) => {  //split into functions?
//     // controller.getMedia(req, res);
//     try {
//         const queryLimit = Number(req.query.limit) || defaultLimit;
//         const queryOffset = Number(req.query.offset) || defaultOffset;

//         const queryName = req.query.name ? req.query.name.toString().toLowerCase() : null;
//         const queryType = req.query.type ? req.query.type.toString().toLowerCase() : null;
//         const queryDesc = req.query.desc ? req.query.desc.toString().toLowerCase() : null;

//         const returnedObjects = await store.retrieveAll();

//         const filteredObjects = returnedObjects.filter(mediaObject => {
//           const matchName = !queryName || mediaObject.name.toLowerCase() === queryName;
//           const matchType = !queryType || mediaObject.type.toLowerCase() === queryType;
//           const matchDesc = !queryDesc || mediaObject.desc.toLowerCase().includes(queryDesc);

//           return matchName && matchType && matchDesc;
//         });

//         const totalCount = filteredObjects.length;

//         if (queryOffset < 0 || queryLimit < 0 || queryOffset >= totalCount) {
//           return res.status(500).send();
//         }

//         const paginatedResources = filteredObjects.slice(queryOffset, queryOffset + queryLimit).map(this.formattedMediaObject);

//         const next = (queryOffset + queryLimit < totalCount) ? `/media?limit=${queryLimit}&offset=${queryOffset + queryLimit}` : null;
//         const previous = (queryOffset > 0) ? `/media?limit=${queryLimit}&offset=${queryOffset - queryLimit}` : null;

//         if (paginatedResources.length === 0) {
//           return res.status(204).end();
//         }

//         const formattedResponse = {
//           count: totalCount,
//           next: next,
//           previous: previous,
//           response: paginatedResources
//         };

//         return res.status(200).json(formattedResponse);
//       } catch (error) {
//         console.error(error);
//         return res.status(500).send();
//       }
// }) //semi colon?

// app.get('/media/:id', async (req, res) => {
//     try {
//         const id = Number(req.params.id);
//         if (!ids.has(id)) {
//             res.status(404).send();
//         }
//         else {
//             const returnedObject = await store.retrieve(id); //doesnt work for media/:5 since :5 cant be converted to number
//             const formattedObject = formattedMediaObject(returnedObject);
//             res.status(200).json(formattedObject);
//         }
//     } catch (error) {
//         res.status(500).send();
//     }
// })

// app.post('/media', async (req, res) => {
//     try {
//         const { name, type, desc } = req.body;
//         //DataSet validaton
//         const createId = await store.create(name, type, desc);
//         ids.add(createId);
//         const newResource = await store.retrieve(createId);
//         const formattedObject = formattedMediaObject(newResource);
//         res.status(201).json(formattedObject);
//     } catch (error) {
//         res.status(500).send();
//     }
// })

// app.put('/media/:id', async (req, res) => {
//     try {
//         const id = Number(req.params.id);
//         const { name, type, desc } = req.body;

//         if (ids.has(id)) { //worth caching over using one promise? 
//             await store.update(id, name, type, desc);
//             const updatedResource = await store.retrieve(id);
//             const formattedObject = formattedMediaObject(updatedResource);
//             res.status(200).json(formattedObject);
//         } else {
//             res.status(404).send();
//         }
//     } catch (error) {
//         res.status(500).send();
//     }
// })

// app.delete('/media/:id', async (req, res) => {
//     try {
//         const id = Number(req.params.id);
//         if (ids.has(id)) {
//             await store.delete(id);
//             res.status(204).send();
//             ids.delete(id);
//         } else {
//             res.status(404).send();
//         }
//     } catch (error) {
//         res.status(500).send();
//     }
// })

// app.listen(port, function () {
//     console.log(`Server is running on port ${port}`)
// });

// app.post('/transfer', async (req, res) => {
//     try {
//         const { source, target } = req.body;
//         // const toTarget = await (await request(app).get(source)).text;
//         // request(app).post(target).send(toTarget).end((err) => {
//         //     if (err) {
//         //         res.status(500).send();
//         //     }
//         //     res.status(200).json(res.body);
//         // }); //request

//         //consider using store.retrieve and splicing.. looks a lot nicer

//         //create target url?

//         const data = controller.getMedia(req, res);
//         // await fetch("http://localhost:" + port + source); then delete

//         //blocking without .ok

//         const fromTarget = await fetch(target, {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//             },
//             body: JSON.stringify(data),
//         });

//         if (!fromTarget.ok) {
//             res.status(500).send();
//             //ids.delete()
//         } 

//         const response = await fromTarget.json();
//         res.status(200).json(response);

//         await fetch("http://localhost:" + port + source, {
//             method: 'DELETE',
//             headers: {
//                 'content-type': 'application/json'
//             }
//         });

//         // console.log(toTarget); 
//     } catch (error) {
//         console.log(error);
//     }
//     //don't store transfer objects in a store. 
//     //returned from target server 
// })

// module.exports = index;

// // request(app).post('/transfer)



// // if (error === `Error: cannot find media with ID: ${req.params.id}`) { 
// //     res.status(404).send();
// // }

// // const exp = require("constants");
// // const { totalmem } = require('os');



////////////////////////////////////////////////////////////////////////////

// const MediaStore = require('./store.js').MediaStore;
// const store = new MediaStore(false);

// const CommandLineHandler = require('./CommandLineHandler.js');

// const path = require('path');
// const fs = require('fs');

// if (process.argv.length !== 3) {
//     console.error('Usage is: node index.js <filepath>');
//     process.exit(1);
// }

// const filepath = process.argv[2];
// const absoluteFilepath = path.resolve(filepath); //consider commenting this out

// if (!fs.existsSync(absoluteFilepath)) {
//     console.error('File not found. Please input a correct file name');
//     process.exit(1);
// }

// const fileData = fs.readFileSync(absoluteFilepath, 'utf8');

// let jsonData;

// try {
//     jsonData = JSON.parse(fileData);
// } catch (error) {
//     console.error('Error parsing file');
//     process.exit(1);
// }

// const ids = new Set();

// // if (!validateData(jsonData)) {
// //      console.error('Data does not satisfy validation constraints');
// // }

// async function processObjects() {
//     for (const mediaObject of jsonData) {
//         try {
//             const { name, type, desc } = mediaObject;
//             const id = await store.create(name, type, desc);
//             ids.add(id); ///media/id?
//         } catch (error) {
//             console.log(`Error adding object ${mediaObject.name}`);
//             process.exit(1);
//         }
//     }
// }

// //cmdLine method? with processObjects in it? or then make cmdline be processObjects and then call server thing
// processObjects().then(() => { //maybe figure out a way to not have it nested here
//     console.log("All objects added successfully.");

//     const StoreHandler = require('./StoreHandler.js').StoreHandler;

//     const injector = new StoreHandler(store, ids);
//     const server = injector.createServer();
//     const port = 23720;

//     server.listen(port, () => {
//         console.log(`Server is listening on port: ${port}`);
//     });
// });



                    // const returnedMedia = await this.store.retrieve(id);
                    // const formattedObject = formattedMediaObject(returnedMedia);