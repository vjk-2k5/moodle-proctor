# Moodle LTI 1.1 External Tool Setup Guide

This guide explains how to configure Moodle-Proctoring as an External Tool in Moodle using LTI 1.1.

**Version:** 1.0
**Date:** 2026-03-26
**LTI Version:** 1.1 (OAuth 1.0)
**Compatibility:** Moodle 3.9+

---

## Prerequisites

### Backend Configuration

Ensure the backend is running and accessible from Moodle:

```bash
cd backend
npm run dev
```

Backend should be running at `http://localhost:5000` (or your configured URL).

### Environment Variables

Ensure these are set in `.env`:

```env
LTI_CONSUMER_KEY=moodle
LTI_CONSUMER_SECRET=secret
JWT_SECRET=your-secret-key
BACKEND_URL=http://localhost:5000
```

### Database Migration

Run the LTI support migration:

```bash
cd backend
npm run migrate
```

---

## Step-by-Step Moodle Configuration

### Step 1: Log into Moodle as Instructor

1. Login to your Moodle instance with an instructor/admin account
2. Navigate to the course where you want to add proctoring

### Step 2: Add External Tool Activity

1. **Turn editing on** (top right button)
2. Click **"Add an activity or resource"**
3. Select **"External tool"** from the list
4. Click **"Add"**

### Step 3: Configure External Tool

#### General Settings

| Field | Value |
|-------|-------|
| **Activity name** | `Proctoring Exam` (or any name you prefer) |
| **External tool type** | `Set up tool manually` (click the link) |

#### Tool Settings

After clicking "Set up tool manually", you'll see detailed configuration:

| Field | Value | Required |
|-------|-------|----------|
| **Tool URL** | `http://localhost:5000/api/lti/launch` | ✅ Yes |
| **Consumer key** | `moodle` | ✅ Yes |
| **Shared secret** | `secret` | ✅ Yes |
| **Launch container** | `New window` | Recommended |

**IMPORTANT:**
- Replace `localhost:5000` with your actual backend URL if not running locally
- If Moodle is running on Docker/VM and backend is on host, use `http://host.docker.internal:5000` or your host's IP
- Make sure the backend URL is **accessible from Moodle** (not localhost if Moodle is in Docker)

#### Privacy Settings

Expand the **"Privacy"** section and enable:

| Field | Setting | Required |
|-------|---------|----------|
| **Share launcher's name with tool** | ✅ Checked | Recommended |
| **Share launcher's email with tool** | ✅ Checked | ✅ **Required** |
| **Accept grades from the tool** | ❌ Unchecked | Not needed (Phase 3) |

**Why email is required:** The system uses email to identify students and create user accounts automatically.

**Note:** The Security section mentioned in some guides doesn't exist in all Moodle versions. The LTI module will automatically receive the required context_id and resource_link_id parameters.

### Step 4: Save and Test

1. Click **"Save and return to course"**
2. You should see the new "Proctoring Exam" activity in your course
3. Click the activity to test the LTI launch

---

## Testing the LTI Integration

### Test 1: Instructor Launch

1. Click the External Tool as an instructor
2. You should see a page with a link to the Teacher Dashboard
3. **Expected:** "Instructor Access" page with "Open Teacher Dashboard" button

### Test 2: Student Launch (First Student)

1. Login to Moodle as a student
2. Navigate to the course
3. Click the "Proctoring Exam" activity
4. **Expected:** Browser shows "Launching Proctoring App..." page
5. Desktop app should open automatically
6. Student should be joined to the room automatically

### Test 3: Student Launch (Second Student)

1. Login as a different student
2. Click the "Proctoring Exam" activity
3. **Expected:** Same room code (room is reused for LTI context)
4. Both students should be in the same room

---

## Troubleshooting

### Issue: "Invalid LTI signature" (403 Error)

**Symptoms:** Browser shows error page with "Invalid LTI signature"

**Possible causes:**
1. Consumer key/secret mismatch between Moodle and backend
2. Backend `.env` not configured correctly
3. Clock skew (system time is wrong)

**Solutions:**
```bash
# Check backend .env
cat backend/.env | grep LTI

# Should show:
# LTI_CONSUMER_KEY=moodle
# LTI_CONSUMER_SECRET=secret

# Restart backend after changing .env
cd backend
npm run dev
```

For clock skew, sync your system clock:
```bash
# macOS/Linux
sudo ntpdate -u time.apple.com

# Windows
w32tm /resync
```

---

### Issue: Desktop app doesn't open

**Symptoms:** Browser shows "Launching Proctoring App..." but nothing happens

