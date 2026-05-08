const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    project: { type: String, required: true },
    costCenter: { type: String },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    task: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    assignedResource: { type: String },
    remarks: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
