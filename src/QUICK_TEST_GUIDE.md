# Quick Testing Guide - User Planner Defaults Migration

**Quick Start:** 5-minute validation of the migration system

---

## 🚀 Fast Track Testing (5 minutes)

### Step 1: Run Automated Tests (2 minutes)

1. **Login** to ProSpaces CRM
2. Navigate to **Settings** (sidebar)
3. Click **Test Data** tab
4. Scroll to **"Planner Migration Validation Suite"**
5. Click **"Run Full Validation"**
6. ⏱️ Wait ~20 seconds
7. ✅ **Verify:** Green summary shows all tests passed

**Expected Result:**
```
Total Tests: 25+
Passed: 25+
Failed: 0
Warnings: 0
```

---

### Step 2: Quick Manual Test (3 minutes)

1. Navigate to **Project Wizards → Deck Planner**
2. Click **"Defaults"** tab
3. Change **one material** (e.g., select a different "Joists" item)
4. Click **"Save My Defaults"**
5. ✅ See success message
6. **Refresh the page** (F5)
7. Go back to **Deck Planner → Defaults**
8. ✅ **Verify:** Your change persisted (see "Custom" badge)
9. Click **"Restore Organization Defaults"**
10. ✅ **Verify:** Change reverted

---

## 📋 Complete Testing Checklist

For thorough testing, see: [`VALIDATION_TESTING_CHECKLIST.md`](./VALIDATION_TESTING_CHECKLIST.md)

---

## 🔍 Testing Tool Locations

### 1. Automated Test Suite
**Path:** Settings → Test Data → "User Defaults API Test Suite"  
**Function:** Tests basic CRUD operations  
**Duration:** ~5 seconds  
**Tests:** 8

### 2. Comprehensive Validator
**Path:** Settings → Test Data → "Planner Migration Validation Suite"  
**Function:** Tests all 5 planners + migration  
**Duration:** ~20 seconds  
**Tests:** 25+

### 3. Migration Status
**Path:** Settings → Appearance → "Planner Defaults Migration Status"  
**Function:** View/manage migration status  
**Features:**
- Check localStorage vs database
- Trigger manual migration
- View item counts

---

## ✅ What to Verify

### Core Functionality
- [x] Save defaults to database
- [x] Retrieve defaults from database
- [x] Update existing defaults
- [x] Delete/restore defaults
- [x] Migrate from localStorage
- [x] Cross-planner independence

### User Experience
- [x] "Custom" badges display correctly
- [x] Help documentation accessible
- [x] Success/error messages clear
- [x] Restore button works
- [x] Page refreshes preserve data

### Performance
- [x] API responses < 500ms
- [x] Page loads < 2 seconds
- [x] No UI freezing
- [x] Handles 10+ customizations

---

## 🐛 Common Issues & Solutions

### Issue: "Migration Failed"
**Solution:**
1. Check network connection
2. Verify logged in
3. Check browser console for errors
4. Try manual migration via Settings → Appearance

### Issue: "Customizations not persisting"
**Solution:**
1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. Check migration status
3. Verify you're clicking "Save My Defaults"
4. Check browser console for API errors

### Issue: "All tests failed"
**Solution:**
1. Check server is running
2. Verify authentication token valid
3. Check network tab in DevTools
4. Review server logs in Supabase

---

## 📊 Test Results Template

```
Date: ___________
Tester: ___________
Environment: Production / Staging / Development

✅ Automated Tests: Pass / Fail
   - Total: ___ / ___
   - Duration: ___ seconds

✅ Manual Tests: Pass / Fail
   - Deck: Pass / Fail
   - Garage: Pass / Fail
   - Shed: Pass / Fail
   - Roof: Pass / Fail
   - Kitchen: Pass / Fail

✅ Migration: Pass / Fail
   - Auto-migration: Pass / Fail
   - Manual migration: Pass / Fail
   - Cleanup: Pass / Fail

Issues Found:
1. ___________
2. ___________
3. ___________

Overall Status: ✅ PASS / ❌ FAIL
```

---

## 🎯 Success Criteria

**Minimum requirements for PASS:**
- ✅ All automated tests pass
- ✅ At least 3 planners tested manually
- ✅ Migration tested successfully
- ✅ No critical errors
- ✅ Performance acceptable

---

## 📞 Need Help?

**Documentation:**
- Full Testing Checklist: `VALIDATION_TESTING_CHECKLIST.md`
- Migration Guide: `docs/PlannerDefaultsMigrationGuide.md`
- Technical Details: `README_USER_DEFAULTS_MIGRATION.md`

**Logs to Check:**
- Browser Console (F12)
- Network Tab (for API calls)
- Supabase Logs (for server errors)

**Common Log Prefixes:**
- `[project-wizard-defaults]` - Client-side operations
- `[user-planner-defaults]` - Server-side operations

---

**Last Updated:** January 3, 2026
