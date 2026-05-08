const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
    project: { type: String, required: true },
    costCenter: { type: String },
    milestoneName: { type: String, required: true },
    description: { type: String },
    targetDate: { type: Date },
    completionDate: { type: Date },
    responsiblePerson: { type: String },
    priority: { type: String },
    status: { type: String, default: 'pending' },
    remarks: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Milestone', milestoneSchema);
