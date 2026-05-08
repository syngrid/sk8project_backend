const mongoose = require('mongoose');

const progressUpdateSchema = new mongoose.Schema({
    project: { type: String, required: true },
    costCenter: { type: String },
    task: { type: String },
    updateDate: { type: Date, default: Date.now },
    updatedBy: { type: String },
    progressPercentage: { type: Number },
    currentStatus: { type: String },
    workCompleted: { type: String },
    pendingWork: { type: String },
    issuesRisks: { type: String },
    nextActionPlan: { type: String },
    attachments: { type: String },
    remarks: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ProgressUpdate', progressUpdateSchema);
