const mongoose = require('mongoose');

// Warehouse Operations Models
const grnSchema = new mongoose.Schema({
    grnNumber: { type: String, unique: true, required: true },
    grnDate: { type: Date, default: Date.now },
    purchaseOrder: { type: String, required: true },
    supplier: { type: String },
    costCenter: { type: String },
    warehouse: { type: String },
    receivedBy: { type: String },
    invoiceNumber: { type: String },
    invoiceDate: { type: Date },
    deliveryNoteNumber: { type: String },
    grnStatus: { type: String, default: 'pending' },
    remarks: { type: String },
    attachments: { type: String }
}, { timestamps: true });

const grnItemSchema = new mongoose.Schema({
    grn: { type: String, required: true },
    item: { type: String, required: true },
    itemDescription: { type: String },
    itemCategory: { type: String },
    orderedQuantity: { type: Number, default: 0 },
    receivedQuantity: { type: Number, required: true },
    acceptedQuantity: { type: Number, default: 0 },
    rejectedQuantity: { type: Number, default: 0 },
    unit: { type: String },
    costCenter: { type: String },
    warehouse: { type: String },
    warehouseLocation: { type: String },
    qcStatus: { type: String, default: 'pending' },
    remarks: { type: String },
    status: { type: String, default: 'active' }
}, { timestamps: true });

const qualityCheckSchema = new mongoose.Schema({
    qcNumber: { type: String, unique: true, required: true },
    grn: { type: String, required: true },
    item: { type: String, required: true },
    costCenter: { type: String },
    inspectionDate: { type: Date, default: Date.now },
    inspectedBy: { type: String },
    inspectionResult: { type: String }, // e.g., Passed, Failed
    acceptedQuantity: { type: Number, default: 0 },
    rejectedQuantity: { type: Number, default: 0 },
    defectDetails: { type: String },
    correctiveAction: { type: String },
    qcStatus: { type: String, default: 'completed' },
    remarks: { type: String }
}, { timestamps: true });

const stockUpdateSchema = new mongoose.Schema({
    transactionNumber: { type: String, unique: true, required: true },
    transactionDate: { type: Date, default: Date.now },
    transactionType: { type: String },
    referenceNumber: { type: String },
    item: { type: String, required: true },
    warehouse: { type: String, required: true },
    costCenter: { type: String },
    quantity: { type: Number, required: true },
    unit: { type: String },
    previousStock: { type: Number, default: 0 },
    updatedStock: { type: Number, default: 0 },
    updatedBy: { type: String },
    remarks: { type: String },
    status: { type: String, default: 'completed' }
}, { timestamps: true });

module.exports = {
    GRN: mongoose.model('GRN', grnSchema),
    GRNItem: mongoose.model('GRNItem', grnItemSchema),
    QualityCheck: mongoose.model('QualityCheck', qualityCheckSchema),
    StockUpdate: mongoose.model('StockUpdate', stockUpdateSchema)
};
