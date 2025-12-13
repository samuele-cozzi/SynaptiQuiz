# Environment Variables

## Required Variables

### NEXT_PUBLIC_GEMINI_API_KEY

**Purpose:** API key for Google Gemini AI to generate quiz questions.

**How to get it:**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the key

**Security Note:** 
- The `NEXT_PUBLIC_` prefix makes this variable accessible in the browser
- This is required for static export deployment
- **Your API key will be visible to users in the browser**

**Recommended Security Measures:**
1. **Restrict your API key** in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Set HTTP referrer restrictions to your domain (e.g., `your-app.web.app/*`)
   - Restrict to Generative Language API only
2. **Set usage quotas** to prevent abuse
3. **Monitor usage** regularly in Google Cloud Console

**Add to .env.local:**
```env
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

> **Note:** The `.env.local` file is gitignored and won't be committed to version control.
