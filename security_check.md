# Tagzzs Authentication Security Audit

## Executive Summary

**Status:** 🔴 **Critical Vulnerabilities Detected**

The current authentication architecture confirms your suspicion of a "Split-Brain" setup. The system utilizes a **Backend-For-Frontend (BFF)** pattern in *intent* but fails in *execution* by returning sensitive raw tokens to the client-side JavaScript instead of managing them via secure, HTTP-Only cookies. This exposes the application to **XSS (Cross-Site Scripting)** attacks where malicious scripts could steal the access token.

## Task 1: Current Authentication Flow Map

Here is the step-by-step analysis of the "Sign Up" flow based on `src/app/auth/sign-up/page.tsx` and `backend/app/api/auth/auth_routes.py`:

1.  **Initiation**: The user clicks "Create Account" on the Next.js frontend (`SignUpPage`).
2.  **Request**: The frontend sends a `POST` request to the backend:  
    `POST ${NEXT_PUBLIC_BACKEND_URL}/auth/sign-up` with JSON payload `{ email, password, ... }`.
3.  **Backend Processing**:
    -   FastAPI receives the request.
    -   Calls `supabase.auth.sign_up()` using the server-side Supabase client.
    -   Supabase creates the user and returns a session.
4.  **❌ Critical Flaw**: The backend extracts the `access_token` and `refresh_token` and **returns them in the JSON response body**:
    ```json
    {
      "success": True,
      "data": {
        "session": {
          "accessToken": "ey...",
          "refreshToken": "..."
        }
      }
    }
    ```
5.  **Frontend Handling**:
    -   Frontend receives the tokens in plaintext JSON.
    -   Frontend manually initializes the Supabase client and sets the session:
        ```typescript
        await supabase.auth.setSession({
          access_token: data.data.session.accessToken,
          refresh_token: data.data.session.refreshToken,
        });
        ```
    -   This effectively stores the tokens in a place accessible to JavaScript (memory/localStorage/non-HttpOnly cookies depending on the adapter).

## Task 2: Vulnerability Analysis

### 1. Token Exposure (CRITICAL)
-   **Finding**: **Yes, the raw access_token is exposed.**
-   **Details**: By returning the `accessToken` in the API response body (`backend/app/api/auth/auth_routes.py`: lines 97-101), any XSS vulnerability in your frontend allows an attacker to intercept this response or read the storage where `supabase-js` puts it, leading to account takeover.

### 2. CORS Misconfiguration
-   **Finding**: **Partially Configured.**
-   **Details**: Your `CORSMiddleware` in `backend/app/main.py` is set to `allow_credentials=True` and specifies origins. This is correct for a cookie-based flow. However, since you are currently passing tokens manually via headers, this configuration acts as a "false sense of security"—the security relies on the tokens not being stolen, rather than browser cookie protections.

### 3. Session Desync
-   **Finding**: **High Risk.**
-   **Details**: The architecture is "Split-Brain":
    -   **Frontend**: Thinks it's logged in because `supabase-js` has a session in its local state.
    -   **Backend**: Is stateless and verifies the token sent in the `Authorization: Bearer` header (verified in `backend/app/services/token_verifier.py`).
    -   **Risk**: If the backend cookie expires (in a future cookie-based flow) but the frontend logic doesn't update, the user will see "Logged In" UI but all API calls will fail. Currently, since you manually push tokens to the frontend, they stay in sync only as long as the frontend manually refreshes and updates the headers.

### 4. Implicit vs. PKCE
-   **Finding**: **Using ROPC-like Pattern (Insecure).**
-   **Details**: You are not using Implicit Flow (redirect) nor PKCE (secure code exchange). You are using a pattern similar to **Resource Owner Password Credentials (ROPC)** where the backend proxies the password exchange. While better than exposing Supabase keys directly, returning the token negates the security benefits of the proxy.

## Task 3: Refactoring Plan (Move to Pure Server-Side Cookies)

To fix this, we must ensure the `access_token` never reaches frontend JavaScript.

1.  **Backend (`auth_routes.py`)**:
    -   **Stop** returning `session` object in the JSON body.
    -   **Start** setting cookies on the `response` object:
        ```python
        response.set_cookie(
            key="access_token",
            value=res.session.access_token,
            httponly=True,  # CRITICAL: JS cannot read this
            secure=True,    # send only over HTTPS
            samesite="lax", # prevents CSRF
            max_age=3600
        )
        ```
2.  **Backend (`token_verifier.py`)**:
    -   Modify `get_current_user` to look for the token in **Cookies** (`request.cookies.get("access_token")`) instead of the `Authorization` header.
3.  **Frontend (`sign-up/page.tsx` & `sign-in/page.tsx`)**:
    -   Remove `supabase.auth.setSession(...)`.
    -   Just handle the "success" confirmation and redirect.
    -   Next.js Middleware might need adjustment to check cookies proxied from the backend or shared domain cookies.
4.  **Frontend (API Calls)**:
    -   Ensure all `fetch` requests to the backend include `credentials: 'include'` so the browser automatically attaches the HttpOnly cookie.

### Summary
You represent a classic case of **"Frontend Auth, Backend Verification"** conflict. Moving to a strict **HttpOnly Cookie** flow will unify the state and secure the tokens.

## Task 4: Frontend Redundancy & Logic Leak Analysis

We analyzed the Next.js `src/app/api` routes and `src/lib` services to check for "Split-Brain" architecture.

### 1. Complete Duplication (Codebase Bloat)
-   **Finding**: **CRITICAL DUPLICATION** in `src/app/api/user-database/content/add`.
-   **Details**: The frontend route `POST /api/user-database/content/add` implements **exactly** the same logic as the backend `POST /api/user-database/content/add`.
    -   It initializes `firebase-admin`.
    -   It validates schema (Zod vs Pydantic).
    -   It writes to Firestore directly (bypassing the backend).
    -   It *even* calls the backend to generate embeddings (`fetch('${tagzzsApiUrl}/embed/store')`) but then calculates the rest itself.
-   **Fix**: Delete the entire frontend route. Point the frontend UI to call the FastAPI endpoint directly (or via a thin proxy if needed for cookies).

### 2. Logic Split (Persistence Desync)
-   **Finding**: **Logic Fragmentation** in `src/app/api/chat/with-rag`.
-   **Details**:
    -   **Backend (`chat.py`)**: Handles the AI inference (RAG + LLM) but **does not save** the chat history to the database.
    -   **Frontend (`route.ts`)**: Calls the backend for inference, receives the answer, and *then* saves the conversation history to Firestore itself.
-   **Risk**: If the frontend fails after the backend returns (e.g., network glitch), you lose the chat history. The backend should handle "Inference + Persistence" atomically.

### 3. Misplaced Responsibilities (Extension API)
-   **Finding**: **Frontend acting as Backend** in `src/app/api/extension`.
-   **Details**: Usage of `src/lib/extension/firestore-service.ts` indicates the frontend is managing extension API keys and device connections directly in Firestore. The FastAPI backend has no knowledge of this.
-   **Fix**: Move `Extension` logic to a new FastAPI Router (`backend/app/api/extension.py`).

### 4. Direct Database Access ("fs" in Frontend)
-   **Finding**: **Violation of BFF Pattern.**
-   **Details**: The existence of `src/lib/firebase/admin.ts` and `src/lib/services/firebaseUserService.ts` in the frontend codebase proves the frontend is "Stateful" and "Smart".
-   **Recommendation**: Remove `firebase-admin` from `package.json`. The Next.js frontend should **never** touch the database directly. It should only speak HTTP to FastAPI.

