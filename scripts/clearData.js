const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { connectDatabase } = require('../utils/db');
dotenv.config();

const clearDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await connectDatabase();
    console.log('Connected.');

    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      const name = collection.name;
      // Skip the Admin collection to keep the login working
      if (name === 'admins' || name === 'system.indexes') {
        console.log(`Skipping collection: ${name}`);
        continue;
      }
      
      console.log(`Clearing collection: ${name}`);
      await mongoose.connection.db.collection(name).deleteMany({});
    }

    console.log('All data removed (except Admin accounts).');
    process.exit(0);
  } catch (err) {
    console.error('Error clearing database:', err);
    process.exit(1);
  }
};

clearDatabase();
