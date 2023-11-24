"use strict";

const fs = require('fs');
const path = require('path');

class ValidationHandler { 
    /**
     * Constructs an instance of ValidationHandler.
     * @param {Object} store - The data store to use.
     */
    constructor(store) {
        this.store = store;
        this.idsSet = new Set();
    }

    /**
     * Validates command-line arguments.
     * @param {Array} argument - Command-line arguments.
     * @returns {string} - Absolute file path.
     */
    validateArguments(argument) {
        if (argument.length !== 3) {
            console.error('Usage is: node index.js <filepath>');
            process.exit(1); 
        }

        const filepath = argument[2];
        const absoluteFilepath = path.resolve(filepath); 

        if (!fs.existsSync(absoluteFilepath)) {
            console.error('File not found. Please input a correct file name');
            process.exit(1);
        }

        return absoluteFilepath;
    }

    /**
     * Validates whether a string only contains ASCII characters.
     * @param {*} str - Input string.
     * @returns {boolean} - Whether the string contains only ASCII (true or false).
     */
    validateASCII(str) { 
        const asciiRegex = /^[\x00-\x7F]*$/; 
        return asciiRegex.test(str);
    }
    
    /**
     * Validates a dataset of objects.
     * @param {Array} parsedData - The dataset to validate.
     * @param {boolean} isInitialLoad - Indicates if it's the initial data load.
     */
    validateDataSet(parsedData, isInitialLoad = true) {
        parsedData.forEach((item) => {
            if (!this.isValidObject(item, isInitialLoad)) {
                process.exit(1);
            }
        });
    }
    
    /**
     * Validates an individual object.
     * @param {Object} item - The object to validate.
     * @param {boolean} isInitialLoad - Indicates if it's the initial data load.
     * @returns {boolean} - True if the object is valid, false otherwise.
     */
    isValidObject(item, isInitialLoad) {
        if (!item.name || !item.type || !item.desc) {
            if (isInitialLoad) {
                console.error(`Invalid data. Please ensure all object fields are present.`);
            }
            return false;
        }
    
        if (!this.hasValidFields(item)) {
            if (isInitialLoad) {
                console.log(`Invalid data. Please ensure objects are formatted correctly.`);
            }
            return false;
        }
    
        if (!this.validateASCII(item.name) || !this.validateASCII(item.type) || !this.validateASCII(item.desc)) {
            if (isInitialLoad) {
                console.error(`Invalid data. Please only include ASCII characters.`);
            }
            return false;
        }
    
        return true;
    }

    /**
     * Checks if an object has valid fields.
     * @param {Object} data - The object to check.
     * @returns {boolean} - True if the object has valid fields, false otherwise.
     */
    hasValidFields(data) { 
        if ((data.type === "TAPE" || data.type === "CD" || data.type === "DVD") && (data.name.length < 40) && (data.desc.length < 200)) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Parses a file and returns its content as JSON.
     * @param {string} filepath - The path to the file.
     * @returns {Object} - The parsed JSON data.
     */
    parseFile(filepath) {
        try {
            const fileData = fs.readFileSync(filepath, 'utf8');
            return JSON.parse(fileData);
        } catch (error) {
            console.error('Error parsing file');
            process.exit(1);
        }
    }

    /**
     * Populates the data store with the provided dataset.
     * @param {Array} jsonData - The dataset to populate the store with.
     * @returns {Set} - The set of IDs added to the store.
     */
    async populateStore(jsonData) { 
        this.validateDataSet(jsonData)
        for (const mediaObject of jsonData) {
            const { name, type, desc } = mediaObject;
            const id = await this.store.create(name, type, desc);
            this.idsSet.add(id);
        }
        return this.idsSet; 
    }

    /**
     * Runs the validation and data population process.
     * @param {Array} argument - The command-line arguments.
     * @returns {Set} - The set of IDs added to the store.
     */
    async run(argument) {
        const filepath = this.validateArguments(argument);
        const jsonData = this.parseFile(filepath);

        const idValues = await this.populateStore(jsonData);

        console.log('All objects added successfully.');
        return idValues;
    }
}

module.exports = ValidationHandler;