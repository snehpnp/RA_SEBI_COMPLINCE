"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptCCAvenue = encryptCCAvenue;
exports.decryptCCAvenue = decryptCCAvenue;
const crypto_1 = __importDefault(require("crypto"));
function encryptCCAvenue(plainText, workingKey) {
    const m = crypto_1.default.createHash('md5');
    m.update(workingKey);
    const key = m.digest();
    const iv = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f';
    const cipher = crypto_1.default.createCipheriv('aes-128-cbc', key, iv);
    let encoded = cipher.update(plainText, 'utf8', 'hex');
    encoded += cipher.final('hex');
    return encoded;
}
function decryptCCAvenue(encText, workingKey) {
    const m = crypto_1.default.createHash('md5');
    m.update(workingKey);
    const key = m.digest();
    const iv = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f';
    const decipher = crypto_1.default.createDecipheriv('aes-128-cbc', key, iv);
    let decoded = decipher.update(encText, 'hex', 'utf8');
    decoded += decipher.final('utf8');
    return decoded;
}
