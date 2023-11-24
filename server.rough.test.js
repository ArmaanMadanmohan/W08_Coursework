const request = require('supertest');
const ServerHandler = require('./ServerHandler').ServerHandler;
const MediaStore = require('./store').MediaStore;
const validator = require('./ValidationHandler');

const mockStore = new MediaStore();
const filepath = '../data/deadmedia.json';

let app;
let server;
let jsonData;
let ids = new Set();

// const mockValidator = new ValidationHandler(mockStore);

beforeEach(async () => {
    jsonData = validator.parseFile(filepath);

    await validator.populateStore(jsonData, mockStore, ids).then((returnedIDs) => {
        const serverHandler = new ServerHandler(mockStore, returnedIDs)
        // console.log(ids)
        app = serverHandler.createServer()
        server = app.listen(23720)
    })
})

afterEach(async () => {
    server.close();
    await validator.clearStore(mockStore, ids)
})

describe('GET /media', () => {
    it('should respond with a paginated list of media objects', async () => {
        const response = await request(app).get('/media')
        expect(response.statusCode).toBe(200);
    });
});  

describe('GET /media:id', () =>  {
    it('should respond with a media object', async () => {
        const response = await request(app).get('/media/5')
        expect(response.statusCode).toBe(200)
        expect(response.body).toEqual({
            id: '/media/5',
            name: 'Blade Runner 2049',
            type: 'DVD',
            desc: 'Visually stunning sci-fi film sequel.'
          })
    })

    it('should output a 404 error', async () => {
        const response = await request(app).get('/media/30')
        console.log(response.body)
        expect(response.statusCode).toBe(404)
    })
})

//manipulate store
//can input data using processObjects