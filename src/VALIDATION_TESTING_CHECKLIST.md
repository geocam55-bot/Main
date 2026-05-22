# User Planner Defaults Migration - Validation & Testing Checklist

**Date:** January 3, 2026  
**Feature:** User Planner Defaults Database Migration  
**Testing Phase:** Comprehensive Validation

---

## 🎯 Overview

This checklist provides a systematic approach to testing and validating the user planner defaults migration across all five project planners (Deck, Garage, Shed, Roof, Kitchen).

## 📊 Testing Tools Available

### 1. **Automated Test Suite** (Quick API Testing)
- **Location:** Settings → Test Data Tab → "User Defaults API Test Suite"
- **Tests:** 8 automated tests covering CRUD operations and migration
- **Duration:** ~5-10 seconds
- **Use Case:** Quick validation of API functionality

### 2. **Comprehensive Validation Suite** (Full Planner Testing)
- **Location:** Settings → Test Data Tab → "Planner Migration Validation Suite"
- **Tests:** Complete testing across all 5 planners + cross-planner tests
- **Duration:** ~15-30 seconds
- **Use Case:** Thorough validation of all planners and migration scenarios

### 3. **Migration Status Monitor**
- **Location:** Settings → Appearance Tab → "Planner Defaults Migration Status"
- **Features:** View localStorage vs database status, trigger manual migration
- **Use Case:** Monitor and manage migration status for individual users

---

## ✅ Phase 1: Automated Testing

### Step 1.1: Run Basic API Tests
- [ ] Navigate to **Settings → Test Data**
- [ ] Locate **"User Defaults API Test Suite"** card
- [ ] Click **"Run All Tests"**
- [ ] **Expected Result:** All 8 tests pass ✅
  - ✅ Get Empty Defaults
  - ✅ Save Defaults
  - ✅ Get Saved Defaults
  - ✅ Update Defaults
  - ✅ Verify Update
  - ✅ Delete Defaults
  - ✅ Verify Deletion
  - ✅ localStorage Migration

**📸 Screenshot:** Capture test results showing all tests passed

### Step 1.2: Run Comprehensive Planner Validation
- [ ] On the same page, locate **"Planner Migration Validation Suite"** card
- [ ] Click **"Run Full Validation"**
- [ ] Wait for all tests to complete (~15-30 seconds)
- [ ] **Expected Result:** All planners show passed tests
  - ✅ Deck Planner: All tests passed
  - ✅ Garage Planner: All tests passed
  - ✅ Shed Planner: All tests passed
  - ✅ Roof Planner: All tests passed
  - ✅ Kitchen Planner: All tests passed
  - ✅ Cross-Planner Tests: Migration, Cleanup passed

**📸 Screenshot:** Capture overall summary showing total tests passed

---

## ✅ Phase 2: Manual Testing - Per Planner

Complete the following tests for **each** of the 5 planners:

### 2A: Deck Planner Testing

#### Test 2A.1: Basic Save & Retrieve
- [ ] Navigate to **Project Wizards → Deck Planner**
- [ ] Click the **"Defaults"** tab
- [ ] Change one material selection (e.g., Joists → select a different inventory item)
- [ ] Note which material you changed: _______________
- [ ] Click **"Save My Defaults"**
- [ ] **Expected:** Success message appears
- [ ] Refresh the page (F5)
- [ ] Navigate back to **Deck Planner → Defaults**
- [ ] **Expected:** Your customization persists ✅
- [ ] Note: Item marked as "Custom" with your selection

**Status:** ⬜ Pass ⬜ Fail  
**Notes:** _________________________________

#### Test 2A.2: Multiple Material Types
- [ ] Still in Deck Planner Defaults tab
- [ ] Switch to different material type (Spruce → Treated → Cedar → Composite)
- [ ] Customize at least one item in each material type
- [ ] Click **"Save My Defaults"**
- [ ] Refresh page
- [ ] Check each material type tab
- [ ] **Expected:** All customizations persist across material types ✅

