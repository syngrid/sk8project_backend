const mongoose = require('mongoose');

const stockAdjustmentSchema = new mongoose.Schema({
    adjustmentNumber: { type: String, unique: true, required: true },
    warehouse: { type: String, required: true },
    item: { type: String, required: true },
    adjustmentType: { type: String, required: true }, // e.g., addition, subtraction
    quantity: { type: Number, required: true },
    reason: { type: String },
    approvedBy: { type: String },
    adjustmentDate: { type: Date, default: Date.now },
    remarks: { type: String },
    status: { type: String, default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('StockAdjustment', stockAdjustmentSchema);
