import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'db.json');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepai';

console.log('\n📊 PrepAI Database Inspection\n=================================');

try {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
  console.log(`✅ Connected to MongoDB: ${mongoUri}`);
  console.log(`📁 Database Name: "${mongoose.connection.name}"\n`);

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log(`Found ${collections.length} tables (collections):\n`);

  for (const col of collections) {
    const count = await mongoose.connection.db.collection(col.name).countDocuments();
    console.log(` • ${col.name.padEnd(20)} : ${count} document(s)`);
  }
  
  await mongoose.disconnect();
} catch (err) {
  console.log('⚠️ MongoDB is offline. Inspecting JSON fallback (server/data/db.json)...\n');
  if (fs.existsSync(DATA_FILE)) {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8') || '{}');
    const tables = Object.keys(data);
    console.log(`Found ${tables.length} tables in JSON fallback:\n`);
    for (const table of tables) {
      const count = Array.isArray(data[table]) ? data[table].length : 0;
      console.log(` • ${table.padEnd(20)} : ${count} record(s)`);
    }
  } else {
    console.log('No database file found.');
  }
}

console.log('=================================\n');
