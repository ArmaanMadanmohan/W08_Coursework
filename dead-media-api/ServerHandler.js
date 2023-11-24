"use strict";

const express = require("express");
const fetch = require('node-fetch');

const ValidationHandler = require("./ValidationHandler.js");

const formattedMediaObject = media => ({
    id: `/media/${media.id}`,
    name: media.name,
    type: media.type,
    desc: media.desc,
});

class ServerHandler {

    constructor(store, ids) {
        this.store = store;
        this.ids = ids;
        this.defaultLimit = 4;
        this.defaultOffset = 0;
        this.validator = new ValidationHandler(this.store);
    }

    async getMedia(id) {
        const returnedMedia = await this.store.retrieve(id);
        const formattedObject = formattedMediaObject(returnedMedia);
        return formattedObject;
    }

    createServer() {
        const app = express();
        app.use(express.json());



        app.get('/media', async (req, res) => {
            try {
                let queryLimit = Number(req.query.limit) || this.defaultLimit;
                let queryOffset = Number(req.query.offset) || this.defaultOffset;

                const returnedObjects = await this.store.retrieveAll();

                const filteredObjects = returnedObjects.filter(mediaObject => { //encode URL?
                    const matchName = req.query.name ? mediaObject.name.toLowerCase() === req.query.name.toString().toLowerCase() : true;
                    const matchType = req.query.type ? mediaObject.type.toLowerCase() === req.query.type.toString().toLowerCase() : true;
                    const matchDesc = req.query.desc ? mediaObject.desc.toLowerCase().includes(req.query.desc.toString().toLowerCase()) : true;

                    return matchName && matchType && matchDesc;
                });

                const totalCount = filteredObjects.length;

                if (totalCount === 0) {
                    res.status(204).end();
                    return;
                }

                if (queryOffset < 0 || queryLimit < 0 || queryOffset >= totalCount) {
                    res.status(500).send();
                    return;
                }

                const paginatedResources = filteredObjects.slice(queryOffset, queryOffset + queryLimit).map(formattedMediaObject);

                const next = (queryOffset + queryLimit < totalCount) ? `/media?limit=${queryLimit}&offset=${queryOffset + queryLimit}` : null;
                const previous = (queryOffset > 0) ? `/media?limit=${queryOffset < queryLimit ? queryOffset : queryLimit}&offset=${queryOffset < queryLimit ? 0 : queryOffset - queryLimit}` : null;

                // if (paginatedResources.length === 0) { //necessary?
                //     return res.status(204).end();
                // }

                const formattedResponse = {
                    count: totalCount,
                    next: next,
                    previous: previous,
                    response: paginatedResources
                };

                res.status(200).json(formattedResponse);
            } catch (error) {
                res.status(500).send();
                return;
            }
        })

        app.get('/media/:id', async (req, res) => {
            try {
                const id = Number(req.params.id);
                if (this.ids.has(id)) {
                    const formattedObject = await this.getMedia(id);
                    res.status(200).json(formattedObject);
                }
                else {
                    res.status(404).send();
                }
            } catch (error) {
                res.status(500).send();
            }
        })

        app.put('/media/:id', async (req, res) => {
            try {
                const id = Number(req.params.id);
                if (!this.validator.isValidObject(req.body, false)) {
                    res.status(400).send();
                    return
                }

                const { name, type, desc } = req.body;

                if (this.ids.has(id)) {
                    await this.store.update(id, name, type, desc);

                    const formattedObject = await this.getMedia(id);
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
                if (this.ids.has(id)) {
                    await this.store.delete(id);
                    this.ids.delete(id);
                    res.status(204).send();
                } else {
                    res.status(404).send();
                }
            } catch (error) {
                res.status(500).send();
            }
        })

        app.post('/media', async (req, res) => {
            try {
                if (!this.validator.isValidObject(req.body, false)) {
                    res.status(400).send();
                    return;                     //where else to put return?
                }
                const { name, type, desc } = req.body;

                const createId = await this.store.create(name, type, desc);
                this.ids.add(createId);

                const formattedObject = await this.getMedia(createId);
                res.status(201).json(formattedObject);
            } catch (error) {
                res.status(500).send();
            }
        })

        app.post('/transfer', async (req, res) => {
            try {
                const { source, target } = req.body;

                const sourceRegex = /^\/media\/\d+$/;
                if (!sourceRegex.test(source)) {
                    res.status(421).send();
                    return;
                }

                const id = Number(source.split('/')[2]); 

                if (!this.ids.has(id)) {
                    res.status(404).send();
                    return;
                }

                const formattedObject = await this.getMedia(id);
                const fromTarget = await fetch(target, {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                    },
                    body: JSON.stringify(formattedObject),
                })

                const response = await fromTarget.json();

                const splitID = (response.id).split('/')[2];
                response.id = `${target}/${splitID}`;


                await this.store.delete(id);
                this.ids.delete(id);
                res.status(200).json(response); 

            } catch (error) {
                if (error instanceof fetch.FetchError) {
                    res.status(421).send();
                } else {
                    res.status(500).send();
                }
            }
        })

        return app;
    }
}

exports.ServerHandler = ServerHandler;
