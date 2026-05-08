const mongoose = require('mongoose');

// Procurement Models
const purchaseRequestSchema = new mongoose.Schema({
    prNumber: { type: String, unique: true, required: true },
    requestDate: { type: Date, default: Date.now },
    requestType: { type: String, default: 'Manual' }, // BOM, Manual
    project: { type: String, required: true },
    bom: { type: String }, // BOM Reference
    requestedBy: { type: String },
    department: { type: String },
    requiredDate: { type: Date },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
    approvalStatus: { type: String, enum: ['Draft', 'Pending Approval', 'Approved', 'Rejected', 'PO Created', 'Cancelled'], default: 'Draft' },
    currentLevel: { type: Number, default: 1 }, // Added for multi-level tracking
    remarks: { type: String },
    attachments: { type: String }
}, { timestamps: true });

const purchaseRequestItemSchema = new mongoose.Schema({
    purchaseRequest: { type: String, required: true },
    item: { type: String, required: true },
    itemDescription: { type: String },
    unit: { type: String },
    requestedQuantity: { type: Number, required: true },
    availableQuantity: { type: Number, default: 0 },
    shortageQuantity: { type: Number, default: 0 },
    approvedQuantity: { type: Number, default: 0 },
    estimatedCost: { type: Number },
    suggestedSupplier: { type: String }, // Added suggested supplier
    requiredDate: { type: Date },
    remarks: { type: String },
    status: { type: String, default: 'pending' }
}, { timestamps: true });

const approvalTransactionSchema = new mongoose.Schema({
    prReference: { type: String, required: true },
    project: { type: String },
    amount: { type: Number },
    approver: { type: String },
    approvalStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Hold', 'Send Back'], default: 'Pending' },
    approvalDate: { type: Date },
    comments: { type: String },
    level: { type: Number, default: 1 } // Added for multi-level support
}, { timestamps: true });

const approvalHistorySchema = new mongoose.Schema({
    prReference: { type: String, required: true },
    action: { type: String }, // Approved, Rejected, etc.
    actor: { type: String },
    date: { type: Date, default: Date.now },
    comments: { type: String }
}, { timestamps: true });

const purchaseOrderSchema = new mongoose.Schema({
    poNumber: { type: String, unique: true, required: true },
    poDate: { type: Date, default: Date.now },
    project: { type: String },
    supplier: { type: String, required: true },
    prReference: { type: String }, 
    deliveryDate: { type: Date },
    currency: { type: String, default: 'INR' },
    totalAmount: { type: Number, default: 0 },
    paymentTerms: { type: String },
    deliveryAddress: { type: String }, // Added delivery address
    poStatus: { type: String, enum: ['Draft', 'Pending Approval', 'Approved', 'Sent', 'Partial Delivery', 'Completed', 'Cancelled'], default: 'Draft' },
    remarks: { type: String },
    attachments: { type: String }
}, { timestamps: true });

const purchaseOrderItemSchema = new mongoose.Schema({
    purchaseOrder: { type: String, required: true },
    item: { type: String, required: true },
    itemDescription: { type: String },
    unit: { type: String },
    orderedQuantity: { type: Number, required: true },
    receivedQuantity: { type: Number, default: 0 },
    pendingQuantity: { type: Number }, // Ordered - Received
    unitPrice: { type: Number },
    tax: { type: Number },
    totalAmount: { type: Number },
    deliveryDate: { type: Date },
    remarks: { type: String }
}, { timestamps: true });

module.exports = {
    PurchaseRequest: mongoose.model('PurchaseRequest', purchaseRequestSchema),
    PurchaseRequestItem: mongoose.model('PurchaseRequestItem', purchaseRequestItemSchema),
    PurchaseApproval: mongoose.model('PurchaseApproval', approvalTransactionSchema),
    ApprovalHistory: mongoose.model('ApprovalHistory', approvalHistorySchema),
    PurchaseOrder: mongoose.model('PurchaseOrder', purchaseOrderSchema),
    PurchaseOrderItem: mongoose.model('PurchaseOrderItem', purchaseOrderItemSchema)
};
