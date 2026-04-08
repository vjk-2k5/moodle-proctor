# LTI Quick Start Guide

## ✅ Signature Validation Works Out of the Box!

The LTI integration now works properly with OAuth 1.0 signature validation enabled by default. You **do not** need to disable signature validation.

**What was fixed:**
- ✅ Proper nonce store implementation for `ims-lti` library
- ✅ Form-encoded data parsing (LTI sends `application/x-www-form-urlencoded`)
- ✅ OAuth 1.0 signature validation with `MemoryNonceStore`
- ✅ Automatic timestamp and replay attack prevention

---

## Problem: "Invalid LTI Signature" Error

If you still see this error, it's likely a configuration issue, not a code issue.

---

## Solution: Debug Signature Validation (Advanced)

**Step 1:** Check backend logs:
```bash
tail -f /tmp/backend.log
```

**Step 2:** Try LTI launch from Moodle and look for these log lines:
```
LTI launch request received
```

**Step 3:** Common causes:

| Issue | Solution |
|-------|----------|
| Wrong consumer key | Ensure Moodle has `moodle` and backend `.env` has `LTI_CONSUMER_KEY=moodle` |
| Wrong shared secret | Ensure Moodle has `secret` and backend `.env` has `LTI_CONSUMER_SECRET=secret` |
| Clock skew | Sync system clock on both Moodle and backend machines |
| URL mismatch | Backend URL in Moodle must match actual accessible URL |

**Step 4:** Check what Moodle is sending:
- Enable Moodle debugging: Site administration > Development > Debugging > Debug messages: Yes
- Check the POST request body Moodle is sending to `/api/lti/launch`

---

## Testing LTI Integration

### Test 1: Basic Launch (No Signature Check)

1. Set `LTI_DISABLE_SIGNATURE_VALIDATION=true` in `backend/.env`
2. Restart backend
3. Click External Tool in Moodle
4. **Expected:** Browser shows "Launching Proctoring App..." page

### Test 2: With Signature Validation

1. Set `LTI_DISABLE_SIGNATURE_VALIDATION=false`
2. Restart backend
3. Click External Tool in Moodle
4. **Expected:** Same as Test 1, or error message to debug

### Test 3: Room Creation

After successful launch, check database:
```bash
docker exec -it moodle-proctor-db psql -U proctor_user -d moodle_proctor

SELECT room_code, lti_context_key, auto_created, created_at
FROM proctoring_rooms
WHERE lti_context_key IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** One or more rooms with `auto_created=true` and `lti_context_key` set

### Test 4: Desktop App Launch

1. Install desktop app (if not already installed)
2. Click External Tool in Moodle as student
3. **Expected:** Desktop app opens automatically and joins room

---

## Common Moodle Configuration Issues

### Issue 1: Security Section Not Found

**Problem:** Documentation mentions "Security" section but it doesn't exist in Moodle.

**Solution:** This is normal! Not all Moodle versions have this section. The LTI module will automatically receive the required `context_id` and `resource_link_id` parameters without needing manual configuration.

### Issue 2: Wrong Backend URL

**Problem:** Moodle can't reach backend because it's configured as `localhost:5000`.

**Solution:** Use the actual accessible URL:
- If Moodle is in Docker and backend on host: `http://host.docker.internal:5000`
- If both on same machine: `http://localhost:5000`
- If different machines: Use backend machine's IP address

### Issue 3: Email Not Shared

**Problem:** User creation fails because email is missing.

**Solution:** In Moodle External Tool > Privacy, ensure "Share launcher's email with tool" is **checked**.

---

## Verification Checklist

Before testing LTI launch, verify:

- [ ] Backend is running: `curl http://localhost:5000/health`
- [ ] LTI config endpoint works: `curl http://localhost:5000/api/lti/config`
- [ ] Database migration applied: `cd backend && npm run migrate:status`
- [ ] Consumer key matches: Moodle `moodle` = Backend `LTI_CONSUMER_KEY=moodle`
- [ ] Shared secret matches: Moodle `secret` = Backend `LTI_CONSUMER_SECRET=secret`
- [ ] Backend URL accessible from Moodle: Try opening URL in browser from Moodle server
- [ ] Email sharing enabled in Moodle Privacy settings
- [ ] Launch container set to "New window" (recommended)

---

## Still Having Issues?

1. **Check backend logs:**
   ```bash
   tail -50 /tmp/backend.log | grep -i lti
   ```

2. **Enable Moodle debugging:**
   - Site administration > Development > Debugging > Debug messages: Yes
   - Site administration > Development > Debugging > Debug level: DEVELOPER

3. **Test with Postman/curl:**
   ```bash
   # Get LTI config
   curl http://localhost:5000/api/lti/config

   # Test launch endpoint (will fail but shows endpoint is reachable)
   curl -X POST http://localhost:5000/api/lti/launch \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "oauth_consumer_key=moodle&oauth_timestamp=$(date +%s)&oauth_nonce=test&context_id=test&resource_link_id=test&user_id=1&roles=Learner"
   ```

4. **Check database:**
   ```bash
   docker exec -it moodle-proctor-db psql -U proctor_user -d moodle_proctor -c "\d proctoring_rooms"
   ```

---

## Next Steps

Once LTI launch is working:

1. **Test student flow:** Click External Tool as student → Desktop app opens → Joins room
2. **Test room reuse:** Multiple students clicking same External Tool should join same room
3. **Test instructor flow:** Click as instructor → Should see "Instructor Access" page
4. **Enable signature validation:** Set `LTI_DISABLE_SIGNATURE_VALIDATION=false`
5. **Test in production:** Use strong consumer key/secret (not default)

---

## Need Help?

- Check `LTI_SETUP.md` for detailed setup instructions
- Review backend logs: `/tmp/backend.log`
- Check Moodle logs: Site administration > Reports > Logs
- Create issue on GitHub with logs and configuration
