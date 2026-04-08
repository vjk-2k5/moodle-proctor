// ============================================================================
// Clean Test Data Script
// Removes all test data from database
// ============================================================================

import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/moodle_proctor';

async function cleanTestData() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('🧹 Cleaning test data...');

    // Clean enrollments
    const enrollResult = await pool.query(
      "DELETE FROM room_enrollments WHERE user_email LIKE '%@example.com'"
    );
    console.log(`✅ Deleted ${enrollResult.rowCount} test enrollments`);

    // Clean LTI-created rooms
    const roomResult = await pool.query(
      "DELETE FROM proctoring_rooms WHERE lti_context_key LIKE 'test-%'"
    );
    console.log(`✅ Deleted ${roomResult.rowCount} test rooms`);

    // Clean test users
    const userResult = await pool.query(
      "DELETE FROM users WHERE email LIKE '%@example.com'"
    );
    console.log(`✅ Deleted ${userResult.rowCount} test users`);

    console.log('\n✨ All test data cleaned successfully!\n');
  } catch (error) {
    console.error('❌ Error cleaning test data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run cleanup
cleanTestData();
