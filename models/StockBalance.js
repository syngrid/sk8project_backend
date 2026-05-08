const mongoose = require('mongoose');

const stockBalanceSchema = new mongoose.Schema({
    item: { type: String, required: true },
    warehouse: { type: String, required: true },
    warehouseLocation: { type: String, default: 'unassigned' },
    openingStock: { type: Number, default: 0 },
    stockIn: { type: Number, default: 0 },
    stockOut: { type: Number, default: 0 },
    reservedStock: { type: Number, default: 0 },
    transitStock: { type: Number, default: 0 },
    availableStock: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    status: { type: String, default: 'active' }
}, { timestamps: true });

// Compound index for efficient lookup
stockBalanceSchema.index({ item: 1, warehouse: 1, warehouseLocation: 1 }, { unique: true });

module.exports = mongoose.model('StockBalance', stockBalanceSchema);
