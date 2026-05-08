const mongoose = require('mongoose');

const stockTransactionSchema = new mongoose.Schema({
    transactionNumber: { type: String, unique: true, required: true },
    transactionType: { type: String, required: true },
    transactionDate: { type: Date, default: Date.now },
    item: { type: String, required: true },
    warehouse: { type: String },
    location: { type: String },
    quantity: { type: Number, required: true },
    unit: { type: String },
    referenceNumber: { type: String },
    referenceType: { type: String },
    project: { type: String },
    remarks: { type: String },
    createdBy: { type: String },
    status: { type: String, default: 'completed' }
}, { timestamps: true });

module.exports = mongoose.model('StockTransaction', stockTransactionSchema);
