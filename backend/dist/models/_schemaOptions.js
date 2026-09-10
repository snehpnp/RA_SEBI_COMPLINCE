"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseSchemaOptions = void 0;
exports.baseSchemaOptions = {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            if (ret._id) {
                ret.id = ret._id.toString();
            }
            delete ret.__v;
            return ret;
        }
    },
    toObject: {
        virtuals: true,
        transform: (_doc, ret) => {
            if (ret._id) {
                ret.id = ret._id.toString();
            }
            delete ret.__v;
            return ret;
        }
    }
};
