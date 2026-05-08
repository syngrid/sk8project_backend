const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    project: { type: String, required: true },
    costCenter: { type: String },
    stage: { type: String },
    parentTask: { type: String },
    taskName: { type: String, required: true },
    taskCode: { type: String },
    assignedTo: { type: String },
    priority: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    estimatedHours: { type: Number },
    dependencyTask: { type: String },
    progressPercentage: { type: Number, default: 0 },
    taskStatus: { type: String, default: 'pending' },
    remarks: { type: String },
    attachments: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
