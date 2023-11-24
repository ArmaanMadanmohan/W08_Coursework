const request = require('supertest');
const ServerHandler = require('./ServerHandler').ServerHandler;
const MediaStore = require('./store').MediaStore;
const ValidationHandler = require('./ValidationHandler');

const filepath = '../data/deadmedia.json';

let app;
let server;
let jsonData;
let mockStore;
let validator;

//test with other people (R10)
//when running test suite, why do two console.logs show up?

beforeEach(async () => {
    mockStore = new MediaStore();
    validator = new ValidationHandler(mockStore);
    jsonData = validator.parseFile(filepath);

    await validator.populateStore(jsonData).then((returnedIDs) => {
        const serverHandler = new ServerHandler(mockStore, returnedIDs);
        app = serverHandler.createServer();
        server = app.listen(23720);
    })
})

afterEach(async () => {
    server.close();
})

describe('GET /media', () => { //URI Component testing
    it('should respond with a paginated list of media objects', async () => {
        const response = await request(app).get('/media')
        expect(response.statusCode).toBe(200);
    });

    it('should return a 204 status for successful retrieval', async () => {
        server.close()
        jsonMedia = [{
            "name": "Pink Floyd - The Wall",
            "type": "CD",
            "desc": "Concept album and rock opera by Pink Floyd."
        }]
        mockStore = new MediaStore();

        const ids = await validator.populateStore(jsonMedia);
        const serverHandler = new ServerHandler(mockStore, ids);
        app = serverHandler.createServer();
        server = app.listen(23720);

        await request(app).delete('/media/0')
        const response = await request(app).get('/media')
        expect(response.statusCode).toBe(204)
    })

    it('should respond with the first 2 objects', async () => {
        const response = await request(app).get('/media?limit=2&offset=0')
        expect(response.body).toEqual({
            "count": 20,
            "next": "/media?limit=2&offset=2",
            "previous": null,
            "response": [
                {
                    "id": "/media/0",
                    "name": "Radiohead - OK Computer",
                    "type": "CD",
                    "desc": "Iconic alternative rock album by Radiohead."
                },
                {
                    "id": "/media/1",
                    "name": "Pulp Fiction",
                    "type": "DVD",
                    "desc": "Quentin Tarantino's cult classic crime film."
                }
            ]
        })
    })

    it('should only respond with remaining objects if offset + limit out of bounds', async () => {
        const response = await request(app).get('/media?limit=6&offset=16')
        expect(response.body).toEqual({
            "count": 20,
            "next": null,
            "previous": "/media?limit=6&offset=10",
            "response": [
                {
                    "id": "/media/16",
                    "name": "The Prodigy - The Fat of the Land",
                    "type": "CD",
                    "desc": "Electronic music album by The Prodigy."
                },
                {
                    "id": "/media/17",
                    "name": "Pulp - Different Class",
                    "type": "CD",
                    "desc": "Britpop album by Pulp."
                },
                {
                    "id": "/media/18",
                    "name": "Trainspotting",
                    "type": "DVD",
                    "desc": "Cult British film about addiction and friendship."
                },
                {
                    "id": "/media/19",
                    "name": "Gorillaz - Demon Days",
                    "type": "CD",
                    "desc": "Alternative hip-hop album by Gorillaz."
                }
            ]
        })
    })

    it('should correctly respond with "previous" if limit means it would go out of bounds', async () => {
        const response = await request(app).get('/media?limit=4&offset=2')
        expect(response.body.previous).toEqual("/media?limit=2&offset=0")
    })

    it('should return a 500 status with error mode on', async () => {
        const response = await request(app).get('/media?limit=2&offset=20')
        expect(response.statusCode).toBe(500)
    })

    it('should handle name query correctly', async () => {
        const response = await request(app).get('/media?name=fight%20club')
        expect(response.body).toEqual({
            "count": 1,
            "next": null,
            "previous": null,
            "response": [
                {
                    "id": "/media/3",
                    "name": "Fight Club",
                    "type": "DVD",
                    "desc": "Edgy film about an underground fight club."
                }
            ]
        })
    })

    it('should handle type query correctly', async () => {
        const response = await request(app).get('/media?type=dvd')
        expect(response.body.count).toBe(9)
    })

    it('should handle desc query correctly', async () => {
        const response = await request(app).get('/media?desc=trip-hop')
        expect(response.body).toEqual({
            "count": 1,
            "next": null,
            "previous": null,
            "response": [
                {
                    "id": "/media/14",
                    "name": "Massive Attack - Mezzanine",
                    "type": "CD",
                    "desc": "Trip-hop masterpiece by Massive Attack."
                }
            ]
        })
    })

    it('should handle all queries together', async () => {
        const response = await request(app).get('/media?type=dvd&name=trainspotting&desc=british')
        expect(response.body).toEqual({
            "count": 1,
            "next": null,
            "previous": null,
            "response": [
                {
                    "id": "/media/18",
                    "name": "Trainspotting",
                    "type": "DVD",
                    "desc": "Cult British film about addiction and friendship."
                }
            ]
        })
    })

    it('should handle search queries alongside limit and offset', async () => {
        const response = await request(app).get('/media?type=dvd&limit=2');
        expect(response.body).toEqual({
            "count": 9,
            "next": "/media?limit=2&offset=2",
            "previous": null,
            "response": [
                {
                    "id": "/media/1",
                    "name": "Pulp Fiction",
                    "type": "DVD",
                    "desc": "Quentin Tarantino's cult classic crime film."
                },
                {
                    "id": "/media/3",
                    "name": "Fight Club",
                    "type": "DVD",
                    "desc": "Edgy film about an underground fight club."
                }
            ]
        })
    })

    it('should handle queries with only limit specified', async () => {
        const response = await request(app).get('/media/?limit=2');
        expect(response.body).toEqual({
            "count": 20,
            "next": "/media?limit=2&offset=2",
            "previous": null,
            "response": [
                {
                    "id": "/media/0",
                    "name": "Radiohead - OK Computer",
                    "type": "CD",
                    "desc": "Iconic alternative rock album by Radiohead."
                },
                {
                    "id": "/media/1",
                    "name": "Pulp Fiction",
                    "type": "DVD",
                    "desc": "Quentin Tarantino's cult classic crime film."
                }
            ]
        })
    })

    it('should handle queries with only offset specified', async () => {
        const response = await request(app).get('/media?offset=2');
        expect(response.body).toEqual({
            "count": 20,
            "next": "/media?limit=4&offset=6",
            "previous": "/media?limit=2&offset=0",
            "response": [
                {
                    "id": "/media/2",
                    "name": "Pink Floyd - The Wall",
                    "type": "CD",
                    "desc": "Concept album and rock opera by Pink Floyd."
                },
                {
                    "id": "/media/3",
                    "name": "Fight Club",
                    "type": "DVD",
                    "desc": "Edgy film about an underground fight club."
                },
                {
                    "id": "/media/4",
                    "name": "Beastie Boys - Licensed to Ill",
                    "type": "CD",
                    "desc": "Debut hip-hop album by the Beastie Boys."
                },
                {
                    "id": "/media/5",
                    "name": "Blade Runner 2049",
                    "type": "DVD",
                    "desc": "Visually stunning sci-fi film sequel."
                }
            ]
        })
    })

    it('should handle case insensitive searches', async () => {
        const response = await request(app).get('/media?name=iNcEPTion');
        expect(response.body).toEqual({
            "count": 1,
            "next": null,
            "previous": null,
            "response": [
                {
                    "id": "/media/9",
                    "name": "Inception",
                    "type": "DVD",
                    "desc": "Mind-bending science fiction film by Christopher Nolan."
                }
            ]
        })
    })

    it('should handle URL-encoded query parameters', async () => {
        const response = await request(app)
            .get('/media')
            .query({ name: encodeURIComponent('Pulp Fiction'), type: encodeURIComponent('DVD') });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            "count": 1,
            "next": null,
            "previous": null,
            "response": [
              {
                "id": "/media/1",
                "name": "Pulp Fiction",
                "type": "DVD",
                "desc": "Quentin Tarantino's cult classic crime film."
              }
            ]
          })
    });

});

