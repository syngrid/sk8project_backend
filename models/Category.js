const mongoose = require('mongoose');
const Sequence = require('./Sequence');

const categorySchema = new mongoose.Schema({
    categoryName: { type: String, required: true },
    categoryCode: { type: String, unique: true },
    parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    categoryType: { type: String },
    description: { type: String },
    status: { type: String, default: 'active' }
}, { timestamps: true });

categorySchema.pre('save', async function() {
    if (!this.categoryCode) {
        const sequence = await Sequence.findOneAndUpdate(
            { id: 'category' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.categoryCode = `CAT-${String(sequence.seq).padStart(3, '0')}`;
    }
});

module.exports = mongoose.model('Category', categorySchema);
