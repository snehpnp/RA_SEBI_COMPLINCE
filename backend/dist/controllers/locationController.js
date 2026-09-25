"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStates = void 0;
const db_1 = __importDefault(require("../config/db"));
const stateService_1 = require("../services/stateService");
const getStates = async (req, res) => {
    try {
        let states = await db_1.default.State.find({ isActive: true })
            .sort({ name: 1 })
            .lean();
        if (states.length === 0) {
            await (0, stateService_1.ensureStates)(db_1.default.State);
            states = await db_1.default.State.find({ isActive: true })
                .sort({ name: 1 })
                .lean();
        }
        res.json({ success: true, data: states });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch states', error: error.message });
    }
};
exports.getStates = getStates;
