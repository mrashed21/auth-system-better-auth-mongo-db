# Auth Frontend Integration

This document is a concise, implementation-focused reference for frontend developers integrating with the backend auth module.

Base path: `/auth`

---

## Quick summary

- Server returns `access_token` in response bodies for most flows and sets `refresh_token` (and sometimes `access_token`) as httpOnly cookies. Frontend cannot read httpOnly cookies.
- Use `Authorization: Bearer <access_token>` header or `credentials: 'include'` to rely on cookies.
- OTPs are rate-limited: 2-minute resend cooldown and max attempts/hour. Handle 429 responses.

---

## Endpoints

### Register

- Method: POST
- Route: `/auth/register`
- Description: Create user (provide either `user_email` OR `user_phone`). Server sends verification OTP to chosen contact.
- Authentication Required: No
- Request Headers: `Content-Type: application/json`
- Request Body: required fields: `user_name`, `user_password`, `user_area`, `user_city`, `user_country`, and either `user_email` OR `user_phone`.

Example JSON Payload:

```json
{
  "user_name": "Jane Doe",
  "user_email": "jane@example.com",
  "user_password": "strongPassword123",
  "user_area": "Dhanmondi",
  "user_city": "Dhaka",
  "user_country": "Bangladesh"
}
```

Success Response (201):

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "<id>",
      "user_name": "Jane Doe",
      "user_email": "jane@example.com",
      "email_verified": false
    }
  }
}
```

Error Response (example):

```json
{ "success": false, "message": "Email already registered" }
```

Frontend Notes:

- After success, show OTP input screen for the contact provided.
- Do not attempt login until OTP verification completes.
- Display validation errors returned from backend.

---

### Verify OTP (registration/email/phone verification)

- Method: POST
- Route: `/auth/verify-otp`
- Description: Verify OTP sent during registration; marks `email_verified` / `phone_verified`, returns `access_token` and server sets `refresh_token` cookie.
- Authentication Required: No
- Request Body: `{ user_email?: string, user_phone?: string, verify_otp: string }`

Example:

```json
{ "user_email": "jane@example.com", "verify_otp": "123456" }
```

Success (200): server sets `refresh_token` cookie (httpOnly) and returns:

```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "access_token": "<jwt.access>",
    "user": {
      "_id": "...",
      "user_email": "jane@example.com",
      "email_verified": true
    }
  }
}
```

Errors: `Invalid OTP`, `OTP expired`, `User not found`.

Frontend Notes:

- Store `access_token` in memory (React context) for immediate use; rely on httpOnly cookie for refresh.
- After verify, call `GET /auth/get-me` or navigate to protected area.

---

### Resend OTP

- Method: POST
- Route: `/auth/resend-otp`
- Description: Resend OTP for registration/verification; server enforces cooldown/rate-limits.
- Authentication Required: No
- Request Body: `{ user_email?: string, user_phone?: string }`

Example:

```json
{ "user_email": "jane@example.com" }
```

Success:

```json
{ "success": true, "message": "OTP resend successfully", "data": {} }
```

Error (429 example):

```json
{
  "success": false,
  "message": "Please wait 1m 15s before requesting another OTP"
}
```

Frontend Notes:

- Disable resend button for 2 minutes client-side and show server-provided messages on 429.

---

### Login

- Method: POST
- Route: `/auth/login`
- Description: Authenticate with `user_email|user_phone + user_password`. If 2FA is enabled server returns `requires_2fa: true` and sends OTP. Otherwise returns `access_token` and sets `refresh_token` cookie.
- Authentication Required: No
- Request Body: `{ user_email?: string, user_phone?: string, user_password: string }`

Example:

```json
{ "user_email": "jane@example.com", "user_password": "strongPassword123" }
```

Success cases:

- No 2FA:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "requires_2fa": false,
    "access_token": "<jwt.access>",
    "user": {
      /* user */
    }
  }
}
```

- 2FA required:

```json
{
  "success": true,
  "message": "2FA OTP sent successfully",
  "data": { "requires_2fa": true, "method": "email" }
}
```

Error (example):

```json
{ "success": false, "message": "Invalid credentials" }
```

Frontend Notes:

- If `requires_2fa:true`, show OTP screen and call `/auth/verify-login-2fa`.
- If `requires_2fa:false`, store in-memory `access_token` and call `GET /auth/get-me`. Server sets `refresh_token` cookie for refresh flows.

---

### Verify Login 2FA

- Method: POST
- Route: `/auth/verify-login-2fa`
- Description: Verify OTP sent during login 2FA. On success sets cookies and returns `access_token` and `user`.
- Authentication Required: No
- Request Body: `{ user_email?: string, user_phone?: string, verify_otp: string }`

