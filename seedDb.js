/**
 * MySQL Database Seed Script
 * Reads database/seed.sql and inserts initial realistic academic data
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  console.log('--- Seeding MySQL Database ---');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_management_system',
    multipleStatements: true
  });

  try {
    const seedPath = path.join(__dirname, '..', '..', 'database', 'seed.sql');
    let seedSql = fs.readFileSync(seedPath, 'utf8');

    // Generate accurate bcrypt hash for Admin@123
    const adminHash = bcrypt.hashSync('Admin@123', 10);
    seedSql = seedSql.replace(/\$2a\$10\$wS2Wz3eYm2E2W1e9G5W7ce\.JcRovzZfZVw5Y5VzF3K1lQJd5q5R9K/g, adminHash);

    console.log('Executing seed.sql with encrypted admin credentials...');
    await connection.query(seedSql);
    console.log('✓ Database seeded successfully!');
    console.log('  Admin User: admin@university.edu');
    console.log('  Password:   Admin@123');
  } catch (err) {
    console.error('✗ Database seeding failed:', err.message);
  } finally {
    await connection.end();
  }
}

seed();
