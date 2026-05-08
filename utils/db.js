const mongoose = require('mongoose');

const DEFAULT_LOCAL_URI = 'mongodb://127.0.0.1:27017/sk8_engineering_erp';

function getMongoUri() {
    return process.env.MONGODB_URI || process.env.MONGO_URI || DEFAULT_LOCAL_URI;
}

async function connectDatabase() {
    const uri = getMongoUri();

    try {
        await mongoose.connect(uri);
        console.log(`Connected to MongoDB (${uri.startsWith('mongodb+srv://') ? 'Atlas' : 'local'})`);
        return mongoose.connection;
    } catch (error) {
        if (uri !== DEFAULT_LOCAL_URI) {
            console.warn('Primary MongoDB connection failed, falling back to local MongoDB...');
            console.warn(`Primary error: ${error.message}`);
            await mongoose.connect(DEFAULT_LOCAL_URI);
            console.log('Connected to MongoDB (local fallback)');
            return mongoose.connection;
        }

        throw error;
    }
}

module.exports = {
    connectDatabase,
    getMongoUri,
};
