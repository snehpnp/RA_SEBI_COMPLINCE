"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateNextDueDate = exports.getCompliancePeriod = exports.calculateRawNextDueDate = exports.getRawCompliancePeriod = exports.getAlertThresholdsForFrequency = void 0;
const getAlertThresholdsForFrequency = (frequency) => {
    const lowerFreq = frequency.toLowerCase();
    // Yearly / Annually
    if (lowerFreq.includes('annual') || lowerFreq.includes('yearly') || lowerFreq.includes('365')) {
        return { low: 90, moderate: 60, high: 30 }; // 3 months, 2 months, 1 month
    }
    // Half-yearly
    if (lowerFreq.includes('half') || lowerFreq.includes('6 months')) {
        return { low: 45, moderate: 30, high: 15 }; // 1.5 months, 1 month, 15 days
    }
    // Quarterly
    if (lowerFreq.includes('quarter') || lowerFreq.includes('3 months')) {
        return { low: 30, moderate: 15, high: 7 }; // 1 month, 15 days, 7 days
    }
    // Monthly
    if (lowerFreq.includes('month') || lowerFreq.includes('30 days')) {
        return { low: 10, moderate: 5, high: 2 }; // 10 days, 5 days, 2 days
    }
    // Very short term / Event based
    if (lowerFreq.includes('21 days') || lowerFreq.includes('15 days') || lowerFreq.includes('10 days') || lowerFreq.includes('7 days')) {
        return { low: 7, moderate: 3, high: 1 };
    }
    // Default fallback for continuous/others
    return { low: 30, moderate: 15, high: 3 };
};
exports.getAlertThresholdsForFrequency = getAlertThresholdsForFrequency;
/**
 * Calculates the current period start date, end date, and label based on frequency type.
 */
const getRawCompliancePeriod = (frequencyType, refDate) => {
    const now = refDate ? new Date(refDate) : new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed: 0 = Jan, 11 = Dec
    const freq = (frequencyType || '').toUpperCase();
    // CONTINUOUS, MONTHLY, AS_APPLICABLE, EVERY_REPORT are all treated monthly
    if (freq === 'CONTINUOUS' || freq === 'MONTHLY' || freq === 'AS_APPLICABLE' || freq === 'EVERY_REPORT') {
        const startDate = new Date(year, month, 1, 0, 0, 0, 0);
        let dueDate;
        if (freq === 'MONTHLY') {
            dueDate = new Date(year, month, 7, 23, 59, 59, 999);
        }
        else {
            // Last day of current month
            dueDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
        }
        const label = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); // e.g. "Jun 2026"
        return { startDate, dueDate, label };
    }
    if (freq === 'HALF_YEARLY') {
        if (month >= 3 && month <= 8) {
            // April 1st to September 30th
            const startDate = new Date(year, 3, 1, 0, 0, 0, 0);
            const dueDate = new Date(year, 8, 30, 23, 59, 59, 999);
            const label = `Apr-Sep ${year}`;
            return { startDate, dueDate, label };
        }
        else if (month >= 9) {
            // October 1st to December 31st (due next calendar year March 31st)
            const startDate = new Date(year, 9, 1, 0, 0, 0, 0);
            const dueDate = new Date(year + 1, 2, 31, 23, 59, 59, 999);
            const label = `Oct ${year}-Mar ${year + 1}`;
            return { startDate, dueDate, label };
        }
        else {
            // January 1st to March 31st (due current calendar year March 31st)
            const startDate = new Date(year - 1, 9, 1, 0, 0, 0, 0);
            const dueDate = new Date(year, 2, 31, 23, 59, 59, 999);
            const label = `Oct ${year - 1}-Mar ${year}`;
            return { startDate, dueDate, label };
        }
    }
    if (freq === 'ANNUAL') {
        if (month >= 3) {
            // April 1st to March 31st next year
            const startDate = new Date(year, 3, 1, 0, 0, 0, 0);
            const dueDate = new Date(year + 1, 2, 31, 23, 59, 59, 999);
            const label = `FY ${year}-${(year + 1).toString().slice(-2)}`;
            return { startDate, dueDate, label };
        }
        else {
            // January 1st to March 31st current year (started last year April 1st)
            const startDate = new Date(year - 1, 3, 1, 0, 0, 0, 0);
            const dueDate = new Date(year, 2, 31, 23, 59, 59, 999);
            const label = `FY ${year - 1}-${year.toString().slice(-2)}`;
            return { startDate, dueDate, label };
        }
    }
    // Fallback
    const startDate = new Date(year, month, 1, 0, 0, 0, 0);
    const dueDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const label = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return { startDate, dueDate, label };
};
exports.getRawCompliancePeriod = getRawCompliancePeriod;
/**
 * Calculates the next due date based on the rule's frequencyType.
 * Reference Date 'now' can be passed for testability.
 */