**Status:** ⬜ Pass ⬜ Fail  
**Notes:** _________________________________

#### Test 2A.3: Restore Functionality
- [ ] Click **"Restore Organization Defaults"**
- [ ] **Expected:** Confirmation or immediate action
- [ ] **Expected:** All "Custom" badges disappear
- [ ] **Expected:** All items revert to organization defaults
- [ ] Refresh page
- [ ] **Expected:** No customizations remain ✅

**Status:** ⬜ Pass ⬜ Fail  
**Notes:** _________________________________

### 2B: Garage Planner Testing
Repeat Tests 2A.1 - 2A.3 for Garage Planner
- [ ] Test 2B.1: Basic Save & Retrieve - **Status:** ⬜ Pass ⬜ Fail
- [ ] Test 2B.2: Multiple Categories - **Status:** ⬜ Pass ⬜ Fail
- [ ] Test 2B.3: Restore Functionality - **Status:** ⬜ Pass ⬜ Fail

**Notes:** _________________________________

### 2C: Shed Planner Testing
Repeat Tests 2A.1 - 2A.3 for Shed Planner
- [ ] Test 2C.1: Basic Save & Retrieve - **Status:** ⬜ Pass ⬜ Fail
- [ ] Test 2C.2: Multiple Categories - **Status:** ⬜ Pass ⬜ Fail
- [ ] Test 2C.3: Restore Functionality - **Status:** ⬜ Pass ⬜ Fail

**Notes:** _________________________________

### 2D: Roof Planner Testing
Repeat Tests 2A.1 - 2A.3 for Roof Planner
- [ ] Test 2D.1: Basic Save & Retrieve - **Status:** ⬜ Pass ⬜ Fail
- [ ] Test 2D.2: Multiple Categories - **Status:** ⬜ Pass ⬜ Fail
- [ ] Test 2D.3: Restore Functionality - **Status:** ⬜ Pass ⬜ Fail

**Notes:** _________________________________

### 2E: Kitchen Planner Testing
Repeat Tests 2A.1 - 2A.3 for Kitchen Planner
- [ ] Test 2E.1: Basic Save & Retrieve - **Status:** ⬜ Pass ⬜ Fail
- [ ] Test 2E.2: Multiple Categories - **Status:** ⬜ Pass ⬜ Fail
- [ ] Test 2E.3: Restore Functionality - **Status:** ⬜ Pass ⬜ Fail

**Notes:** _________________________________

---

## ✅ Phase 3: Cross-Planner Independence

### Test 3.1: Planner Isolation
- [ ] Customize defaults in **Deck Planner** (save)
- [ ] Customize defaults in **Garage Planner** (save)
- [ ] Customize defaults in **Shed Planner** (save)
- [ ] Navigate back to Deck Planner Defaults
- [ ] **Expected:** Only Deck customizations present ✅
- [ ] Navigate to Garage Planner Defaults
- [ ] **Expected:** Only Garage customizations present ✅
- [ ] **Verify:** No cross-contamination between planners

**Status:** ⬜ Pass ⬜ Fail  
**Notes:** _________________________________

### Test 3.2: Concurrent Editing
- [ ] Open Deck Planner Defaults in one browser tab
- [ ] Open Garage Planner Defaults in another tab
- [ ] Customize and save in both tabs simultaneously
- [ ] Refresh both tabs
- [ ] **Expected:** Both customizations persist independently ✅

**Status:** ⬜ Pass ⬜ Fail  
**Notes:** _________________________________

---

## ✅ Phase 4: Migration Testing

### Test 4.1: localStorage to Database Migration
- [ ] Open browser console (F12)
- [ ] Create test localStorage data:
  ```javascript
  const testData = {
    'deck-spruce-Joists': 'test-item-1',
    'garage-default-Foundation': 'test-item-2'
  };
  const orgId = 'YOUR_ORG_ID'; // Replace with your org ID
  const userId = 'YOUR_USER_ID'; // Replace with your user ID
  localStorage.setItem(`planner_defaults_${orgId}_${userId}`, JSON.stringify(testData));
  ```
