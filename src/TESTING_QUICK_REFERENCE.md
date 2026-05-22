# Testing Quick Reference Card

**Print this page and keep it handy!**

---

## 🎯 Three Ways to Test

### 1️⃣ Quick API Tests (5 seconds)
```
Settings → Test Data → "User Defaults API Test Suite" → Run All Tests
Expected: 8/8 tests pass ✅
```

### 2️⃣ Full Validation (20 seconds)
```
Settings → Test Data → "Planner Migration Validation Suite" → Run Full Validation
Expected: All planners pass, 25+ tests ✅
```

### 3️⃣ Manual Smoke Test (3 minutes)
```
Project Wizards → Deck Planner → Defaults tab
→ Change one material → Save → Refresh → Verify → Restore
Expected: Changes persist, restore works ✅
```

---

## 📍 Where Are The Tools?

| Tool | Location | Use For |
|------|----------|---------|
| **API Tests** | Settings → Test Data | Quick validation |
| **Full Validator** | Settings → Test Data | Comprehensive testing |
| **Migration Status** | Settings → Appearance | Check migration status |
| **Defaults UI** | Any Planner → Defaults tab | Manual testing |

---

## ✅ Daily Testing Routine

```
Morning Check (30 seconds):
□ Login
□ Settings → Test Data
□ Run Full Validation
□ Verify green summary
□ Done! ✅

Weekly Deep Test (30 minutes):
□ Run automated tests
□ Test 2 planners manually
□ Check migration status
□ Test on mobile device
□ Document results
```

---

## 🚨 Common Issues - Quick Fixes

| Problem | Fix |
|---------|-----|
| Tests fail | Check network, re-login, try again |
| Changes don't persist | Hard refresh (Ctrl+Shift+R) |
| Migration failed | Settings → Appearance → Migrate to Database |
| Slow performance | Check server logs, verify database |
| Can't find test tools | Must be Admin or Super Admin role |

---

## 📊 What "All Tests Passed" Looks Like

### API Tests (TestUserDefaults)
```
✅ Test 1: Get Empty Defaults - Successfully retrieved
✅ Test 2: Save Defaults - Successfully saved 3 items
✅ Test 3: Get Saved Defaults - Retrieved all 3 items
✅ Test 4: Update Defaults - Successfully updated to 4 items
✅ Test 5: Verify Update - Update verified
✅ Test 6: Delete Defaults - Successfully deleted
✅ Test 7: Verify Deletion - Deletion verified
✅ Test 8: localStorage Migration - Migration successful
```

### Full Validator (PlannerMigrationValidator)
```
Total Tests: 27    Passed: 27    Failed: 0    Warnings: 0
Duration: 18.5s

✅ Deck Planner - 5 tests passed
✅ Garage Planner - 5 tests passed
✅ Shed Planner - 5 tests passed
✅ Roof Planner - 5 tests passed
✅ Kitchen Planner - 5 tests passed
✅ Cross-Planner Tests - 2 tests passed
```

---

## 🎯 Pre-Deployment Checklist

```
□ Run automated tests - all pass
□ Test at least 3 planners manually
□ Verify migration works
□ Test on desktop + mobile
□ Check performance (< 30s)
□ Review error logs (none)
□ Sign off and deploy ✅
```

---

## 📞 Need Help?

**Quick Help:**
- `QUICK_TEST_GUIDE.md` - 5-minute guide
- Browser Console (F12) - Error messages
- Settings → Appearance - Migration status

**Detailed Help:**
- `VALIDATION_TESTING_CHECKLIST.md` - Full checklist
- `README_USER_DEFAULTS_MIGRATION.md` - Complete docs
- `TESTING_SUMMARY.md` - Implementation overview

**Log Prefixes to Look For:**
- `[project-wizard-defaults]` - Client operations
- `[user-planner-defaults]` - Server operations

---

## 🔍 Browser Console Commands

### Check localStorage
```javascript
const orgId = 'YOUR_ORG_ID';
const userId = 'YOUR_USER_ID';
console.log(localStorage.getItem(`planner_defaults_${orgId}_${userId}`));
```

### Clear localStorage
```javascript
const orgId = 'YOUR_ORG_ID';
const userId = 'YOUR_USER_ID';
localStorage.removeItem(`planner_defaults_${orgId}_${userId}`);
console.log('Cleared!');
```

---

## 📈 Performance Targets

| Metric | Target | Warning |
|--------|--------|---------|
| API Response | < 500ms | > 1000ms |
| Page Load | < 2s | > 3s |
| Full Validation | < 30s | > 60s |
| Migration | < 1s | > 2s |

---

## 🎨 Status Indicators

| Symbol | Meaning | Action |
|--------|---------|--------|
| ✅ Green | Test passed | Continue |
| ❌ Red | Test failed | Investigate |
| ⚠️ Yellow | Warning | Review details |
| ℹ️ Blue | Info only | Note for reference |

---

## 🔄 Version Info

**Last Updated:** January 3, 2026  
**Version:** 1.0  
**Status:** Production Ready ✅

---

## 💡 Pro Tips

1. **Run tests after every deploy** - Catches issues early
2. **Test on real devices** - Emulators don't catch everything
3. **Check migration status weekly** - Monitor user adoption
4. **Keep console open** - See real-time logs
5. **Document failures** - Helps with debugging
6. **Test edge cases** - Network offline, large datasets
7. **Verify cross-device** - Biggest benefit of migration

---

## 📱 Test on These Devices (Minimum)

- [ ] Desktop Chrome (Windows/Mac)
- [ ] Desktop Firefox or Safari
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)
- [ ] Tablet (any)

---

## ✨ What Success Looks Like

### For Users
✅ Customizations persist across devices  
✅ No lost data when clearing browser  
✅ Fast, responsive UI  
✅ Clear visual indicators  
✅ Easy to restore defaults  

### For Admins
✅ All automated tests pass  
✅ No errors in logs  
✅ Good performance metrics  
✅ High migration success rate  
✅ Positive user feedback  

### For Developers
✅ Clean code, well documented  
✅ Comprehensive test coverage  
✅ Easy to debug issues  
✅ Scalable architecture  
✅ Production ready  

---

**Keep this reference handy and test regularly! 🚀**
