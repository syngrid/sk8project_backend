const mongoose = require('mongoose');
const Sequence = require('./Sequence');

const unitSchema = new mongoose.Schema({
    unitName: { type: String, required: true },
    unitCode: { type: String, unique: true },
    unitType: { type: String },
    decimalAllowed: { type: Boolean, default: false },
    description: { type: String },
    status: { type: String, default: 'active' }
}, { timestamps: true });

unitSchema.pre('save', async function() {
    if (!this.unitCode) {
        const sequence = await Sequence.findOneAndUpdate(
            { id: 'unit' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.unitCode = `UNT-${String(sequence.seq).padStart(3, '0')}`;
    }
});

module.exports = mongoose.model('Unit', unitSchema);
