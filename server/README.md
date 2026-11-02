# Server setup

The server reads configuration from `server/.env` when started from this
directory. Start from the example file and provide values for MongoDB, Gmail
SMTP, and the tester token secret:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Set `JWT_SECRET` to a private random value with at least 32 characters. For
example, generate one locally with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Keep the generated value private and configure it in the server's environment
for every deployment. Do not commit `.env` or paste secrets into source files.
`EMAIL_USER` and `EMAIL_PASS` must be a Gmail sender and its app password.

Tester sign-in uses `POST /api/testers/send-otp` and
`POST /api/testers/verify-otp`. Codes are emailed, expire after 10 minutes,
allow five attempts, and can be used once. Sending a replacement invalidates
the previous code; resend requests are throttled for 30 seconds.
