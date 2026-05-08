const mongoose = require('mongoose');
const Sequence = require('./Sequence');

const itemSchema = new mongoose.Schema({
    itemCode: { type: String, unique: true },
    itemName: { type: String, required: true },
    itemCategory: { type: String },
    subCategory: { type: String },
    unit: { type: String },
    itemType: { type: String },
    brand: { type: String },
    modelNumber: { type: String },
    partNumber: { type: String },
    barcode: { type: String },
    minimumStock: { type: Number, default: 0 },
    maximumStock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    openingStock: { type: Number, default: 0 },
    currentStock: { type: Number, default: 0 },
    openingStockValue: { type: Number, default: 0 },
    warehouse: { type: String },
    supplier: { type: String },
    itemCost: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    skuCode: { type: String },
    itemImage: { type: String },
    description: { type: String },
    status: { type: String, default: 'active' }
}, { timestamps: true });

itemSchema.pre('save', async function() {
    if (!this.itemCode) {
        const sequence = await Sequence.findOneAndUpdate(
            { id: 'item' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.itemCode = `ITEM-${String(sequence.seq).padStart(4, '0')}`;
    }
});

module.exports = mongoose.model('InventoryItem', itemSchema);
