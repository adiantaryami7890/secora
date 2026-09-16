# Secora V0.2 — Supabase Auth + Learning Dashboard

This package preserves the V0.1 login visual design and connects it to Supabase Auth.

Features:
- Email/password login
- Signup + email verification
- Google OAuth
- Forgot/reset password
- Protected authenticated home
- Logout
- User name/avatar
- Beginner / Intermediate / Advanced sections
- 30 cybersecurity domains
- Responsive dashboard

Run locally:
1. Open this folder in VS Code.
2. Use Live Server on port 5500, OR run `python -m http.server 5500`.
3. Open http://localhost:5500
4. Test signup, email verification, email login, Google login, logout, and password reset.

Supabase:
Project URL: https://iadfckatnldoruoksxtv.supabase.co
Site URL: http://localhost:5500
Redirect URLs:
- http://localhost:5500/**
- http://127.0.0.1:5500/**

Google OAuth:
- JavaScript origins: http://localhost:5500 and http://127.0.0.1:5500
- Redirect URI: https://iadfckatnldoruoksxtv.supabase.co/auth/v1/callback

Never put a Supabase secret/service-role key in frontend code.
