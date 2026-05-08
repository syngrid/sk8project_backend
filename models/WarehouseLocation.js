const mongoose = require('mongoose');

const warehouseLocationSchema = new mongoose.Schema({
    warehouse: { type: String, required: true },
    locationName: { type: String, required: true },
    rackNumber: { type: String },
    shelfNumber: { type: String },
    binNumber: { type: String },
    capacity: { type: String },
    dedicatedItem: { type: String }, // Optional: Link a specific item to this location
    status: { type: String, default: 'active' },
    remarks: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('WarehouseLocation', warehouseLocationSchema);
