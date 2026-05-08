const mongoose = require('mongoose');

const openingStockSchema = new mongoose.Schema({
    item: { type: String, required: true },
    warehouse: { type: String, required: true },
    openingQuantity: { type: Number, default: 0 },
    openingValue: { type: Number, default: 0 },
    unitCost: { type: Number, default: 0 },
    openingDate: { type: Date, default: Date.now },
    remarks: { type: String },
    status: { type: String, default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('OpeningStock', openingStockSchema);
