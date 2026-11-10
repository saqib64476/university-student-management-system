/**
 * MySQL Database Initialization Script
 * Reads database/schema.sql and executes queries on MySQL
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function init() {
  console.log('--- Initializing MySQL Database Schema ---');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    const dbName = process.env.DB_NAME || 'student_management_system';
    console.log(`Creating database if not exists: ${dbName}...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${dbName}\`;`);

    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema.sql...');
    await connection.query(schemaSql);
    console.log('✓ Database schema created successfully!');
  } catch (err) {
    console.error('✗ Database initialization failed:', err.message);
  } finally {
    await connection.end();
  }
}

init();