Example:

```json
{ "user_email": "jane@example.com", "verify_otp": "123456" }
```

Success:

```json
{
  "success": true,
  "message": "2FA verification successful",
  "data": {
    "access_token": "<jwt>",
    "user": {
      /* user */
    }
  }
}
```

Error: `Invalid OTP`, `OTP expired`.

Frontend Notes:

- Store the returned `access_token` in memory; server sets `refresh_token` cookie.
- Then call `GET /auth/get-me` to hydrate profile.

---

### Get Me

- Method: GET
- Route: `/auth/get-me`
- Description: Returns authenticated user profile.
- Authentication Required: Yes
- Request Headers:
  - If using header tokens: `Authorization: Bearer <access_token>`
  - If using cookies: send requests with credentials: `fetch(..., { credentials: 'include' })`
- Request Body: none

Success:

```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    /* user object */
  }
}
```

Error: 401 if token invalid. Frontend should try refresh then retry.

Frontend Notes:

- Use this endpoint to hydrate the user state after login/refresh.
- On 401, call `/auth/refresh-token` then retry.

---

### Enable 2FA

- Method: POST
- Route: `/auth/enable-2fa`
- Description: Starts 2FA enable flow by sending OTP to verified contact. Requires `two_factor_otp_method` = `email` or `phone`.
- Authentication Required: Yes
- Request Body: `{ "two_factor_otp_method":"email" }`

Success:

```json
{
  "success": true,
  "message": "2FA enable OTP sent successfully",
  "data": { "two_factor_otp_method": "email" }
}
```

Error: 400 if contact not verified.

Frontend Notes:

- After success, show OTP input; then call `POST /auth/toggle-2fa` with `enabled:true` and `verify_otp`.

---

### Toggle 2FA (enable/disable)

- Method: POST
- Route: `/auth/toggle-2fa`
- Description: Confirm enabling (verify OTP) or disable 2FA.
- Authentication Required: Yes
- Request Body: `{ enabled: boolean, verify_otp?: string }` — `verify_otp` required when enabling.

Example (enable):

```json
{ "enabled": true, "verify_otp": "123456" }
```

Success:

```json
{ "success": true, "message": "Two-factor authentication enabled successfully" }
```

Error: OTP required when enabling.

Frontend Notes:

- After enabling/disabling, call `GET /auth/get-me` to refresh user flags.

---

### Change Password (request)

- Method: POST
- Route: `/auth/change-password-request`
- Description: Validate old password. If 2FA enabled, server sends OTP and returns `require_2fa: true` in response data.
- Authentication Required: Yes
- Request Body: `{ "old_password": "oldPass123" }`

Success examples:

- No 2FA: `{ "data": { "require_2fa": false } }`
- 2FA required: `{ "data": { "require_2fa": true } }` (server sends OTP)

Frontend Notes:

- If `require_2fa:true`, prompt OTP then call confirm endpoint.

---

### Confirm Password Change

- Method: POST
- Route: `/auth/confirm-password-change`
- Description: Provide `new_password` (and `verify_otp` if required) to update password. Server updates `password_changed_at`.
- Authentication Required: Yes
- Request Body: `{ "new_password":"NewPass123", "verify_otp":"123456" }`

Success:

```json
{ "success": true, "message": "Password changed successfully" }
```

Frontend Notes:

- After success, tokens issued before `password_changed_at` become invalid; redirect user to login.

---

### Forgot Password

- Method: POST
- Route: `/auth/forgot-password`
- Description: Send password-reset OTP to verified contact.
- Authentication Required: No
- Request Body: `{ user_email?: string, user_phone?: string }`

Success:

```json
{ "success": true, "message": "Password reset OTP sent to your email" }
```

Frontend Notes:

- Show OTP + new password screen after success.

---

### Reset Password

- Method: POST
- Route: `/auth/reset-password`
- Description: Reset password using OTP from forgot-password flow.
- Authentication Required: No
- Request Body: `{ user_email?: string, user_phone?: string, verify_otp: string, new_password: string }`

Success:

```json
{ "success": true, "message": "Password reset successfully" }
```

Frontend Notes:

- On success, redirect to login.

---

### Change Contact Request

- Method: POST
- Route: `/auth/change-contact-request`
- Description: Start contact change; server sets `pending_email/pending_phone` and sends OTP to new contact.
- Authentication Required: Yes
- Request Body: `{ new_email?: string, new_phone?: string }`

Success:

```json
{ "success": true, "message": "OTP sent to your email" }
```

Frontend Notes:

- After success show OTP input and call `change-contact-confirm`.

---

### Change Contact Confirm

