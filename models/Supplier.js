const mongoose = require('mongoose');
const Sequence = require('./Sequence');

const supplierSchema = new mongoose.Schema({
    supplierName: { type: String, required: true },
    supplierCode: { type: String, unique: true },
    supplierType: { type: String },
    companyRegNumber: { type: String },
    contactPerson: { type: String },
    mobileNumber: { type: String },
    officeNumber: { type: String },
    email: { type: String },
    website: { type: String },
    address: { type: String },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    postalCode: { type: String },
    paymentTerms: { type: String },
    currency: { type: String, default: 'INR' },
    taxNumber: { type: String },
    bankName: { type: String },
    bankAccountNumber: { type: String },
    swiftCode: { type: String },
    preferredSupplier: { type: Boolean, default: false },
    supplierRating: { type: Number, default: 0 },
    remarks: { type: String },
    status: { type: String, default: 'active' }
}, { timestamps: true });

supplierSchema.pre('save', async function() {
    if (!this.supplierCode) {
        const sequence = await Sequence.findOneAndUpdate(
            { id: 'supplier' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.supplierCode = `SUP-${String(sequence.seq).padStart(3, '0')}`;
    }
});

module.exports = mongoose.model('Supplier', supplierSchema);
