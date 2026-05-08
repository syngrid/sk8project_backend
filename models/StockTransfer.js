const mongoose = require('mongoose');

const stockTransferSchema = new mongoose.Schema({
    transferNumber: { type: String, unique: true, required: true },
    project: { type: String },
    bom: { type: String },
    fromWarehouse: { type: String, required: true },
    toWarehouse: { type: String, required: true },
    transferDate: { type: Date, default: Date.now },
    item: { type: String, required: true },
    quantity: { type: Number, required: true },
    transferReason: { type: String },
    referenceNumber: { type: String },
    referenceType: { type: String },
    approvedBy: { type: String },
    transferStatus: { type: String, default: 'pending' },
    remarks: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('StockTransfer', stockTransferSchema);
