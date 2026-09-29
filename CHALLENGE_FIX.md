# Challenge Mode Bug Fixes

## Issues Fixed

### Issue 1: Duplicate Answer Options
**Problem**: All answer options were identical (e.g., all showing "Hello / Good afternoon")

**Root Cause**: The distractor generation didn't handle duplicate translations properly. When vocabulary words shared the same translation, the distractor array would include duplicates.

**Fix**: 
- Added Set-based deduplication for unique distractors
- Added fallback to generic translations if not enough unique options exist
- Ensured minimum 2 options always shown (correct + at least 1 wrong)

### Issue 2: Single Option Displayed
**Problem**: Only 1 answer option appeared instead of 4

**Root Cause**: With limited vocabulary (< 4 words), the code couldn't generate enough distractors and collapsed to a single option.

**Fix**:
- Added generic fallback options: "Goodbye", "Please", "Thank you", "Sorry", "Yes", "No", etc.
- Guarantee at least 2 options per question
- Use all available words (not just first 10)

## Current State
- ✅ Build passes clean
- ✅ Server running at http://localhost:3000
- ✅ Challenge Mode shows unique options
- ✅ Works with any vocabulary size (minimum 4 words required)

## Files Modified
- `src/components/ChallengeMode.tsx` — Fixed `generateQuestions()` function
- `CHALLENGE_FIX.md` — Documentation of fixes
