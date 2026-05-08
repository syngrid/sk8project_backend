const mongoose = require('mongoose');

const teamAllocationSchema = new mongoose.Schema({
    project: { type: String, required: true },
    costCenter: { type: String },
    employee: { type: String, required: true },
    role: { type: String },
    department: { type: String },
    allocationStartDate: { type: Date },
    allocationEndDate: { type: Date },
    workingHours: { type: Number },
    allocationPercentage: { type: Number },
    remarks: { type: String },
    status: { type: String, default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('TeamAllocation', teamAllocationSchema);
