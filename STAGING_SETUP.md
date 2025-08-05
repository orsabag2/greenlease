# 🧪 Staging Environment Setup

## Option 1: Local Testing (Current - Recommended)

You're already set up for local testing:

```bash
# Start development server
npm run dev

# Test at: http://localhost:3000
```

## Option 2: Vercel Preview Deployment

Create a preview deployment for testing:

### 1. Push to Feature Branch
```bash
git add .
git commit -m "Add phone authentication for testing"
git push origin feature/phone-authentication
```

### 2. Create Pull Request
- Go to GitHub: https://github.com/orsabag2/greenlease
- Create a new Pull Request from `feature/phone-authentication` to `main`
- Vercel will automatically create a preview deployment
- Test at the preview URL (e.g., `https://greenlease-git-feature-phone-authentication-orsabag2.vercel.app`)

### 3. Test Safely
- Only you and team members can access the preview URL
- Production users won't see the changes
- Test phone authentication thoroughly

## Option 3: Environment Variables for Testing

Create different Firebase configurations for testing:

### 1. Create Test Firebase Project
- Create a new Firebase project for testing
- Enable phone authentication
- Add test phone numbers

### 2. Use Environment Variables
```bash
# .env.local (for local testing)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=test-lease-project
NEXT_PUBLIC_FIREBASE_API_KEY=your-test-api-key

# .env.production (for production)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=lease-18ed6
NEXT_PUBLIC_FIREBASE_API_KEY=your-production-api-key
```

## Option 4: Feature Flag Testing

Add a feature flag to control phone authentication visibility:

```tsx
// In SignInPage.tsx
const PHONE_AUTH_ENABLED = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_PHONE_AUTH === 'true';

// Only show phone tab if enabled
{PHONE_AUTH_ENABLED && (
  <button onClick={() => setAuthMethod('phone')}>
    טלפון
  </button>
)}
```

## Recommended Testing Workflow

### 1. Local Testing (Current)
- ✅ Fastest and safest
- ✅ No external dependencies
- ✅ Use test phone numbers
- ✅ Test at `http://localhost:3000`

### 2. Preview Deployment (If needed)
- ✅ Real environment testing
- ✅ Share with team members
- ✅ Test on different devices
- ✅ No production impact

### 3. Production Testing (When ready)
- ✅ Final validation
- ✅ Real user testing
- ✅ Monitor for issues

## Current Status

You're already set up for **Option 1 (Local Testing)** which is perfect for development:

- ✅ Development server running
- ✅ Feature branch created
- ✅ Phone authentication implemented
- ✅ Test phone numbers can be added

## Next Steps

1. **Add test phone numbers** in Firebase Console
2. **Test locally** at `http://localhost:3000`
3. **Debug any issues** in the feature branch
4. **When ready**, create a pull request for preview deployment

---

**You're all set for safe testing!** 🎉 