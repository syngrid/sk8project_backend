const mongoose = require('mongoose');

const costCenterSchema = new mongoose.Schema({
    costCenterName: { type: String, required: true },
    costCenterCode: { type: String, required: true, unique: true },
    department: { type: String },
    budgetAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String },
    status: { type: String, default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('CostCenter', costCenterSchema);
