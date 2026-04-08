# LTI Demo Deployment Checklist

**Purpose**: Ensure reliable deployment of Moodle Proctor LTI integration for hackathon demo
**Last Updated**: 2025-04-08
**Estimated Setup Time**: 30 minutes

---

## Prerequisites

### Hardware/Software Requirements
- [ ] **Backend Machine**: Linux/Mac/Windows with Node.js 18+, Docker
- [ ] **Moodle Server**: Access to Moodle 3.x+ instance (admin or teacher role)
- [ ] **Student Machine**: Windows/Mac/Linux for desktop app
- [ ] **Network**: All machines on same network OR publicly accessible backend URL

### Accounts & Access
- [ ] Moodle teacher account credentials
- [ ] Backend server SSH access (or local terminal access)
- [ ] Database admin access (for migration verification)

---

## Phase 1: Backend Setup (15 minutes)

### 1.1 Environment Configuration

**Create/Edit `backend/.env`**:
```bash
cd /home/aryaniyaps/web-projects/moodle-proctor/backend
nano .env
```

**Required Environment Variables**:
```bash
# Database
DATABASE_URL=postgresql://moodle_proctor:your_password@localhost:5432/moodle_proctor

# JWT Secret (generate random 32+ character string)
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars_long

# LTI OAuth 1.0 Credentials
LTI_CONSUMER_KEY=moodle
LTI_SECRET=shared_secret_with_moodle_change_this

# Server Configuration
PORT=5000
NODE_ENV=production

# CORS (if Moodle on different domain)
CORS_ORIGIN=https://your-moodle-server.com
```

**Verification**:
```bash
# Check .env file exists and is not empty
ls -la .env
cat .env | grep JWT_SECRET
```

### 1.2 Database Migrations

**Apply all migrations**:
```bash
cd backend
npm run migrate
```

**Expected Output**:
```
✓ Migration 001: Create users table
✓ Migration 002: Create courses table
✓ Migration 003: Create exams table
✓ Migration 004: Create proctoring_rooms table
✓ Migration 005: Create room_enrollments table
✓ Migration 006: Create violations table
✓ Migration 007: Add LTI support columns  ← CRITICAL for demo
```

**Verify Migration 007**:
```bash
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'proctoring_rooms' AND column_name IN ('lti_context_key', 'lti_context_label', 'lti_resource_id', 'auto_created');"
```

**Expected Output**:
```
 column_name
--------------
 lti_context_key
 lti_context_label
 lti_resource_id
 auto_created
(4 rows)
```

**If migration fails**:
```bash
# Check current migration status
npm run migrate:status

# Rollback and retry (if needed)
npm run migrate:down 007
npm run migrate
```

### 1.3 Start Backend Server

**Development Mode** (for demo):
```bash
cd backend
npm run dev
```

**Production Mode**:
```bash
cd backend
npm run build
npm start
```

**Verify Server Running**:
```bash
curl http://localhost:5000/health
```

**Expected Output**:
```json
{
  "status": "ok",
  "timestamp": "2025-04-08T12:00:00.000Z"
}
```

**If health check fails**:
- Check `backend/.env` exists
- Check `DATABASE_URL` is correct
- Check PostgreSQL is running: `sudo systemctl status postgresql`

---

## Phase 2: Desktop App Setup (10 minutes)

### 2.1 Install Desktop App on Student Machine

**Option A: Development Mode** (recommended for demo):
```bash
# Clone repo on student machine
cd /path/to/moodle-proctor/manual_proctoring

# Install dependencies
npm install

# Start desktop app
npm run dev
```

**Option B: Production Build**:
```bash
cd manual_proctoring
npm install
npm run build
npm run start
```

**Verification**:
- [ ] Desktop app window opens
- [ ] Shows "Join Room" or "Login" screen
- [ ] No console errors (press Ctrl+Shift+I to open DevTools)

### 2.2 Verify Custom Protocol Handler

**Test Protocol Registration**:
```bash
# Windows
reg query "HKEY_CLASSES_ROOT\proctor"

# Mac/Linux
echo "Open browser and navigate to: proctor://test"
```

**Expected Result**: Desktop app opens (or prompts to open)

**If protocol handler fails**:
- **Development mode**: Protocol auto-registers when `npm run dev` starts
- **Production build**: Run installer with admin privileges
- **Manual registration** (Windows):
  ```cmd
  assoc .proctor=ProctorFile
  ftype ProctorFile="C:\path\to\app.exe" "%1"
  ```

---

## Phase 3: Moodle LTI Configuration (5 minutes)

### 3.1 Add External Tool in Moodle

**Step-by-Step**:

1. **Navigate to Moodle Course**
   - Login as teacher
   - Go to course page
   - Click "Turn editing on" (top right)

