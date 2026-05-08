const mongoose = require('mongoose');

const sequenceSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 }
});

module.exports = mongoose.model('Sequence', sequenceSchema);