- Method: POST
- Route: `/auth/change-contact-confirm`
- Description: Confirm new contact by verifying OTP sent to the new contact.
- Authentication Required: Yes
- Request Body: `{ verify_otp: string }`

Success:

```json
{ "success": true, "message": "Email changed successfully" }
```

Frontend Notes:

- Refresh profile (`GET /auth/get-me`) after success.

---

### Logout

- Method: POST
- Route: `/auth/logout`
- Description: Clears `access_token`, `refresh_token` cookies and `better-auth.session_token` cookie.
- Authentication Required: Yes
- Request Body: none

Success:

```json
{ "success": true, "message": "User logged out successfully" }
```

Frontend Notes:

- Clear client auth state and redirect to login.

---

### Refresh Token

- Method: POST
- Route: `/auth/refresh-token`
- Description: Exchange refresh token (cookie or body) for new access + refresh tokens. Server sets cookies and returns `access_token` and `user`.
- Authentication Required: No (requires refresh token)
- Request Body optional: `{ refresh_token: "..." }` (server will use httpOnly cookie if present)

Success:

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "<jwt>",
    "user": {
      /* user */
    }
  }
}
```

Error: `Invalid refresh token` (401)

Frontend Notes:

- When a protected request yields 401, call this endpoint (with `credentials: 'include'`) then retry the original request after updating `access_token` in memory.

---

## Flows (what to call, expected response, next step)

1. Registration (email)

- POST `/auth/register` → 201. Server sends OTP.
- Show OTP screen → POST `/auth/verify-otp` with contact + OTP.
- On success: get `access_token` in body and httpOnly `refresh_token` cookie; store access token in memory, call `GET /auth/get-me`.

2. Login without 2FA

- POST `/auth/login` → success with `requires_2fa:false` and `access_token` in body; server sets `refresh_token` cookie.
- Store `access_token` in memory and call `GET /auth/get-me`.

3. Login with 2FA

- POST `/auth/login` → success with `requires_2fa:true` and `method`.
- Show OTP screen → POST `/auth/verify-login-2fa` with contact + OTP.
- On success: server sets cookies and returns `access_token` in body.

4. Password reset

- POST `/auth/forgot-password` → server sends OTP.
- POST `/auth/reset-password` with contact + OTP + new password → on success redirect to login.

5. Enable 2FA

- POST `/auth/enable-2fa` → server sends OTP to verified contact.
- POST `/auth/toggle-2fa` with `{ enabled:true, verify_otp }` to confirm.

---

## When to show OTP screen

- After `register`, `resend-otp`, `forgot-password`, `login` (if `requires_2fa:true`), `enable-2fa`, `change-password-request` (if server indicates `require_2fa:true`), and `change-contact-request`.

---

## Token storage and best practices

- Refresh token: rely on httpOnly `refresh_token` cookie set by server. Do NOT store refresh tokens in localStorage.
- Access token: store in-memory (React context/Redux). Optionally persist short-term if your threat model allows, but in-memory is safer.
- For requests:
  - If using header tokens: send `Authorization: Bearer <access_token>`.
  - If using cookies: send `credentials: 'include'` and let server read httpOnly cookies.
- For cross-site usage ensure cookies have `sameSite`/`secure` properly configured by server (already done in production config).

---

## Error handling guidance (frontend)

- 400: display field validation errors.
- 401: attempt `/auth/refresh-token` then retry; if refresh fails, redirect to login.
- 403: show account-level message (banned/deactivated) and prevent access.
- 429: show cooldown and disable resend button.
- OTP errors:
  - `Invalid OTP`: show inline error and allow retry.
  - `OTP expired`: prompt resend.
  - `Too many attempts`: show block message and disable flow until block expires.

---

## Short code snippets (examples)

Fetch with access token header:

```js
fetch("/auth/get-me", {
  headers: { Authorization: "Bearer " + accessToken },
});
```

Fetch with cookies:

```js
fetch("/auth/get-me", { credentials: "include" });
```

Automatic refresh pattern (outline):

1. Try API call with access token.
2. If 401, call `POST /auth/refresh-token` with `credentials: 'include'`.
3. If refresh succeeds, update in-memory token and retry original call.
4. If refresh fails, redirect to login.

---

## Files reviewed

- `src/app/modules/auth/auth.route.ts`
- `src/app/modules/auth/auth.controller.ts`
- `src/app/modules/auth/auth.service.ts`
- `src/app/modules/auth/auth.validation.ts`
- `src/app/modules/otp/opt.service.ts`
- `src/app/modules/auth/auth.model.ts`

---

If you want, I can also:

- Add a small React `AuthProvider` + hooks example that implements token refresh and OTP flow.
- Export this doc as Postman collection or OpenAPI (YAML).

Tell me which next step you prefer.