describe('GET /media:id', () => {
    it('should return a 200 status for successful media retrieval', async () => {
        const response = await request(app).get('/media/5');
        expect(response.statusCode).toBe(200);
    })

    it('should respond with a media object', async () => {
        const response = await request(app).get('/media/5');
        expect(response.body).toEqual({
            "id": '/media/5',
            "name": 'Blade Runner 2049',
            "type": 'DVD',
            "desc": 'Visually stunning sci-fi film sequel.'
        })
    })

    it('should return a 404 status if the media does not exist', async () => {
        const response = await request(app).get('/media/21');
        expect(response.statusCode).toBe(404);
    })

    it('should return a 500 status with error mode on', async () => {
        mockStore.errorModeOn = true;
        const response = await request(app).get('/media/5');
        expect(response.statusCode).toBe(500);
    })
})

describe('POST /media', () => {
    it('should return a 201 status for successful media addition', async () => {
        jsonMedia = {
            "name": "The Lighthouse",
            "type": "DVD",
            "desc": "Psychological thriller starring Willem Dafoe and Robert Pattinson"
        }
        const response = await request(app).post('/media').send(jsonMedia);
        expect(response.statusCode).toBe(201);
    })

    it('should respond with a new media object', async () => {
        jsonMedia = {
            "name": "The Lighthouse",
            "type": "DVD",
            "desc": "Psychological thriller starring Willem Dafoe and Robert Pattinson"
        }
        const response = await request(app).post('/media').send(jsonMedia);
        expect(response.body).toEqual({
            "id": "/media/20",
            "name": "The Lighthouse",
            "type": "DVD",
            "desc": "Psychological thriller starring Willem Dafoe and Robert Pattinson"
        })
    })

    it('should return a 400 status for wrong fields', async () => {
        jsonMedia = {
            "type": "DVD",
            "desc": "Psychological thriller starring Willem Dafoe and Robert Pattinson"
        }
        const response = await request(app).post('/media').send(jsonMedia);
        expect(response.statusCode).toBe(400);
    })

    it('should return a 400 status for non-ASCII characters', async () => {
        jsonMedia = {
            "name": "The ⚓⚓⚓⚓Light⚓⚓⚓⚓⚓house⚓",
            "type": "DV⚓⚓D",
            "desc": "Psychol⚓⚓⚓ogical thri⚓⚓⚓⚓ller starring⚓⚓⚓⚓ Willem⚓⚓⚓⚓ Dafoe and Robert Pattinson"
        }
        const response = await request(app).post('/media').send(jsonMedia);
        expect(response.statusCode).toBe(400);
    })

    it('should return a 500 status with error mode on', async () => {
        jsonMedia = {
            "name": "The Lighthouse",
            "type": "DVD",
            "desc": "Psychological thriller starring Willem Dafoe and Robert Pattinson"
        }
        mockStore.errorModeOn = true;
        const response = await request(app).post('/media').send(jsonMedia);
        expect(response.statusCode).toBe(500);
    })

    it('should allow for a TAPE type to be added', async () => {
        jsonMedia = {
            "name": "VHS101",
            "type": "TAPE",
            "desc": "Recording of Christmas dinner with family."
        }
        const response = await request(app).post('/media').send(jsonMedia);
        expect(response.statusCode).toBe(201)
    })
})

