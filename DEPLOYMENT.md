# Digital Ocean Deployment Guide

## Build Error Solutions

### `<Html>` Import Error

If you get this error during build on Digital Ocean:
```
Error: <Html> should not be imported outside of pages/_document.
```

**Solution 1: Check App Spec**
Check your App Spec in Digital Ocean App Platform:
- Build Command: `npm run build` (NOT `npm run export`)
- Run Command: `npm start`

**Solution 2: Clear Build Cache**
In Digital Ocean dashboard:
1. Settings > App-Level Build Phase
2. Click "Clear build cache" button
3. Redeploy

**Solution 3: Environment Variables**
Add these environment variables:
```
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production
```

## Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Deploy: Win Room v2.0"
   git push origin main
   ```

2. **Digital Ocean App Platform**
   - Auto-deploy will start
   - Check build logs
   - Health check: `/api/health`

3. **Set Environment Variables**
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-secret-key
   NODE_ENV=production
   ```

## Troubleshooting

### Build Succeeds But Not Running
- Check environment variables
- Test database connection
- Test health check endpoint: `/api/health`

### Hydration Errors
- These errors have been fixed
- If they persist, clear browser cache

### Database Connection Errors
- Make sure DATABASE_URL is correct
- Check that database is accessible from Digital Ocean network
