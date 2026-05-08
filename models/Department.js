const mongoose = require('mongoose');
const Sequence = require('./Sequence');

const departmentSchema = new mongoose.Schema({
    departmentName: { type: String, required: true },
    departmentCode: { type: String, unique: true },
    status: { type: String, default: 'active' }
}, { timestamps: true });

departmentSchema.pre('save', async function() {
    if (!this.departmentCode) {
        const sequence = await Sequence.findOneAndUpdate(
            { id: 'department' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.departmentCode = `DEP-${String(sequence.seq).padStart(3, '0')}`;
    }
});

module.exports = mongoose.model('Department', departmentSchema);