describe('POST /transfer', () => {
    it('should return a 404 status if the media object does not exist', async () => {
        jsonMedia = {
            "source": "/media/30",
            "target": "http://localhost:23720/media"
        }
        const response = await request(app).post('/transfer').send(jsonMedia);
        expect(response.statusCode).toBe(404);
    })

    it('should return a 200 status for a successful transfer', async () => {
        jsonMedia = {
            "source": "/media/18",
            "target": "http://localhost:23720/media"
        }
        const response = await request(app).post('/transfer').send(jsonMedia);
        expect(response.statusCode).toBe(200);
    })

    it('should respond with the transferred media object', async () => {
        jsonMedia = {
            "source": "/media/7",
            "target": "http://localhost:23720/media"
        }
        const response = await request(app).post('/transfer').send(jsonMedia);
        expect(response.body).toEqual({
            "id": "http://localhost:23720/media/20",
            "name": "The Matrix",
            "type": "DVD",
            "desc": "Mind-bending science fiction action film."
        })
    })

    it('should return a 421 status for an incorrect target URL', async () => {
        jsonMedia = {
            "source": "/media/18",
            "target": "http://wrong/media"
        }
        const response = await request(app).post('/transfer').send(jsonMedia);
        expect(response.statusCode).toBe(421);
    })

    it('should return a 421 status for an incorrect source URL', async () => {
        jsonMedia = {
            "source": "blahblah/media/18",
            "target": "http://localhost:23720/media"
        }
        const response = await request(app).post('/transfer').send(jsonMedia);
        expect(response.statusCode).toBe(421);
    })

    it('should return a 404 status when using GET after transferring', async () => {
        jsonMedia = {
            "source": "/media/7",
            "target": "http://localhost:23720/media"
        }
        await request(app).post('/transfer').send(jsonMedia);
        const response = await request(app).post('/transfer').send(jsonMedia);
        expect(response.statusCode).toBe(404);
    })

    it('should return a 500 status with error mode on', async () => {
        jsonMedia = {
            "source": "/media/18",
            "target": "http://localhost:23720/media"
        }
        mockStore.errorModeOn = true;
        const response = await request(app).post('/transfer').send(jsonMedia);
        expect(response.statusCode).toBe(500);
    })
})

