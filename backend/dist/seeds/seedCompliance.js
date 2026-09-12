"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedCompliance = seedCompliance;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const tenantConnectionManager_1 = require("../services/tenantConnectionManager");
async function seedCompliance() {
    console.log('Seeding Compliance Requirements into Central DB...');
    const rulesPath = path_1.default.join(__dirname, 'rules.json');
    const rulesData = fs_1.default.readFileSync(rulesPath, 'utf8');
    const rules = JSON.parse(rulesData);
    for (const rule of rules) {
        await tenantConnectionManager_1.centralModels.ComplianceRequirement.findOneAndUpdate({ serialNo: rule.serialNo }, { $set: rule }, { upsert: true, returnDocument: 'after' });
        console.log(`Synced Compliance Rule Sr No: ${rule.serialNo}`);
    }
    console.log('Compliance requirements seeding completed.');
}
if (require.main === module) {
    seedCompliance()
        .then(() => process.exit(0))
        .catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
