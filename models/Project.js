const mongoose = require('mongoose');
const Sequence = require('./Sequence');

const projectSchema = new mongoose.Schema({
    projectCode: { type: String, unique: true },
    projectName: { type: String, required: true },
    clientName: { type: String },
    projectType: { type: String },
    department: { type: String },
    projectManager: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    priority: { type: String },
    budget: { type: Number },
    costCenter: { type: String },
    siteLocation: { type: String },
    projectStatus: { type: String, default: 'created', enum: ['created', 'drawing_ready', 'active', 'completed'] },
    engineeringDrawingStatus: { type: String, default: 'pending', enum: ['pending', 'ready'] },
    description: { type: String },
    attachments: { type: String }
}, { timestamps: true });

projectSchema.pre('save', async function() {
    if (!this.projectCode) {
        const sequence = await Sequence.findOneAndUpdate(
            { id: 'project' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.projectCode = `PRJ-${String(sequence.seq).padStart(3, '0')}`;
    }
});

module.exports = mongoose.model('Project', projectSchema);