describe('PUT /media/:id', () => {
    it('should return a 200 status for successfully updating media', async () => {
        jsonMedia = {
            "name": "Electric Light Orchestra - Time",
            "type": "CD",
            "desc": "Retrofuturistic album, characterised by it's heavy use of synthesisers, with a large cult following"
        }
        const response = await request(app).put('/media/4').send(jsonMedia);
        expect(response.statusCode).toBe(200);
    })

    it('should respond with an updated media object', async () => {
        jsonMedia = {
            "name": "Electric Light Orchestra - Time",
            "type": "CD",
            "desc": "Retrofuturistic album, characterised by it's heavy use of synthesisers, with a large cult following"
        }
        const response = await request(app).put('/media/4').send(jsonMedia);
        expect(response.body).toEqual({
            "id": "/media/4",
            "name": "Electric Light Orchestra - Time",
            "type": "CD",
            "desc": "Retrofuturistic album, characterised by it's heavy use of synthesisers, with a large cult following"
        })
    })

    it('should return a 400 status for wrong fields', async () => {
        jsonMedia = {
            "type": "DVD",
            "desc": "Psychological thriller starring Willem Dafoe and Robert Pattinson"
        }
        const response = await request(app).put('/media/1').send(jsonMedia);
        expect(response.statusCode).toBe(400);
    })

    it('should return a 400 status for non-ASCII characters', async () => {
        jsonMedia = {
            "name": "The ⚓⚓⚓⚓Light⚓⚓⚓⚓⚓house⚓",
            "type": "DV⚓⚓D",
            "desc": "Psychol⚓⚓⚓ogical thri⚓⚓⚓⚓ller starring⚓⚓⚓⚓ Willem⚓⚓⚓⚓ Dafoe and Robert Pattinson"
        }
        const response = await request(app).put('/media/1').send(jsonMedia);
        expect(response.statusCode).toBe(400);
    })

    it('should return a 404 status if the media to be changed does not exist', async () => {
        jsonMedia = {
            "name": "Electric Light Orchestra - Time",
            "type": "CD",
            "desc": "Retrofuturistic album, characterised by it's heavy use of synthesisers, with a large cult following"
        }
        const response = await request(app).put('/media/30').send(jsonMedia);
        expect(response.statusCode).toBe(404);
    })

    it('should return a 500 status with error mode on', async () => {
        jsonMedia = {
            "name": "Electric Light Orchestra - Time",
            "type": "CD",
            "desc": "Retrofuturistic album, characterised by it's heavy use of synthesisers, with a large cult following"
        }
        mockStore.errorModeOn = true;
        const response = await request(app).put('/media/4').send(jsonMedia);
        expect(response.statusCode).toBe(500);
    })
})

describe('DELETE /media/:id', () => {
    it('should return a 204 status for successful deletion', async () => {
        const response = await request(app).delete('/media/4');
        expect(response.statusCode).toBe(204);
    })

    it('should delete the resource properly', async () => {
        await request(app).delete('/media/4');
        const response = await request(app).get('/media/4');
        expect(response.statusCode).toBe(404);
    })

    it('should return a 404 status if the media does not exist', async () => {
        const response = await request(app).delete('/media/30');
        expect(response.statusCode).toBe(404);
    })

    it('should return a 500 status with error mode on', async () => {
        mockStore.errorModeOn = true;
        const response = await request(app).delete('/media/4');
        expect(response.statusCode).toBe(500);
    })
})

describe('validation', () => {
    it('tests with incorrect argument length', () => {
        const mockExit = jest.spyOn(process, 'exit').mockImplementation((number) => { throw new Error('process.exit: ' + number); });
        expect(() => {
            validator.validateArguments(["node", "index.js"]);
        })
            .toThrow();
        expect(mockExit).toHaveBeenCalledWith(1);
        mockExit.mockRestore();
    })

    it('tests with incorrect filepath', () => {
        const mockExit = jest.spyOn(process, 'exit').mockImplementation((number) => { throw new Error('process.exit: ' + number); });
        expect(() => {
            validator.validateArguments(["node", "index.js", `wrong/${filepath}`]);
        })
            .toThrow();
        expect(mockExit).toHaveBeenCalledWith(1);
        mockExit.mockRestore();
    })

    it('tests ASCII functionality', () => {
        expect(validator.validateASCII("The Northµman")).toBe(false);
    })

    it('tests store populate functionality', async () => {
        jsonMedia = [
          {
            "name": "David Bowie - Ziggy Stardust",
            "type": "CD",
            "desc": "Iconic glam rock concept album."
          },
          {
            "name": "Electric Light Orchestra - Time",
            "type": "CD",
            "desc": "Retrofuturistic album, characterised by it's heavy use of synthesisers, with a large cult following"
          }
        ]
        const idsSet = await validator.populateStore(jsonMedia);
        expect(idsSet.has(20)).toBe(true); 
        expect(idsSet.has(21)).toBe(true);
        expect(idsSet.has(22)).toBe(false);
    })
})

//difficult to track console.log output