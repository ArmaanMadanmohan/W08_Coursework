"use strict";

const fs = require('fs');
const path = require('path');

class ValidationHandler { 
    constructor(store) {
        this.store = store;
        this.idsSet = new Set();
    }

    /**
     * 
     * @returns {string}
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
     * 
     * @param {*} str 
     * @returns {boolean}
     */
    validateASCII(str) { 
        const asciiRegex = /^[\x00-\x7F]*$/; 
        return asciiRegex.test(str);
    }
        
    validateDataSet(parsedData, isInitialLoad = true) {
        parsedData.forEach((item) => {
            if (!this.isValidObject(item, isInitialLoad)) {
                process.exit(1);
            }
        });
    }
    
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

    hasValidFields(data) { 
        if ((data.type === "TAPE" || data.type === "CD" || data.type === "DVD") && (data.name.length < 40) && (data.desc.length < 200)) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * 
     * @param {*} fileData 
     * @returns 
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
     * 
     * @param {*} jsonData 
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
     * 
     * @returns 
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



    // isJsonString(str) { //required?
    //     try {
    //         JSON.parse(str);
    //         return true;
    //     } catch (e) {
    //         return false;
    //     }
    // }
    


      // if (!this.isJsonString) {
            //     console.log(`Invalid data.`)
            //     process.exit(1);
            // } 


                // async clearStore(store, ids) {
    //     try {
    //         for (const id of ids) {
    //             await this.store.delete(id);
    //         }
    //         ids.clear();
            
    //     } catch (error) {
    //         console.error('Error clearing the store:', error);
    //         process.exit(1);
    //     }
    // }