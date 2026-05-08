const mongoose = require('mongoose');
const Sequence = require('./Sequence');

// BOM Management Models
const bomMasterSchema = new mongoose.Schema({
    bomNumber: { type: String, unique: true, required: true },
    project: { type: String, required: true },
    costCenter: { type: String },
    projectStage: { type: String },
    drawingReference: { type: String },
    revisionNumber: { type: String },
    bomTitle: { type: String, required: true },
    bomType: { type: String },
    preparedBy: { type: String },
    preparedDate: { type: Date },
    approvedBy: { type: String },
    approvalDate: { type: Date },
    bomStatus: { 
        type: String, 
        default: 'draft',
        enum: ['draft', 'pending_approval', 'approved', 'availability_checked', 'stock_reserved', 'shortage_identified', 'pr_generated', 'procurement_in_progress', 'material_received', 'in_warehouse', 'dispatched', 'consumed']
    },
    remarks: { type: String },
    attachments: { type: String }
}, { timestamps: true });

bomMasterSchema.pre('save', async function() {
    if (!this.bomNumber) {
        const sequence = await Sequence.findOneAndUpdate(
            { id: 'bom' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.bomNumber = `BOM-${String(sequence.seq).padStart(4, '0')}`;
    }
});

const bomItemSchema = new mongoose.Schema({
    bom: { type: String, required: true },
    costCenter: { type: String },
    item: { type: String, required: true },
    itemCategory: { type: String },
    itemDescription: { type: String },
    unit: { type: String },
    requiredQuantity: { type: Number, default: 0 },
    availableStock: { type: Number, default: 0 },
    reservedQuantity: { type: Number, default: 0 },
    shortageQuantity: { type: Number, default: 0 },
    requiredProcurementQty: { type: Number, default: 0 },
    supplier: { type: String },
    supplierPreferred: { type: String },
    leadTime: { type: String },
    priority: { type: String },
    remarks: { type: String },
    status: { type: String, default: 'active' }
}, { timestamps: true });

const bomRevisionSchema = new mongoose.Schema({
    bom: { type: String, required: true },
    costCenter: { type: String },
    revisionNumber: { type: String, required: true },
    revisionDate: { type: Date, default: Date.now },
    revisionDescription: { type: String },
    preparedBy: { type: String },
    approvedBy: { type: String },
    revisionStatus: { type: String, default: 'active' },
    remarks: { type: String }
}, { timestamps: true });

const materialPlanningSchema = new mongoose.Schema({
    project: { type: String, required: true },
    costCenter: { type: String },
    bom: { type: String },
    planningDate: { type: Date, default: Date.now },
    requiredDate: { type: Date },
    materialAvailabilityStatus: { type: String },
    totalRequiredItems: { type: Number, default: 0 },
    availableItems: { type: Number, default: 0 },
    shortageItems: { type: Number, default: 0 },
    reservedItems: { type: Number, default: 0 },
    procurementRequired: { type: Boolean, default: false },
    planningStatus: { type: String, default: 'pending' },
    remarks: { type: String }
}, { timestamps: true });

const shortageAnalysisSchema = new mongoose.Schema({
    project: { type: String, required: true },
    costCenter: { type: String },
    bom: { type: String },
    item: { type: String, required: true },
    requiredQuantity: { type: Number, default: 0 },
    availableQuantity: { type: Number, default: 0 },
    shortageQuantity: { type: Number, default: 0 },
    suggestedSupplier: { type: String },
    expectedProcurementDate: { type: Date },
    priority: { type: String },
    analysisStatus: { type: String, default: 'completed' },
    remarks: { type: String }
}, { timestamps: true });

const materialReservationSchema = new mongoose.Schema({
    reservationNumber: { type: String, unique: true, required: true },
    project: { type: String },
    costCenter: { type: String },
    bom: { type: String },
    task: { type: String },
    item: { type: String, required: true },
    warehouse: { type: String },
    requiredQuantity: { type: Number, required: true },
    reservedQuantity: { type: Number, default: 0 },
    reservationDate: { type: Date, default: Date.now },
    requiredDate: { type: Date },
    reservedBy: { type: String },
    reservationStatus: { type: String, default: 'pending' },
    remarks: { type: String }
}, { timestamps: true });

module.exports = {
    BOMMaster: mongoose.model('BOMMaster', bomMasterSchema),
    BOMItem: mongoose.model('BOMItem', bomItemSchema),
    BOMRevision: mongoose.model('BOMRevision', bomRevisionSchema),
    MaterialPlanning: mongoose.model('MaterialPlanning', materialPlanningSchema),
    ShortageAnalysis: mongoose.model('ShortageAnalysis', shortageAnalysisSchema),
    MaterialReservation: mongoose.model('MaterialReservation', materialReservationSchema)
};
