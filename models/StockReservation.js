const mongoose = require('mongoose');

const stockReservationSchema = new mongoose.Schema({
    reservationNumber: { type: String, unique: true, required: true },
    project: { type: String },
    bom: { type: String },
    task: { type: String },
    item: { type: String, required: true },
    warehouse: { type: String },
    requiredQuantity: { type: Number, required: true },
    reservedQuantity: { type: Number, default: 0 },
    reservationDate: { type: Date, default: Date.now },
    requiredDate: { type: Date },
    reservedBy: { type: String },
    referenceNumber: { type: String },
    referenceType: { type: String },
    status: { type: String, default: 'pending' },
    remarks: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('StockReservation', stockReservationSchema);
