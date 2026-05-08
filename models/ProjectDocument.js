const mongoose = require('mongoose');

const projectDocumentSchema = new mongoose.Schema({
    project: { type: String, required: true },
    costCenter: { type: String },
    documentName: { type: String, required: true },
    documentType: { type: String },
    documentCategory: { type: String },
    revisionNumber: { type: String },
    uploadedBy: { type: String },
    uploadFile: { type: String },
    approvalRequired: { type: Boolean, default: false },
    documentStatus: { type: String, default: 'draft' },
    remarks: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ProjectDocument', projectDocumentSchema);