- [ ] Navigate to **Settings → Appearance**
- [ ] View **"Planner Defaults Migration Status"**
- [ ] **Expected:** Shows "Has Data" for Browser Storage
- [ ] Click **"Refresh Status"**
- [ ] Click **"Migrate to Database"** (if not auto-migrated)
- [ ] **Expected:** "Migration Complete" status
- [ ] **Expected:** "No Data" for Browser Storage
- [ ] **Expected:** "Has Data" for Database
- [ ] Navigate to Deck Planner Defaults
- [ ] **Expected:** See migrated customization ✅

**Status:** ⬜ Pass ⬜ Fail  
**Notes:** _________________________________

### Test 4.2: Automatic Migration on Planner Load
- [ ] Clear database defaults (use Restore button)
- [ ] Create localStorage data (same as Test 4.1)
- [ ] Navigate directly to **Deck Planner → Defaults**
- [ ] **Expected:** Automatic migration occurs in background
- [ ] **Expected:** Customizations appear in UI
- [ ] Check localStorage (browser console):
  ```javascript
  const orgId = 'YOUR_ORG_ID';
  const userId = 'YOUR_USER_ID';
  console.log(localStorage.getItem(`planner_defaults_${orgId}_${userId}`));
  // Expected: null (cleaned up after migration)
  ```
- [ ] **Expected:** localStorage cleaned up ✅

**Status:** ⬜ Pass ⬜ Fail  
**Notes:** _________________________________

---

## ✅ Phase 5: Performance Testing

### Test 5.1: Response Time
- [ ] Run Comprehensive Validation Suite
- [ ] Note total duration: __________ seconds
- [ ] **Expected:** < 30 seconds for all 5 planners ✅
- [ ] Check individual test durations in results
- [ ] **Expected:** Most operations < 500ms ✅

**Status:** ⬜ Pass ⬜ Fail  
**Notes:** _________________________________

### Test 5.2: Large Dataset Handling
- [ ] Customize 10+ materials across multiple planners
- [ ] Save defaults
- [ ] Refresh page
- [ ] Load each planner's Defaults tab
- [ ] **Expected:** All load within 2 seconds ✅
- [ ] **Expected:** No performance degradation ✅

**Status:** ⬜ Pass ⬜ Fail  
**Notes:** _________________________________

---

## ✅ Phase 6: Error Handling & Edge Cases

### Test 6.1: Network Failure Simulation
- [ ] Open browser DevTools → Network tab
- [ ] Go to Deck Planner Defaults
- [ ] Customize a material
- [ ] Set network to "Offline" in DevTools
- [ ] Click "Save My Defaults"
- [ ] **Expected:** Error message displayed ✅
- [ ] **Expected:** Graceful failure (no crash)
- [ ] Set network back to "Online"
- [ ] Click "Save My Defaults" again
- [ ] **Expected:** Save succeeds ✅

**Status:** ⬜ Pass ⬜ Fail  
**Notes:** _________________________________

### Test 6.2: Empty/Invalid Data
- [ ] Run Comprehensive Validation Suite
- [ ] Check for any "warning" or "fail" statuses
- [ ] Review details of any issues
- [ ] **Expected:** All edge cases handled gracefully ✅

**Status:** ⬜ Pass ⬜ Fail  
**Notes:** _________________________________

### Test 6.3: Concurrent User Testing (if possible)
- [ ] Login with two different user accounts in different browsers
- [ ] User A: Customize Deck defaults, save
- [ ] User B: Customize Deck defaults, save
- [ ] Verify User A only sees their customizations
- [ ] Verify User B only sees their customizations
- [ ] **Expected:** Complete user isolation ✅

