const mongoose = require('mongoose');

// Approval Workflow Models
const approvalWorkflowSchema = new mongoose.Schema({
    workflowName: { type: String, required: true },
    moduleName: { type: String, required: true },
    department: { type: String },
    approvalType: { type: String }, // e.g., Sequential, Parallel
    description: { type: String },
    workflowStatus: { type: String, default: 'active' }
}, { timestamps: true });

const approvalLevelSchema = new mongoose.Schema({
    workflow: { type: String, required: true },
    levelNumber: { type: Number, required: true },
    approverRole: { type: String },
    approverUser: { type: String },
    approvalCondition: { type: String },
    escalationDays: { type: Number, default: 0 },
    remarks: { type: String },
    status: { type: String, default: 'active' }
}, { timestamps: true });

const approvalTransactionSchema = new mongoose.Schema({
    transactionNumber: { type: String, unique: true, required: true },
    moduleName: { type: String, required: true },
    referenceNumber: { type: String, required: true },
    workflow: { type: String },
    currentApprovalLevel: { type: Number, default: 1 },
    requestedBy: { type: String },
    requestedDate: { type: Date, default: Date.now },
    approvedBy: { type: String },
    approvalDate: { type: Date },
    approvalStatus: { type: String, default: 'pending' },
    comments: { type: String }
}, { timestamps: true });

module.exports = {
    ApprovalWorkflow: mongoose.model('ApprovalWorkflow', approvalWorkflowSchema),
    ApprovalLevel: mongoose.model('ApprovalLevel', approvalLevelSchema),
    ApprovalTransaction: mongoose.model('ApprovalTransaction', approvalTransactionSchema)
};