**Possible causes:**
1. Desktop app not installed
2. Protocol handler not registered
3. Browser blocking the custom protocol

**Solutions:**

**Option 1: Manual launch**
1. Click "Click here to launch" button on the HTML page
2. Or copy the room code and join manually in the desktop app

**Option 2: Install desktop app**
1. Download and install the desktop app
2. Restart browser
3. Try LTI launch again

**Option 3: Check console**
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Look for: "Failed to open proctor:// protocol"

---

### Issue: Room not created

**Symptoms:** Desktop app opens but shows error "Room not found"

**Possible causes:**
1. Database migration not run
2. Backend not running
3. Room creation failed

**Solutions:**

```bash
# Check backend is running
curl http://localhost:5000/health

# Should return:
# {"status":"ok","database":"connected",...}

# Run migrations
cd backend
npm run migrate

# Check backend logs for errors
# Look for: "Failed to create room for LTI context"
```

---

### Issue: Student not auto-joined

**Symptoms:** Desktop app opens but shows login screen instead of joining room

**Possible causes:**
1. JWT token not passed correctly
2. Token expired
3. Browser localStorage cleared

**Solutions:**

**Option 1: Check console**
1. Open DevTools in desktop app (Ctrl+Shift+I)
2. Check Console tab
3. Look for: "LTI launch event received"

**Option 2: Manual join**
1. Copy room code from LTI launch page
2. Enter room code manually in join page
3. Login normally (workaround)

---

## Security Considerations

### Consumer Key/Secret

**⚠️ IMPORTANT:** Do NOT use default credentials in production!

For production:
1. Generate strong random consumer key/secret
2. Update backend `.env`:
   ```env
   LTI_CONSUMER_KEY=random-32-char-string
   LTI_CONSUMER_SECRET=random-64-char-string
   ```
3. Update Moodle External Tool configuration with same values

### HTTPS

**⚠️ REQUIRED for production:**
- Backend must use HTTPS (not HTTP)
- Use reverse proxy (nginx/Apache) with SSL certificate
- Update Tool URL in Moodle: `https://your-domain.com/api/lti/launch`

### Timestamp Validation

The backend validates OAuth timestamps to prevent replay attacks:
- Requests must be within 5 minutes of server time
- Sync system clocks if seeing "Invalid timestamp" errors

---

## Advanced Configuration

### Custom Consumer Keys (Multi-Tenant)

For multiple Moodle instances:

1. Create `lti_consumers` table (future enhancement):
   ```sql
   CREATE TABLE lti_consumers (
     id SERIAL PRIMARY KEY,
     consumer_key VARCHAR(255) UNIQUE NOT NULL,
     consumer_secret VARCHAR(255) NOT NULL,
     moodle_instance_url VARCHAR(255),
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. Update `lti.service.ts` to lookup consumer secret by key

3. Configure different consumer key/secret per Moodle instance

### Custom Launch Parameters

Add custom parameters to LTI launch for course-specific settings:

**In Moodle External Tool:**
- Custom parameters field: `course_id=$Course.id`

**In backend `lti.routes.ts`:**
- Access via: `body.custom_course_id`

---

## Moodle Version Compatibility

| Moodle Version | LTI 1.1 Support | Status |
|----------------|-----------------|--------|
| 3.9 - 4.0 | ✅ Built-in | Supported |
| 4.1 - 4.3 | ✅ Built-in | Supported |
| Bitnami Legacy | ✅ Built-in | Supported |

**Note:** LTI 1.1 is deprecated but still supported in all Moodle versions. LTI 1.3 (OAuth 2.0) is NOT supported in this implementation.

---

## Next Steps

After LTI setup is working:

1. **Create Exam Content:** Add exam questions in the dashboard (manual for Phase 1)
2. **Invite Students:** Share the External Tool link with students
3. **Monitor Room:** Use Teacher Dashboard to monitor students
4. **Export Results:** Export violation reports and session data

**Future Phases:**
- **Phase 2:** ✅ COMPLETED - Moodle Quiz API integration (fetch questions from Moodle)
- **Phase 3:** ✅ COMPLETED - Grade passback via LTI Outcomes service

---

## Support

For issues or questions:
1. Check backend logs: `tail -f backend/logs/combined.log`
2. Check browser console (F12)
3. Check desktop app console (Ctrl+Shift+I)
4. Review troubleshooting section above
5. Create issue on GitHub: https://github.com/aryaniyaps/moodle-proctor/issues

---

**Last Updated:** 2026-03-26
**Author:** Claude Code (LTI Implementation)
**Status:** ✅ Approved for Implementation (Option A - LTI Launch Only)
