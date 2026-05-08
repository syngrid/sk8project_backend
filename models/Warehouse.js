const mongoose = require('mongoose');
const Sequence = require('./Sequence');

const warehouseSchema = new mongoose.Schema({
    warehouseName: { type: String, required: true },
    warehouseCode: { type: String, unique: true },
    warehouseType: { type: String },
    contactPerson: { type: String },
    phoneNumber: { type: String },
    email: { type: String },
    address: { type: String },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    postalCode: { type: String },
    storageCapacity: { type: String },
    status: { type: String, default: 'active' },
    remarks: { type: String }
}, { timestamps: true });

warehouseSchema.pre('save', async function() {
    if (!this.warehouseCode) {
        const sequence = await Sequence.findOneAndUpdate(
            { id: 'warehouse' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.warehouseCode = `WH-${String(sequence.seq).padStart(3, '0')}`;
    }
});

module.exports = mongoose.model('Warehouse', warehouseSchema);
