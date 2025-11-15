---
title: "Simple AuthX - Secure & Lightweight Auth for Node.js"
url: https://simple-authx-lp.vercel.app
scraped: 2025-11-15T19:57:14.598Z
tags: [simple-authx-lp]
description: "Simple AuthX provides JWT authentication, password hashing, and refresh token support for secure Node.js applications."
author: "Antony Mwangi"
---

# Simple AuthX - Secure & Lightweight Auth for Node.js

> 🔗 Source: [https://simple-authx-lp.vercel.app](https://simple-authx-lp.vercel.app)

> �� Scraped: November 15, 2025

---

✨ v2.0.0 · Production Ready

## Secure & Lightweight  
Auth for Node.js

Simple AuthX provides JWT authentication, password hashing, and refresh token support with zero hassle. Plug it into your Express app and secure your routes in minutes.

[Get Started](/docs) [View on GitHub](https://github.com/Antonymwangi20/simple-authx)

### Get Started in 3 Simple Steps

1\. Install

`npm install simple-authx`

2\. Initialize

`const auth = await createAuth();`

3\. Protect

`app.get('/api', auth.protect, ...)`

#### Complete Example

```
import express from 'express';
import { createAuth } from 'simple-authx';

const app = express();
const auth = await createAuth();

// Mount authentication routes
app.use('/auth', auth.router);

// Protect your routes
app.get('/protected', auth.protect, (req, res) => {
  res.json({ user: req.user, message: 'Access granted!' });
});

app.listen(3000);
```

## Why Choose Simple AuthX?

### JWT Authentication

Access & refresh tokens with automatic rotation and reuse detection

### Password Security

Built-in bcrypt/argon2 hashing with strength validation

### Cookie-based Auth

Secure httpOnly cookies with CSRF protection

### Multiple Storage

Memory, File, PostgreSQL, MongoDB, Redis adapters

### MFA/2FA Ready

TOTP, QR codes, and backup codes out of the box

### Express Integration

Auto-generated routes: /register, /login, /refresh, /logout

### Token Rotation

Automatic refresh token rotation for enhanced security

### Session Management

Multi-session support with device tracking

### TypeScript Support

Full type definitions included

## Get Started in Seconds

Install via npm

`npm install simple-authx`

[Read Full Documentation](/docs)

## Documentation

### Basic Usage

```
import { createAuth } from 'simple-authx';

// Zero-config setup
const auth = await createAuth();

// Mount routes
app.use('/auth', auth.router);

// Protect routes
app.get('/profile', auth.protect, (req, res) => {
  res.json({ user: req.user });
});
```

### Production Setup

```
const auth = await createAuth({
  storage: 'postgres',
  postgres: {
    connectionString: process.env.DATABASE_URL
  },
  cookies: {
    refresh: true,
    secure: true,
    httpOnly: true
  },
  csrf: { enabled: true },
  plugins: {
    mfa: { issuer: 'MyApp' },
    password: { minStrength: 3 }
  }
});
```

### With MFA/2FA

```
// Enable MFA for user
const { secret, qrCode, backupCodes } = 
  await auth.mfa.generateSecret();

// Verify MFA token
const isValid = auth.mfa.verifyToken(
  secret, 
  userToken
);
```

### Custom Storage

```
import { PostgresAdapter } from 'simple-authx';

const adapter = new PostgresAdapter({
  connectionString: process.env.DATABASE_URL
});

const auth = await createAuth({
  adapter
});
```

## Complete Feature Set

JWT Access & Refresh Tokens

Token Rotation & Reuse Detection

Password Hashing (bcrypt/argon2)

Cookie-based Authentication

CSRF Protection

Rate Limiting

MFA/2FA Support

Social OAuth (Google, GitHub, Facebook)

Session Management

Password Strength Validation

Audit Logging

Multiple Storage Adapters

TypeScript Definitions

Express Middleware

Zero Configuration

Production Ready

## Ready to Secure Your App?

Join developers who trust Simple AuthX for production authentication

[Get Started Now](#install) [Star on GitHub](https://github.com/Antonymwangi20/simple-authx)


---

## Metadata

- **Author:** Antony Mwangi
- **Description:** Simple AuthX provides JWT authentication, password hashing, and refresh token support for secure Node.js applications.