2. **Add External Tool Activity**
   - Click "Add an activity or resource"
   - Select "External tool"
   - Click "Add"

3. **Configure External Tool**

   **General Settings**:
   - Activity name: `Proctoring Exam - Midterm` (or any name)
   - External tool type: `Set up tool manually`

   **Tool Settings**:
   - Tool URL: `http://localhost:5000/api/lti/launch`
     - Replace `localhost:5000` with actual backend URL if remote
   - Consumer key: `moodle`
   - Shared secret: `(value from backend/.env LTI_SECRET)`

   **Privacy**:
   - ✅ Share launcher's name with tool
   - ✅ Share launcher's email with tool
   - ❌ Accept grades from tool (not needed for proctoring)

4. **Save and Display**
   - Click "Save and display"
   - Moodle will redirect to backend LTI launch endpoint

### 3.2 Test LTI Launch

**Click the LTI link** you just created in Moodle:

**Expected Result**:
1. Browser shows "Launching Proctoring App..." page
2. Desktop app opens automatically
3. Desktop app shows prefilled form (name, email, room code)
4. Auto-join executes (if token valid)

**If deep link fails**:
- Check browser console for errors
- Verify backend URL is accessible: `curl http://localhost:5000/api/lti/launch`
- Check desktop app protocol handler registered (Phase 2.2)
- Check JWT token in redirect HTML (View Source)

**Common Issues**:
| Issue | Solution |
|-------|----------|
| "Invalid LTI signature" | Check `LTI_SECRET` matches between Moodle and backend `.env` |
| "Room not found" | Check database has room for `lti_context_key` |
| "Desktop app doesn't open" | Check protocol handler registration (Phase 2.2) |
| "Token validation failed" | Check `JWT_SECRET` is set in backend `.env` |

---

## Phase 4: Pre-Demo Verification (5 minutes)

### 4.1 Health Check Checklist

**Backend Health**:
```bash
curl http://localhost:5000/health
```
- [ ] Returns `{"status": "ok"}`
- [ ] Response time < 200ms

**Database Connectivity**:
```bash
cd backend
node -e "const {Pool} = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT 1').then(() => console.log('✓ DB OK')).catch(e => console.error('✗ DB FAIL', e))"
```
- [ ] Prints `✓ DB OK`

**LTI Endpoint Availability**:
```bash
curl -X POST http://localhost:5000/api/lti/launch
```
- [ ] Returns error (expected, but proves endpoint exists)

**Desktop App Running**:
- [ ] App window visible
- [ ] Can navigate to "Join Room" screen

### 4.2 End-to-End Smoke Test

**Test Complete Flow**:

1. **Create Test Room in Moodle**
   - Add External Tool (Phase 3.1)
   - Save and return to course

2. **Launch LTI Tool**
   - Click the LTI link
   - [ ] Browser shows "Launching..." page
   - [ ] Desktop app opens
   - [ ] Room code prefilled (e.g., "XY7kPq2M")
   - [ ] Name and email prefilled

3. **Join Room**
   - Click "Join Room" (or auto-join)
   - [ ] Redirects to exam page
   - [ ] Shows "Room joined successfully"

4. **Verify Backend Logs**
   - Check backend terminal for:
     - `POST /api/lti/launch 200`
     - `GET /api/room/XY7kPq2M/validate-token 200`
     - `POST /api/room/XY7kPq2M/join 200`

**If any step fails**:
- Check specific section above (Phase 1-3)
- Review error logs in backend terminal
- Review browser console (F12)
- Review desktop app DevTools (Ctrl+Shift+I)

---

## Phase 5: Rollback Plan (If Demo Fails)

### 5.1 Emergency Rollback Steps

**If LTI Launch Fails**:
1. Switch to manual room creation flow:
   - Go to `http://localhost:3000` (teacher dashboard)
   - Create room manually
   - Share room code with students

2. Verify fallback works:
   ```bash
   # Test manual room creation
   curl http://localhost:3000/api/room -H "Content-Type: application/json" -d '{"examId": 1, "teacherId": 1}'
   ```

**If Database Errors**:
1. Rollback migration 007:
   ```bash
   cd backend
   npm run migrate:down 007
   ```

2. Restart backend:
   ```bash
   npm run dev
   ```

**If Desktop App Fails**:
1. Use web-based room join (if available):
   ```bash
   # Open in browser
   http://localhost:3000/join?code=XY7kPq2M&name=Test&email=test@example.com
   ```

### 5.2 Database Backup (Pre-Demo)

**Create Backup**:
```bash
pg_dump $DATABASE_URL > pre-demo-backup-$(date +%Y%m%d-%H%M%S).sql
```

**Restore Backup** (if needed):
```bash
psql $DATABASE_URL < pre-demo-backup-YYYYMMDD-HHMMSS.sql
```

---

