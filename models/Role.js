const mongoose = require('mongoose');
const Sequence = require('./Sequence');

const roleSchema = new mongoose.Schema({
    roleName: { type: String, required: true },
    roleCode: { type: String, unique: true },
    description: { type: String },
    permissions: { type: Array, default: [] },
    status: { type: String, default: 'active' }
}, { timestamps: true });

roleSchema.pre('save', async function() {
    if (!this.roleCode) {
        const sequence = await Sequence.findOneAndUpdate(
            { id: 'role' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.roleCode = `ROL-${String(sequence.seq).padStart(3, '0')}`;
    }
});

module.exports = mongoose.model('Role', roleSchema);
