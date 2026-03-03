# Feedback System Backend - Setup Instructions

## 🚀 Quick Start

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Configure Environment Variables

1. You already have a `.env` file created
2. Update it with your **Supabase credentials**:
   - Go to your Supabase project dashboard
   - Navigate to Project Settings → API
   - Copy your:
     * `Project URL` → Set as `SUPABASE_URL`
     * `anon public` key → Set as `SUPABASE_ANON_KEY`
     * `service_role` key → Set as `SUPABASE_SERVICE_ROLE_KEY`

3. Generate a strong JWT secret (minimum 32 characters):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Use the output for `JWT_SECRET`

4. If you have your Hugging Face API deployed:
   - Set `AI_ANALYSIS_API_URL` to your HF Space URL
   - Format: `https://your-space-name.hf.space/analyze-comments`

### Step 3: Verify Database Schema

Make sure you've already run the database schema SQL file in your Supabase SQL editor.

### Step 4: Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

### Step 5: Test the API

Open your browser or use curl:
```bash
curl http://localhost:5000/health
```

You should see:
```json
{
  "status": "healthy",
  "service": "feedback-system-api",
  "timestamp": "2026-03-01T...",
  "uptime": 0.123
}
```

## 📁 What's Been Created

```
backend/
├── src/
│   ├── app.js                    # Express app configuration
│   ├── config/
│   │   ├── database.js           # Supabase client setup
│   │   ├── env.js                # Environment validation
│   │   └── constants.js          # Application constants
│   ├── middleware/
│   │   └── errorHandler.js       # Error handling
│   ├── routes/
│   │   └── index.js              # API routes
│   └── utils/
│       └── logger.js             # Winston logger
├── logs/                         # Auto-created for logs
├── .env                          # Your environment variables
├── .env.example                  # Example template
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies
└── server.js                     # Entry point

```

## ⚙️ Key Configuration Files

### database.js
- Sets up Supabase client
- Provides helper functions for queries
- Includes connection testing

### env.js
- Validates required environment variables
- Provides centralized configuration access

### app.js
- Configures Express server
- Sets up middleware (CORS, security, logging)
- Mounts API routes

## 🔧 Next Steps

We'll now create:
1. ✅ **Authentication system** (login, JWT, password hashing)
2. **Form management APIs** (create, edit, list forms)
3. **Response handling** (submit, view responses)
4. **Analysis endpoints** (scoring, filtering, AI integration)

## 🔐 Security Features Included

- ✅ Helmet (security headers)
- ✅ CORS protection
- ✅ Rate limiting
- ✅ Input validation
- ✅ Error handling
- ✅ Request logging
- ✅ JWT authentication (to be implemented)

## 📝 Important Notes

- The `.env` file is gitignored (won't be committed)
- Keep your `SUPABASE_SERVICE_ROLE_KEY` secret
- Change default admin password after first login
- Use strong JWT secrets in production

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Change PORT in .env file
PORT=5001
```

**Supabase connection error:**
- Check your SUPABASE_URL and keys
- Verify your Supabase project is active
- Check network/firewall settings

**Module not found:**
```bash
npm install
```

Ready to proceed with authentication? Let me know!