**Status:** ⬜ Pass ⬜ Fail  
**Notes:** _________________________________

---

## ✅ Phase 7: Cross-Device Testing (Optional but Recommended)

### Test 7.1: Desktop to Mobile
- [ ] Login on desktop, customize defaults, save
- [ ] Login on mobile device (same user account)
- [ ] Navigate to same planner Defaults tab
- [ ] **Expected:** Customizations appear on mobile ✅
- [ ] Make additional customization on mobile, save
- [ ] Return to desktop, refresh
- [ ] **Expected:** Mobile customization appears on desktop ✅

**Status:** ⬜ Pass ⬜ Fail  
**Device 1:** _______________ **Device 2:** _______________  
**Notes:** _________________________________

### Test 7.2: Different Browsers
- [ ] Login in Chrome, customize defaults, save
- [ ] Login in Firefox/Safari (same user account)
- [ ] **Expected:** Customizations appear in different browser ✅

**Status:** ⬜ Pass ⬜ Fail  
**Browser 1:** _______________ **Browser 2:** _______________  
**Notes:** _________________________________

---

## ✅ Phase 8: UI/UX Verification

### Test 8.1: Visual Indicators
- [ ] Verify "Custom" badge appears on customized items
- [ ] Verify organization defaults don't show "Custom" badge
- [ ] Verify help documentation is accessible and clear
- [ ] Verify migration status displays correctly

**Status:** ⬜ Pass ⬜ Fail  
**Notes:** _________________________________

### Test 8.2: User Flow
- [ ] Complete workflow: Customize → Save → Refresh → Verify → Restore
- [ ] **Expected:** All steps intuitive and clear ✅
- [ ] No confusing error messages
- [ ] Success messages are clear

**Status:** ⬜ Pass ⬜ Fail  
**Notes:** _________________________________

---

## 📊 Test Summary

### Overall Statistics
- **Total Tests Planned:** 40+
- **Tests Passed:** _____ / _____
- **Tests Failed:** _____ / _____
- **Tests Skipped:** _____ / _____
- **Pass Rate:** ______%

### Critical Issues Found
List any critical issues that block functionality:
1. _________________________________
2. _________________________________
3. _________________________________

### Minor Issues Found
List any minor issues or improvements:
1. _________________________________
2. _________________________________
3. _________________________________

### Performance Metrics
- Average API response time: _____ ms
- Average page load time: _____ seconds
- Total validation suite duration: _____ seconds

---

## ✅ Sign-Off

### Tester Information
- **Name:** _________________________________
- **Date:** _________________________________
- **Environment:** Production / Staging / Development
- **Browser:** _________________________________
- **OS:** _________________________________

### Approval
- [ ] All critical tests passed
- [ ] Performance is acceptable
- [ ] Migration is working correctly
- [ ] Ready for production use

**Signature:** _________________________________  
**Date:** _________________________________

---

## 📚 Additional Resources

- **Documentation:** `/docs/PlannerDefaultsMigrationGuide.md`
- **Technical Details:** `/README_USER_DEFAULTS_MIGRATION.md`
- **API Reference:** See README Section on API Endpoints
- **Troubleshooting:** See README Section on Support

---

## 🔧 Quick Reference Commands

### Check localStorage (Browser Console)
```javascript
const orgId = 'YOUR_ORG_ID';
const userId = 'YOUR_USER_ID';
const key = `planner_defaults_${orgId}_${userId}`;
console.log('localStorage data:', localStorage.getItem(key));
```

### Verify Database Entry (via Migration Status)
- Navigate to Settings → Appearance
- View "Planner Defaults Migration Status" card
- Check "Database" section

### Trigger Manual Migration
- Settings → Appearance → Migration Status
- Click "Migrate to Database"

### Clear Test Data
- Go to any planner Defaults tab
- Click "Restore Organization Defaults"
- Or run: Comprehensive Validation Suite (auto-cleans)

---

**End of Checklist**
