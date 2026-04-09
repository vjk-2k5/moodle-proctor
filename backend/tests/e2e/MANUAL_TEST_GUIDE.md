# E2E Test Guide for LTI Implementation

## Overview

This guide provides step-by-step instructions for running end-to-end tests of the LTI proctoring integration.

## Prerequisites

### 1. Environment Setup
```bash
# Install dependencies
cd backend
npm install

# Install Playwright
npm install -D @playwright/test
npx playwright install chromium
```

### 2. Database Setup
```bash
# Create test database
createdb moodle_proctor_test

# Run migrations
npm run migrate

# Seed with test data
npm run seed
```

### 3. Backend Server
```bash
# Start backend server (terminal 1)
npm run dev
```

### 4. Environment Variables
Create `.env.test` file:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/moodle_proctor_test
BACKEND_URL=http://localhost:5000
JWT_SECRET=dev-secret
LTI_CONSUMER_KEY=moodle
LTI_CONSUMER_SECRET=secret
```

## Test Execution

### Automated E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (for debugging)
npm run test:e2e:ui

# Run specific test file
npx playwright test lti.spec.ts

# Run with verbose output
npx playwright test --reporter=list
```

### Manual Test Scenarios

#### Test 1: Basic LTI Launch Flow

**Objective:** Verify LTI launch creates room and generates deep link

**Steps:**
1. Use cURL or Postman to POST to `http://localhost:5000/api/lti/launch`
2. Include valid OAuth 1.0 signature and LTI parameters
3. Verify response is HTML with deep link
4. Extract room code and JWT token from HTML

**Expected Result:**
- Status: 200 OK
- HTML contains: `proctor://room/{CODE}?token={JWT}`
- Room created in database with `lti_context_key`
- JWT payload contains `roomCode`, `userId`, `contextId`

**Verification:**
```bash
# Check database
psql moodle_proctor_test -c "SELECT * FROM proctoring_rooms WHERE lti_context_key LIKE 'test-%' ORDER BY created_at DESC LIMIT 1;"
```

---

#### Test 2: JWT Token Validation

**Objective:** Verify JWT tokens are validated correctly

**Steps:**
1. Extract JWT token from Test 1
2. POST to `/api/room/{CODE}/validate-token` with token
3. Verify room info returned correctly
4. Test with invalid token (expect 403)
5. Test with wrong room code (expect 403)

**Expected Result:**
- Valid token: 200 OK with room info
- Invalid token: 403 Forbidden
- Wrong room: 403 Forbidden

**Verification:**
```bash
# Valid token
curl -X POST http://localhost:5000/api/room/{CODE}/validate-token \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_JWT_TOKEN"}'

# Invalid token
curl -X POST http://localhost:5000/api/room/{CODE}/validate-token \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid"}'
```

---

#### Test 3: Room Join with Capacity Enforcement

**Objective:** Verify students can join and capacity is enforced

**Steps:**
1. Create room with capacity = 2 (via LTI launch)
2. Join with student 1 (expect success)
3. Join with student 2 (expect success)
4. Try to join with student 3 (expect rejection: "room full")

**Expected Result:**
- Student 1: 200 OK, enrollment created
- Student 2: 200 OK, enrollment created
- Student 3: 429 Too Many Requests, "room full" error

**Verification:**
```bash
# Join student 1
curl -X POST http://localhost:5000/api/room/{CODE}/join \
  -H "Content-Type: application/json" \
  -d '{"studentName":"Student One","studentEmail":"student1@example.com"}'

# Join student 2
curl -X POST http://localhost:5000/api/room/{CODE}/join \
  -H "Content-Type: application/json" \
  -d '{"studentName":"Student Two","studentEmail":"student2@example.com"}'

# Join student 3 (should fail)
curl -X POST http://localhost:5000/api/room/{CODE}/join \
  -H "Content-Type: application/json" \
  -d '{"studentName":"Student Three","studentEmail":"student3@example.com"}'
```

---

#### Test 4: Teacher Ownership Transfer

**Objective:** Verify first instructor becomes room owner

**Steps:**
1. Launch LTI with `roles: 'Instructor'`
2. Verify room created with `teacher_id = instructor's user ID` (not 1)
3. Try to update room capacity (should succeed)
4. Try with different instructor (should fail: "not owner")

**Expected Result:**
- Room owned by instructor who launched first
- Owner can update capacity
- Non-owners cannot update

**Verification:**
```sql
-- Check room ownership
SELECT r.room_code, r.teacher_id, u.email as owner_email
FROM proctoring_rooms r
JOIN users u ON r.teacher_id = u.id
WHERE r.lti_context_key LIKE 'test-%'
ORDER BY r.created_at DESC
LIMIT 1;
```

---

#### Test 5: Capacity Editing (Frontend)

