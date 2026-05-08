const mongoose = require('mongoose');

const projectPlanningSchema = new mongoose.Schema({
    project: { type: String, required: true },
    costCenter: { type: String },
    planningTitle: { type: String, required: true },
    planningStage: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    estimatedCost: { type: Number },
    estimatedHours: { type: Number },
    resourceRequirement: { type: String },
    remarks: { type: String },
    status: { type: String, default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('ProjectPlanning', projectPlanningSchema);
