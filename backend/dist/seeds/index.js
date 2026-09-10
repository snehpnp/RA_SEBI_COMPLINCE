"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAllSeeds = runAllSeeds;
const seedInitial_1 = require("./seedInitial");
const seedCompliance_1 = require("./seedCompliance");
const seedStates_1 = require("./seedStates");
const tenantConnectionManager_1 = require("../services/tenantConnectionManager");
async function runAllSeeds() {
    console.log('--- Starting Complete Mongoose Database Seeding ---');
    try {
        await (0, seedInitial_1.seedInitial)();
        await (0, seedCompliance_1.seedCompliance)();
        await (0, seedStates_1.seedStates)();
        console.log('--- All Seeders Completed Successfully ---');
    }
    catch (error) {
        console.error('Error during database seeding:', error);
        throw error;
    }
}
if (require.main === module) {
    runAllSeeds()
        .then(async () => {
        await tenantConnectionManager_1.centralConnection.close();
        process.exit(0);
    })
        .catch(async (err) => {
        console.error(err);
        await tenantConnectionManager_1.centralConnection.close();
        process.exit(1);
    });
}
