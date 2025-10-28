# GitHub OAuth Setup Guide

This guide explains how to set up GitHub OAuth for local development and production deployment of NewsBlurb.

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Production Setup](#production-setup)
3. [Troubleshooting](#troubleshooting)

## Local Development Setup

### Step 1: Create a GitHub OAuth Application

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click on **New OAuth App** button
3. Fill in the following information:

   - **Application name**: `NewsBlurb Dev` (or your preferred name)
   - **Homepage URL**: `http://localhost:3001`
   - **Authorization callback URL**: `http://localhost:3001/api/auth/callback/github`

4. Click **Register application**

### Step 2: Get Your Credentials

After registering:

1. You'll see your **Client ID** on the application page
2. Click **Generate a new client secret** to create a new secret
3. Copy both values (keep the secret safe - don't commit it!)

### Step 3: Update Environment Variables

Edit `.env.local` in the project root:

```
GITHUB_ID=your-client-id-here
GITHUB_SECRET=your-client-secret-here
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
```

To generate `NEXTAUTH_SECRET` on Windows (PowerShell):

```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Or on macOS/Linux:

```bash
openssl rand -base64 32
```

### Step 4: Test Locally

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3001`

3. Click the **Sign In** button

4. You should be redirected to GitHub to authorize the application

5. After authorization, you'll be redirected back with your session

## Production Setup

### Step 1: Create Production OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App with:
   - **Application name**: `NewsBlurb` (or your app name)
   - **Homepage URL**: `https://yourdomain.com`
   - **Authorization callback URL**: `https://yourdomain.com/api/auth/callback/github`

3. Copy the Client ID and generate a new Client Secret

### Step 2: Deploy to Vercel

If using Vercel (recommended):

1. Push your code to GitHub
2. Connect your repo to [Vercel](https://vercel.com)
3. In Vercel dashboard, go to **Settings > Environment Variables**
4. Add the following variables:

   ```
   GITHUB_ID=your-production-client-id
   GITHUB_SECRET=your-production-client-secret
   NEXTAUTH_URL=https://yourdomain.com
   NEXTAUTH_SECRET=your-secret-generated-with-openssl
   ```

5. Deploy

### Step 3: Update GitHub OAuth App

After deploying to production, update your GitHub OAuth app:

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Edit your production OAuth app
3. Update **Authorization callback URL** to: `https://yourdomain.com/api/auth/callback/github`

## Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_ID` | Yes | GitHub OAuth App Client ID |
| `GITHUB_SECRET` | Yes | GitHub OAuth App Client Secret |
| `NEXTAUTH_URL` | Yes | Your application URL (localhost or production domain) |
| `NEXTAUTH_SECRET` | Yes | Secret key for encrypting sessions (generate with openssl) |

## Troubleshooting

### "Invalid client_id" Error

- Check that your `GITHUB_ID` matches the GitHub app's Client ID
- Ensure you're using the correct OAuth app for your environment (dev vs prod)

### "Redirect URI mismatch" Error

- Make sure the URL in the error message matches exactly with your GitHub app's **Authorization callback URL**
- Account for differences like `http` vs `https`, trailing slashes, port numbers

### Session Not Persisting

- Check that `NEXTAUTH_SECRET` is set (not the placeholder)
- Ensure cookies are enabled in your browser
- Check browser console for any errors

### Cannot Sign Out

- Make sure `NEXTAUTH_URL` is set correctly
- Check that your signout callback URL is configured properly

### Local Development Works, Production Doesn't

- Verify all environment variables are set in production (Vercel dashboard)
- Check that GitHub OAuth app's Authorization callback URL matches your production domain
- Ensure HTTPS is used in production `NEXTAUTH_URL`

## Resources

- [NextAuth.js GitHub Provider](https://next-auth.js.org/providers/github)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [NextAuth.js Deployment Guide](https://next-auth.js.org/deployment)
