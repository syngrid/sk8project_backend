const mongoose = require('mongoose');

// Document Management Models
const folderSchema = new mongoose.Schema({
    folderName: { type: String, required: true },
    project: { type: String, required: true },
    parentFolder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    description: { type: String }
}, { timestamps: true });

const docSchema = new mongoose.Schema({
    documentNumber: { type: String, unique: true, required: true },
    project: { type: String, required: true },
    folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    documentName: { type: String, required: true },
    documentType: { type: String },
    documentCategory: { type: String },
    referenceModule: { type: String },
    referenceNumber: { type: String },
    revisionNumber: { type: String },
    preparedBy: { type: String },
    approvedBy: { type: String },
    uploadFile: { type: String },
    documentStatus: { type: String, default: 'active' },
    remarks: { type: String }
}, { timestamps: true });

const docVersionSchema = new mongoose.Schema({
    document: { type: String, required: true },
    versionNumber: { type: String, required: true },
    revisionNumber: { type: String },
    versionDate: { type: Date, default: Date.now },
    uploadedBy: { type: String },
    changeDescription: { type: String },
    approvalStatus: { type: String, default: 'pending' },
    remarks: { type: String },
    uploadFile: { type: String }
}, { timestamps: true });

const docAccessLogSchema = new mongoose.Schema({
    document: { type: String, required: true },
    accessedBy: { type: String, required: true },
    accessDate: { type: Date, default: Date.now },
    accessType: { type: String }, // e.g., View, Download, Edit
    ipAddress: { type: String },
    deviceInformation: { type: String },
    remarks: { type: String }
}, { timestamps: true });

module.exports = {
    Folder: mongoose.model('Folder', folderSchema),
    Doc: mongoose.model('Doc', docSchema),
    DocVersion: mongoose.model('DocVersion', docVersionSchema),
    DocAccessLog: mongoose.model('DocAccessLog', docAccessLogSchema)
};
