"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.INDIAN_STATES = void 0;
exports.ensureStates = ensureStates;
exports.detectStateFromGst = detectStateFromGst;
exports.detectStateFromText = detectStateFromText;
const db_1 = __importDefault(require("../config/db"));
exports.INDIAN_STATES = [
    { name: 'Andaman and Nicobar Islands', gstCode: '35' },
    { name: 'Andhra Pradesh', gstCode: '37' },
    { name: 'Arunachal Pradesh', gstCode: '12' },
    { name: 'Assam', gstCode: '18' },
    { name: 'Bihar', gstCode: '10' },
    { name: 'Chandigarh', gstCode: '04' },
    { name: 'Chhattisgarh', gstCode: '22' },
    { name: 'Dadra and Nagar Haveli and Daman and Diu', gstCode: '26' },
    { name: 'Delhi', gstCode: '07' },
    { name: 'Goa', gstCode: '30' },
    { name: 'Gujarat', gstCode: '24' },
    { name: 'Haryana', gstCode: '06' },
    { name: 'Himachal Pradesh', gstCode: '02' },
    { name: 'Jammu and Kashmir', gstCode: '01' },
    { name: 'Jharkhand', gstCode: '20' },
    { name: 'Karnataka', gstCode: '29' },
    { name: 'Kerala', gstCode: '32' },
    { name: 'Ladakh', gstCode: '38' },
    { name: 'Lakshadweep', gstCode: '31' },
    { name: 'Madhya Pradesh', gstCode: '23' },
    { name: 'Maharashtra', gstCode: '27' },
    { name: 'Manipur', gstCode: '14' },
    { name: 'Meghalaya', gstCode: '17' },
    { name: 'Mizoram', gstCode: '15' },
    { name: 'Nagaland', gstCode: '13' },
    { name: 'Odisha', gstCode: '21' },
    { name: 'Puducherry', gstCode: '34' },
    { name: 'Punjab', gstCode: '03' },
    { name: 'Rajasthan', gstCode: '08' },
    { name: 'Sikkim', gstCode: '11' },
    { name: 'Tamil Nadu', gstCode: '33' },
    { name: 'Telangana', gstCode: '36' },
    { name: 'Tripura', gstCode: '16' },
    { name: 'Uttar Pradesh', gstCode: '09' },
    { name: 'Uttarakhand', gstCode: '05' },
    { name: 'West Bengal', gstCode: '19' },
];
/**
 * Ensures the State collection in the given PrismaClient (or default DB)
 * is populated with all Indian States and their GST codes.
 */
async function ensureStates(client = db_1.default) {
    try {
        for (const state of exports.INDIAN_STATES) {
            await client.state.upsert({
                where: { name: state.name },
                update: {
                    gstCode: state.gstCode,
                    isActive: true
                },
                create: {
                    name: state.name,
                    gstCode: state.gstCode,
                    isActive: true
                }
            });
        }
        console.log(`[StateService] Indian states collection successfully verified/seeded (${exports.INDIAN_STATES.length} states).`);
    }
    catch (err) {
        console.error('[StateService] Failed to seed states:', err.message);
    }
}
/**
 * Detect state name from GSTIN (using first 2 numeric characters).
 */
function detectStateFromGst(gstin) {
    if (!gstin || typeof gstin !== 'string')
        return null;
    const clean = gstin.trim();
    if (clean.length < 2)
        return null;
    const code = clean.substring(0, 2);
    const found = exports.INDIAN_STATES.find(s => s.gstCode === code);
    return found ? found.name : null;
}
/**
 * Detect state from an address or free text string.
 */
function detectStateFromText(text) {
    if (!text || typeof text !== 'string')
        return null;
    const upper = text.toUpperCase();
    // Try exact or substring matches for state names
    for (const s of exports.INDIAN_STATES) {
        const sNameUpper = s.name.toUpperCase();
        if (upper.includes(sNameUpper)) {
            return s.name;
        }
    }
    // Common aliases
    if (upper.includes('MUMBAI') || upper.includes('PUNE') || upper.includes('NAGPUR') || upper.includes('THANE') || upper.includes('NAVI MUMBAI')) {
        return 'Maharashtra';
    }
    if (upper.includes('NEW DELHI') || upper.includes('DELHI NCR') || upper.includes('NOIDA') || upper.includes('GURGAON') || upper.includes('GURUGRAM')) {
        if (upper.includes('NOIDA'))
            return 'Uttar Pradesh';
        if (upper.includes('GURGAON') || upper.includes('GURUGRAM'))
            return 'Haryana';
        return 'Delhi';
    }
    if (upper.includes('BENGALURU') || upper.includes('BANGALORE')) {
        return 'Karnataka';
    }
    if (upper.includes('HYDERABAD') || upper.includes('SECUNDERABAD')) {
        return 'Telangana';
    }
    if (upper.includes('CHENNAI') || upper.includes('COIMBATORE')) {
        return 'Tamil Nadu';
    }
    if (upper.includes('AHMEDABAD') || upper.includes('SURAT') || upper.includes('VADODARA') || upper.includes('RAJKOT')) {
        return 'Gujarat';
    }
    if (upper.includes('KOLKATA') || upper.includes('CALCUTTA')) {
        return 'West Bengal';
    }
    if (upper.includes('JAIPUR') || upper.includes('UDAIPUR') || upper.includes('JODHPUR')) {
        return 'Rajasthan';
    }
    if (upper.includes('LUCKNOW') || upper.includes('KANPUR') || upper.includes('VARANASI') || upper.includes('AGRA')) {
        return 'Uttar Pradesh';
    }
    if (upper.includes('CHANDIGARH')) {
        return 'Chandigarh';
    }
    return null;
}
