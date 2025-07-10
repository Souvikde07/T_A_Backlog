# Backlog Issue Management App – Developer's Notes

## Introduction

Hi there! I'm submitting this project as a demonstration of my approach to building maintainable, secure, and scalable web services. My background is primarily backend engineering (5+ years), so you'll notice a strong emphasis on API design, security, and operational readiness. I’ve tried to balance production best practices with the realities of a coding exercise—where it makes sense, I’ve cut corners, and I’ll be upfront about those decisions.

---

## Project Overview

This is a full-stack app that connects to the Backlog API, lets users search and favorite issues, and demonstrates OAuth 2.0 integration. The backend is built with Express.js, and the frontend is React (with Vite and Tailwind for speed and style). My focus was on building a robust, testable backend, but I also ensured the frontend is clean and user-friendly.

---

## Why I Built It This Way

### Backend (Express.js)
- **Session Security**: Sessions are stored server-side, with httpOnly cookies and secure flags for production. I’ve seen too many apps leak tokens via localStorage—this is safer.
- **OAuth 2.0**: The flow is robust, with automatic token refresh and session invalidation on expiry. I’ve handled edge cases like refresh token expiry, which is often missed.
- **Rate Limiting**: Different limits for auth, search, and general API endpoints. This is based on real-world experience with abuse and bot traffic.
- **Testing**: Jest + Supertest, with session mocking and rate limiting disabled in test mode. I believe in testing the real thing, not just mocks.
- **Error Handling**: Consistent error responses, clear status codes, and user-friendly messages. I’ve learned that good error handling saves hours in production.

### Frontend (React)
- **Simple, Modern Stack**: Vite for fast reloads, Tailwind for utility-first styling, and React hooks for state.
- **Favorites**: Persisted in localStorage for demo purposes. In a real app, I’d store this server-side.
- **Testing**: Vitest + React Testing Library. I made sure tests reflect real user interactions (checkboxes, async data).

---

## What I’d Do Differently for Production

I’m a big believer in building for the long haul, but for this exercise, I focused on the essentials. Here’s what I’d add or change for a real deployment:

- **Environment Management**: Right now, secrets/configs are in .env files. In production, I’d use a secrets manager and strict config validation.
- **Persistent Storage**: No DB here—favorites are local. For real users, I’d use PostgreSQL or MongoDB, and add audit logs.
- **Logging & Monitoring**: I’d add Winston for structured logs, and hook into Prometheus/Grafana for metrics. Sentry for error tracking.
- **Deployment**: No Docker/K8s manifests here, but I’d containerize everything and set up CI/CD (GitHub Actions is my go-to).
- **Security Hardening**: Helmet.js, CSRF protection, input validation, and regular dependency audits.
- **User Management**: No RBAC or user profiles—just OAuth. For a real service, I’d add user roles and preferences.

---

## Where I Cut Corners (and Why)

- **No DB**: For demo speed, all persistence is in memory or localStorage.
- **Minimal Frontend State**: No Redux or context—just local state and props.
- **Basic Error UI**: Error messages are simple, not styled for production.
- **No Real Logging**: Console logs only. In prod, I’d use structured logging.
- **No E2E Tests**: Only unit/integration tests. For a real launch, I’d add Cypress.

---

## Backend Design Highlights

- **API-First**: All business logic is in the API, not the frontend. This makes it easier to scale and maintain.
- **Session Handling**: Sessions are short-lived, and refresh tokens are rotated. I’ve seen too many apps get this wrong.
- **Rate Limiting**: Tuned for different endpoints, with clear error messages. This is based on real-world abuse patterns.
- **Testing**: Tests cover happy paths and edge cases (e.g., token expiry, rate limits). I use supertest-session to simulate real user flows.

---

## Setup & Usage

### Prerequisites
- Node.js 18+
- npm or yarn
- Backlog API credentials (see .env.example)

### Backend
```bash
cd backend
npm install
cp .env.example .env # Fill in your Backlog credentials
npm test # Run backend tests
npm start # Start the server
```

### Frontend
```bash
cd frontend
npm install
npm test # Run frontend tests
npm run dev # Start the dev server
```

---

## Environment Variables (Backend)
```env
BACKLOG_CLIENT_ID=your_client_id
BACKLOG_CLIENT_SECRET=your_client_secret
BACKLOG_SPACE_URL=https://your-space.backlog.com
BACKLOG_REDIRECT_URI=http://localhost:3001/auth/callback
SESSION_SECRET=your_session_secret
NODE_ENV=development
```

---

## Testing Philosophy

- **Backend**: I use Jest and Supertest to hit real endpoints, not just mocks. Tests cover auth, rate limiting, and error cases. I mock axios for Backlog API calls.
- **Frontend**: Vitest and React Testing Library. Tests check for real UI elements and async flows. I mock fetch to isolate frontend logic.
- **CI/CD Ready**: Test scripts are ready for pipeline integration.

---

## API Endpoints

### Auth
- `GET /auth/login` – Start OAuth 2.0 flow
- `GET /auth/callback` – Handle OAuth callback
- `POST /auth/logout` – Log out and destroy session

### Issues
- `GET /api/issues` – Fetch issues (with search)

---

## What I’m Proud Of

- **Security**: Sessions, token refresh, rate limiting—all the basics are covered.
- **Testing**: Realistic, maintainable tests that catch regressions.
- **Clarity**: Code is commented, error messages are clear, and the API is predictable.
- **Honesty**: I’m upfront about what’s missing and what I’d do for a real launch.

---

## What’s Next (If This Were a Real Project)

- **Dockerize everything** and set up a CI/CD pipeline
- **Add persistent storage** for favorites and user data
- **Implement RBAC** and user profiles
- **Add structured logging and monitoring**
- **Harden security** (CSRF, helmet, input validation)
- **Improve frontend UX** (loading states, error handling, accessibility)
- **Add E2E tests** with Cypress

---

## Final Thoughts

I approached this project as I would a real-world service: start with a secure, testable backend, keep the frontend simple but functional, and document everything. I hope this gives you a clear sense of how I build, what I value, and how I’d approach long-term service development at Nulab.

If you have any questions about design decisions, tradeoffs, or next steps, I’m happy to discuss! 