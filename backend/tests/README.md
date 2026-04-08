# Moodle Proctor - E2E Test Suite

## Overview

This directory contains end-to-end tests for the Moodle Proctor LTI integration using Playwright.

## Test Structure

```
tests/
├── e2e/
│   ├── lti.spec.ts          # Main LTI integration test suite
│   ├── helpers.ts            # Test utilities and helpers
│   └── MANUAL_TEST_GUIDE.md  # Manual testing guide
└── README.md                 # This file
```

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Install Playwright Browsers

```bash
npx playwright install chromium
```

### 3. Setup Test Environment

```bash
# Copy test environment file
cp .env.example .env.test

# Edit .env.test with your test database credentials
```

### 4. Run Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (for debugging)
npm run test:e2e:ui

# Run with debug mode
npm run test:e2e:debug

# Clean test data after running
npm run test:clean
```

## Test Coverage

### LTI Integration Tests (`lti.spec.ts`)

#### Phase 1: LTI Launch Flow
- ✅ Valid LTI launch with OAuth signature
- ✅ Invalid LTI signature rejection
- ✅ Instructor redirect to dashboard

#### Phase 2: JWT Token Validation
- ✅ Valid JWT token validation
- ✅ Invalid JWT token rejection
- ✅ Room code mismatch detection

#### Phase 3: Room Ownership Transfer
- ✅ First instructor becomes room owner
- ✅ Owner can update room settings
- ✅ Non-owner cannot update

#### Phase 4: Room Join Flow
- ✅ Successful room join with token
- ✅ Capacity enforcement at validation
- ✅ Duplicate enrollment prevention

#### Phase 5: Capacity Editing
- ✅ Teacher can update room capacity
- ✅ Capacity limits enforced

#### Error Handling
- ✅ Database connection errors
- ✅ Room not found errors
- ✅ Invalid request handling

## Test Helpers

### `DatabaseHelper`
Manages database connections and test data cleanup.

```typescript
const db = new DatabaseHelper();
await db.connect();
await db.cleanTestLtiData();
const room = await db.getRoomByCode('TESTCODE1');
await db.disconnect();
```

### `ApiHelper`
Makes API calls to backend endpoints.

```typescript
const api = new ApiHelper();
const response = await api.ltiLaunch(params);
const validation = await api.validateToken(roomCode, token);
const join = await api.joinRoom(roomCode, studentData);
```

### `LtiHelper`
Generates LTI launch requests with OAuth signatures.

```typescript
const lti = new LtiHelper();
const request = lti.createLtiLaunchRequest({
  user_email: 'test@example.com'
});
const signature = lti.generateOAuthSignature(url, 'POST', params);
```

### `TestDataGenerator`
Generates random test data.

```typescript
const email = TestDataGenerator.randomEmail();
const name = TestDataGenerator.randomName();
const roomCode = TestDataGenerator.randomRoomCode();
```

### `Assertions`
Custom assertions for common responses.

```typescript
Assertions.assertLtiSuccess(response);
Assertions.assertTokenValidationSuccess(response);
Assertions.assertRoomJoinSuccess(response);
Assertions.assertCapacityEnforced(response);
```

## Manual Testing

See `MANUAL_TEST_GUIDE.md` for detailed manual testing scenarios including:
- Basic LTI launch flow
- JWT token validation
- Room join with capacity enforcement
- Teacher ownership transfer
- Capacity editing (frontend)
- Complete LTI → Join flow

## Environment Variables

Required in `.env.test`:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/moodle_proctor_test

# Backend
BACKEND_URL=http://localhost:5000
JWT_SECRET=dev-secret

# LTI
LTI_CONSUMER_KEY=moodle
LTI_CONSUMER_SECRET=secret
```

## Continuous Integration

To run E2E tests in CI/CD:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

See `MANUAL_TEST_GUIDE.md` for full GitHub Actions workflow example.

## Troubleshooting

### Tests fail with "Backend not running"

**Solution:** Start the backend server in a separate terminal:
```bash
npm run dev
```

### Tests fail with "Database connection error"

**Solution:** Ensure PostgreSQL is running and test database exists:
```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Create test database
createdb moodle_proctor_test

# Run migrations
npm run migrate
```

### Playwright can't find browsers

**Solution:** Install Playwright browsers:
```bash
npx playwright install chromium
```

### Tests timeout

**Solution:** Increase timeout in `playwright.config.ts`:
```typescript
use: {
  actionTimeout: 10 * 1000,  // 10 seconds
}
```

## Writing New Tests

1. Create test file in `tests/e2e/`:
```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should do something', async () => {
    // Arrange
    const api = new ApiHelper();

    // Act
    const response = await api.myMethod();

    // Assert
    expect(response.status).toBe(200);
  });
});
```

2. Run test:
```bash
npx playwright test my-feature.spec.ts
```

3. Debug with UI:
```bash
npx playwright test my-feature.spec.ts --ui
```

## Test Data Management

### Before Tests
Tests should clean up old data:
```typescript
test.beforeEach(async () => {
  await db.cleanTestLtiData();
});
```

### After Tests
Clean up to prevent data accumulation:
```bash
npm run test:clean
```

Or manually:
```bash
psql moodle_proctor_test <<EOF
DELETE FROM room_enrollments WHERE user_email LIKE '%@example.com';
DELETE FROM proctoring_rooms WHERE lti_context_key LIKE 'test-%';
DELETE FROM users WHERE email LIKE '%@example.com';
EOF
```

## Best Practices

1. **Isolation:** Each test should be independent and clean up after itself
2. **Determinism:** Avoid random data where possible; use fixtures
3. **Speed:** Use API calls instead of UI when possible
4. **Clarity:** Use descriptive test names and comments
5. **Assertions:** Use specific assertion helpers for consistency

## Contributing

When adding new features:
1. Write E2E tests first (TDD)
2. Update `MANUAL_TEST_GUIDE.md` with manual test scenarios
3. Add helpers to `helpers.ts` if needed
4. Update this README with new test coverage

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [LTI 1.1 Specification](https://www.imsglobal.org/specs/ltiv1p1)
- [OAuth 1.0 Guide](https://oauth.net/core/1.0/)
- [Project Design Doc](../LTI_DESIGN_DOC.md)

## Support

For issues or questions:
1. Check `MANUAL_TEST_GUIDE.md` troubleshooting section
2. Review test output logs
3. Check backend logs: `tail -f logs/combined.log`
4. Open GitHub issue with test output and logs
