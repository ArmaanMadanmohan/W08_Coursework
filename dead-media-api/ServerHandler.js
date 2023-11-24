"use strict";

const express = require("express");
const fetch = require('node-fetch');

const ValidationHandler = require("./ValidationHandler.js");

/**
 * Formats a media object for response.
 * @param {Object} media - The media object to format.
 * @returns {Object} - The formatted media object.
 */
const formattedMediaObject = media => ({
    id: `/media/${media.id}`,
    name: media.name,
    type: media.type,
    desc: media.desc,
});

class ServerHandler {

    /**
     * Constructs a ServerHandler instance.
     * @param {Object} store - The data store to use.
     * @param {Set} ids - The set of IDs.
     */
    constructor(store, ids) {
        this.store = store;
        this.ids = ids;
        this.defaultLimit = 4;
        this.defaultOffset = 0;
        this.validator = new ValidationHandler(this.store);
    }

    /**
     * Retrieves a formatted media object by ID.
     * @param {number} id - The ID of the media object.
     * @returns {Object} - The formatted media object.
     */
    async getMedia(id) {
        const returnedMedia = await this.store.retrieve(id);
        const formattedObject = formattedMediaObject(returnedMedia);
        return formattedObject;
    }

    /**
     * Creates an Express server.
     * @returns {Object} - The Express app.
     */
    createServer() {
        const app = express();
        app.use(express.json());

        // GET endpoint for retrieving media objects with optional query parameters
        app.get('/media', async (req, res) => {
            try {
                let queryLimit = Number(req.query.limit) || this.defaultLimit;
                let queryOffset = Number(req.query.offset) || this.defaultOffset;

                const returnedObjects = await this.store.retrieveAll();

                const filteredObjects = returnedObjects.filter(mediaObject => { //encode URL?
                    const matchName = req.query.name ? mediaObject.name.toLowerCase() === decodeURIComponent(req.query.name).toLowerCase() : true;
                    const matchType = req.query.type ? mediaObject.type.toLowerCase() === decodeURIComponent(req.query.type).toLowerCase() : true;
                    const matchDesc = req.query.desc ? mediaObject.desc.toLowerCase().includes(decodeURIComponent(req.query.desc).toLowerCase()) : true;

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
        
        // GET endpoint for retrieving a single media object by ID
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

        // PUT endpoint for updating a media object by ID
        app.put('/media/:id', async (req, res) => {
            try {
                const id = Number(req.params.id);
                if (!this.validator.isValidObject(req.body, false)) {
                    res.status(400).send();
                    return;
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

        // DELETE endpoint for deleting a media object by ID
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

        // POST endpoint for creating a new media object
        app.post('/media', async (req, res) => {
            try {
                if (!this.validator.isValidObject(req.body, false)) {
                    res.status(400).send();
                    return;
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

        // POST endpoint for transferring a media object to another server
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