**Objective:** Verify teacher can edit room capacity

**Steps:**
1. Login to teacher dashboard: `http://localhost:3000/dashboard/monitoring`
2. View active rooms (should show LTI-created room)
3. Click "Edit" button on room card
4. Change capacity from 15 → 20
5. Click "Save"
6. Verify capacity updated

**Expected Result:**
- Capacity displays as "X / Y max"
- Edit button toggles edit mode
- Number input appears (min=1, max=100)
- Save button updates capacity
- Room list refreshes with new capacity

**Verification:**
```bash
# Check capacity in database
psql moodle_proctor_test -c "SELECT room_code, capacity FROM proctoring_rooms WHERE room_code = 'YOUR_CODE';"
```

---

#### Test 6: Complete LTI → Join Flow

**Objective:** Verify complete flow from Moodle to desktop app

**Steps:**
1. **Moodle Side:** Configure LTI tool (see DEPLOYMENT_CHECKLIST.md)
2. **Student clicks LTI link** in Moodle course
3. **Backend validates** OAuth signature
4. **Room auto-creates** (if first launch)
5. **JWT generated** with 24-hour expiry
6. **Deep link opens** desktop app: `proctor://room/{CODE}?token={JWT}`
7. **Desktop app validates** token
8. **Student joins** room with prefilled info
9. **Camera opens** and monitoring begins

**Expected Result:**
- All steps complete without errors
- Student sees their info prefilled
- Room shows 1 student enrolled
- Teacher dashboard shows active room

**Verification:**
```bash
# Check enrollment
SELECT e.student_name, e.student_email, r.room_code
FROM room_enrollments e
JOIN proctoring_rooms r ON e.room_id = r.id
WHERE r.lti_context_key LIKE 'test-%'
ORDER BY e.enrolled_at DESC
LIMIT 1;
```

---

## Test Data Cleanup

```bash
# Clean all test data
psql moodle_proctor_test <<EOF
DELETE FROM room_enrollments WHERE user_email LIKE '%@example.com';
DELETE FROM proctoring_rooms WHERE lti_context_key LIKE 'test-%';
DELETE FROM users WHERE email LIKE '%@example.com';
EOF
```

---

## Common Issues and Solutions

### Issue: "Invalid LTI signature"

**Cause:** OAuth signature generation incorrect

**Solution:**
1. Check timestamp is current (within 5 min)
2. Verify nonce is unique
3. Confirm consumer secret matches Moodle configuration
4. Use LtiHelper.generateOAuthSignature() from test helpers

---

### Issue: "Room not found"

**Cause:** Room code mismatch or case sensitivity

**Solution:**
1. Verify room code is uppercase (8 chars)
2. Check database with `SELECT * FROM proctoring_rooms WHERE room_code = 'CODE';`
3. Ensure room status is 'activated'

---

### Issue: "Database connection failed"

**Cause:** Database not running or wrong connection string

**Solution:**
1. Check PostgreSQL is running: `sudo systemctl status postgresql`
2. Verify DATABASE_URL in .env.test
3. Test connection: `psql $DATABASE_URL`

---

### Issue: "Token expired"

**Cause:** JWT token exp claim exceeded

**Solution:**
1. Check system clock is correct
2. Verify token expiry is 24 hours from now
3. Generate fresh token with `npm run test:generate-token`

---

## Performance Benchmarks

Target response times (local development):
- LTI launch: < 500ms
- Token validation: < 100ms
- Room join: < 300ms
- Capacity update: < 200ms

If tests exceed these times, investigate:
1. Database query performance (EXPLAIN ANALYZE)
2. Network latency
3. JWT verification speed

---

## Demo Day Checklist

Before demo:
- [ ] Run all automated E2E tests: `npm run test:e2e`
- [ ] Run manual Test 1 (LTI launch)
- [ ] Run manual Test 3 (capacity enforcement)
- [ ] Run manual Test 5 (capacity editing)
- [ ] Clean test data: `npm run test:clean`
- [ ] Restart backend: `npm run dev`
- [ ] Verify DEPLOYMENT_CHECKLIST.md items

During demo:
- [ ] Have backup LTI launch URL ready
- [ ] Have test student accounts ready
- [ ] Monitor backend logs for errors
- [ ] Be prepared to rollback (see rollback plan)

---

## Continuous Integration

To add E2E tests to CI/CD pipeline:

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: moodle_proctor_test
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run migrations
        run: npm run migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/moodle_proctor_test

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/moodle_proctor_test

      - name: Upload test report
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Next Steps

After E2E tests pass:
1. ✅ All phases implemented (Phases 0-4)
2. ✅ E2E tests passing
3. Practice demo flow (< 2 minutes)
4. Prepare rollback plan
5. **Ready for hackathon demo! 🚀**
