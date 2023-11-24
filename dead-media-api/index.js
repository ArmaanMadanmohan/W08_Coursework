"use strict"

const ValidationHandler = require('./ValidationHandler.js');
const ServerHandler = require('./ServerHandler.js').ServerHandler;
const MediaStore = require('./store.js').MediaStore;

const store = new MediaStore();
const validator = new ValidationHandler(store);

//Calls the run function on the command line argument
validator.run(process.argv).then((ids) => {
    const injector = new ServerHandler(store, ids);

    //creates server using returned ID set
    const server = injector.createServer();

    //sets port number
    const port = 23720;

    server.listen(port, () => {
        console.log(`Server is listening on port: ${port}`);
    });
});