## Phase 6: Demo Day Execution

### 6.1 Setup Timeline (30 Minutes Before Demo)

**T-30 minutes**:
- [ ] Start backend server (if not running)
- [ ] Start desktop app on student machine
- [ ] Open backend terminal with logs visible
- [ ] Open Moodle course page in browser
- [ ] Open teacher dashboard in separate tab

**T-15 minutes**:
- [ ] Run health check: `curl http://localhost:5000/health`
- [ ] Run smoke test (Phase 4.2)
- [ ] Verify all machines on same network (if distributed)
- [ ] Test deep link one more time

**T-5 minutes**:
- [ ] Clear browser cache on student machine
- [ ] Close unnecessary apps (to prevent lag)
- [ ] Have rollback plan ready (Phase 5)

### 6.2 During Demo

**Monitor**:
- Backend terminal for errors (red text)
- Desktop app for crashes
- Network connectivity (all machines accessible)

**If Demo Crashes**:
1. Don't panic - switch to manual room creation
2. Explain "We're switching to manual mode for reliability"
3. Proceed with manual flow (proven to work)

### 6.3 Post-Demo

**Cleanup**:
```bash
# Stop backend (Ctrl+C in terminal)

# Close desktop app

# Optional: Reset demo data
cd backend
npm run seed:clear  # If seed script exists
```

**Celebrate** 🎉

---

## Troubleshooting Guide

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `column "lti_context_key" does not exist` | Migration 007 not applied | Run `npm run migrate` (Phase 1.2) |
| `JWT_SECRET not set` | Missing `.env` file | Create `backend/.env` with all vars (Phase 1.1) |
| `Invalid LTI signature` | OAuth 1.0 mismatch | Check `LTI_SECRET` matches Moodle config |
| `Protocol not supported` | Desktop app not installed | Install and register protocol handler (Phase 2.2) |
| `ECONNREFUSED` | Backend not running | Start backend: `npm run dev` (Phase 1.3) |
| `Room not found` | Room not created | Check LTI launch created room in DB |
| `Token validation failed` | JWT missing/invalid | Check `JWT_SECRET` matches, token not expired |

### Debug Commands

**Check LTI room creation**:
```bash
psql $DATABASE_URL -c "SELECT id, room_code, lti_context_key, auto_created FROM proctoring_rooms WHERE auto_created = true ORDER BY created_at DESC LIMIT 5;"
```

**Check recent enrollments**:
```bash
psql $DATABASE_URL -c "SELECT * FROM proctoring_room_enrollments ORDER BY enrolled_at DESC LIMIT 10;"
```

**View backend logs in real-time**:
```bash
# Backend should already be running in terminal
# If using PM2 (production):
pm2 logs moodle-proctor-backend
```

**Test JWT token manually**:
```bash
# Extract token from redirect HTML (View Source)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -X POST http://localhost:5000/api/room/XY7kPq2M/validate-token -H "Content-Type: application/json" -d "{\"token\": \"$TOKEN\"}"
```

---

## Appendix: Environment Variables Reference

### Required Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/db` | PostgreSQL connection string |
| `JWT_SECRET` | `random_32_char_string` | Secret for signing LTI tokens |
| `LTI_CONSUMER_KEY` | `moodle` | OAuth 1.0 consumer key |
| `LTI_SECRET` | `shared_secret` | OAuth 1.0 shared secret |
| `PORT` | `5000` | Backend server port |
| `NODE_ENV` | `production` | Environment (development/production) |

### Optional Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `CORS_ORIGIN` | `https://moodle.example.com` | Allowed CORS origin |
| `LOG_LEVEL` | `info` | Logging verbosity (debug/info/error) |

---

## Quick Reference Commands

```bash
# Backend
cd backend
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run migrate      # Apply database migrations
npm run migrate:status  # Check migration status

# Desktop App
cd manual_proctoring
npm install          # Install dependencies
npm run dev          # Start development app
npm run build        # Build for production
npm run start        # Start production app

# Database
pg_dump $DATABASE_URL > backup.sql  # Backup
psql $DATABASE_URL < backup.sql     # Restore
psql $DATABASE_URL                   # Open SQL shell

# Health Check
curl http://localhost:5000/health    # Check backend status
```

---

## Success Criteria

**Demo is ready when**:
- ✅ All 6 phases completed
- ✅ Health check returns 200 OK
- ✅ Smoke test passes end-to-end
- ✅ At least one person has tested complete flow on demo machines
- ✅ Rollback plan documented and tested

**Demo success metric**:
- Teacher clicks LTI link in Moodle → Desktop app opens → Student joins room → All in < 10 seconds

---

**Questions? Issues?**
- Check troubleshooting guide above
- Review error logs in backend terminal
- Test each phase independently before full demo

**Good luck with your demo! 🚀**