const calculateRawNextDueDate = (frequencyType, serialNo, refDate) => {
    const now = refDate ? new Date(refDate) : new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed: 0 = Jan, 3 = Apr, 8 = Sep, 9 = Oct
    const freq = (frequencyType || '').toUpperCase();
    // 1. Continuous Compliance -> Monthly (due last day of current month)
    if (freq === 'CONTINUOUS' || freq === 'AS_APPLICABLE' || freq === 'EVERY_REPORT') {
        return new Date(year, month + 1, 0, 23, 59, 59, 999);
    }
    // 2. Half-Yearly Compliance
    // Period 1: Start Apr 01 -> Due Sep 30
    // Period 2: Start Oct 01 -> Due Mar 31
    if (freq === 'HALF_YEARLY') {
        if (month >= 3 && month <= 8) {
            // April 1st to September 30th
            return new Date(year, 8, 30, 23, 59, 59, 999);
        }
        else if (month >= 9) {
            // October 1st to December 31st (due next calendar year March 31st)
            return new Date(year + 1, 2, 31, 23, 59, 59, 999);
        }
        else {
            // January 1st to March 31st (due current calendar year March 31st)
            return new Date(year, 2, 31, 23, 59, 59, 999);
        }
    }
    // 4. Monthly Compliance
    // Start: 1st of every month -> Due: 7th of the month
    if (freq === 'MONTHLY') {
        const thisMonth7th = new Date(year, month, 7, 23, 59, 59, 999);
        if (now > thisMonth7th) {
            return new Date(year, month + 1, 7, 23, 59, 59, 999);
        }
        return thisMonth7th;
    }
    // 6. Annual Compliance
    // Start: Apr 01 -> Due: Mar 31 of next year
    if (freq === 'ANNUAL') {
        if (month >= 3) {
            // April to December -> Ends next calendar year March 31st
            return new Date(year + 1, 2, 31, 23, 59, 59, 999);
        }
        else {
            // January to March -> Ends current calendar year March 31st
            return new Date(year, 2, 31, 23, 59, 59, 999);
        }
    }
    // Fallback for legacy rule handling by Serial Number
    if (serialNo === 46 || serialNo === 57) {
        // Annual compliance audit -> March 31
        const march31ThisYear = new Date(year, 2, 31, 23, 59, 59, 999);
        if (now > march31ThisYear) {
            return new Date(year + 1, 2, 31, 23, 59, 59, 999);
        }
        return march31ThisYear;
    }
    if (serialNo === 47 || serialNo === 58) {
        // Audit completion timeline -> Sep 30
        const sep30ThisYear = new Date(year, 8, 30, 23, 59, 59, 999);
        if (now > sep30ThisYear) {
            return new Date(year + 1, 8, 30, 23, 59, 59, 999);
        }
        return sep30ThisYear;
    }
    return null;
};
exports.calculateRawNextDueDate = calculateRawNextDueDate;
const getCompliancePeriod = (frequencyType, refDate, tenantCreatedAt) => {
    let period = (0, exports.getRawCompliancePeriod)(frequencyType, refDate);
    if (tenantCreatedAt) {
        let safetyCounter = 0;
        while (period.dueDate < tenantCreatedAt && safetyCounter < 60) {
            const nextRef = new Date(period.dueDate.getTime() + 24 * 3600 * 1000);
            period = (0, exports.getRawCompliancePeriod)(frequencyType, nextRef);
            safetyCounter++;
        }
    }
    return period;
};
exports.getCompliancePeriod = getCompliancePeriod;
const calculateNextDueDate = (frequencyType, serialNo, refDate, tenantCreatedAt) => {
    let nextDate = (0, exports.calculateRawNextDueDate)(frequencyType, serialNo, refDate);
    if (tenantCreatedAt && nextDate) {
        let safetyCounter = 0;
        while (nextDate && nextDate < tenantCreatedAt && safetyCounter < 60) {
            const nextRef = new Date(nextDate.getTime() + 24 * 3600 * 1000);
            nextDate = (0, exports.calculateRawNextDueDate)(frequencyType, serialNo, nextRef);
            safetyCounter++;
        }
    }
    return nextDate;
};
exports.calculateNextDueDate = calculateNextDueDate;
