require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const session = require('express-session');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 search requests per minute
  message: {
    error: 'Too many search requests, please try again after 1 minute.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors({
  origin: 'http://localhost:3000', // Frontend URL
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  },
}));

// Apply rate limiting to different route groups only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.use('/auth', authLimiter); // OAuth endpoints
  app.use('/api/issues', searchLimiter); // Search endpoint
  app.use('/api', apiLimiter); // All other API endpoints
}

app.get('/', (req, res) => {
  res.send('Backend server is running.');
});

// OAuth 2.0 Login Endpoint
app.get('/auth/login', (req, res) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.BACKLOG_CLIENT_ID,
    redirect_uri: process.env.BACKLOG_REDIRECT_URI,
    state: 'secureRandomState', // In production, generate and validate this
    scope: 'read',
  });
  const authUrl = `${process.env.BACKLOG_SPACE_URL}/OAuth2AccessRequest.action?${params.toString()}`;
  res.redirect(authUrl);
});

// OAuth 2.0 Callback Endpoint
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');

  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.BACKLOG_CLIENT_ID,
      client_secret: process.env.BACKLOG_CLIENT_SECRET,
      redirect_uri: process.env.BACKLOG_REDIRECT_URI,
    });
    const tokenUrl = `${process.env.BACKLOG_SPACE_URL}/api/v2/oauth2/token`;
    const response = await axios.post(tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const { access_token, refresh_token } = response.data;
    // Store tokens in session (server-side)
    req.session.backlog_token = access_token;
    req.session.backlog_refresh_token = refresh_token;
    // Redirect to frontend dashboard
    res.redirect('http://localhost:3000');
  } catch (err) {
    res.status(500).send('OAuth callback error: ' + err.message);
  }
});

// Logout endpoint
app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Helper to refresh access token
async function refreshAccessToken(req) {
  const refresh_token = req.session.backlog_refresh_token;
  if (!refresh_token) throw new Error('No refresh token available');
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.BACKLOG_CLIENT_ID,
    client_secret: process.env.BACKLOG_CLIENT_SECRET,
    refresh_token,
  });
  const tokenUrl = `${process.env.BACKLOG_SPACE_URL}/api/v2/oauth2/token`;
  const response = await axios.post(tokenUrl, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  req.session.backlog_token = response.data.access_token;
  if (response.data.refresh_token) {
    req.session.backlog_refresh_token = response.data.refresh_token;
  }
  return response.data.access_token;
}

// Helper to call Backlog API with auto-refresh
async function callBacklogApi(req, url, options = {}) {
  let token = req.session.backlog_token;
  try {
    const response = await axios.get(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (err) {
    // If token expired, try to refresh and retry once
    if (err.response && err.response.status === 401 && req.session.backlog_refresh_token) {
      try {
        token = await refreshAccessToken(req);
        const response = await axios.get(url, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
          },
        });
        return response.data;
      } catch (refreshErr) {
        // If refresh token is invalid/expired, destroy session and return 401
        if (refreshErr.response && (refreshErr.response.status === 400 || refreshErr.response.status === 401)) {
          req.session.destroy(() => {});
          const error = new Error('Session expired, please re-authenticate.');
          error.status = 401;
          throw error;
        }
        throw refreshErr;
      }
    }
    throw err;
  }
}

// Fetch issues from Backlog API (with refresh support)
app.get('/api/issues', async (req, res) => {
  const token = req.session.backlog_token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  // Build params from all query parameters
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (value !== undefined && value !== null) params.append(key, value);
  }

  const url = `${process.env.BACKLOG_SPACE_URL}/api/v2/issues?${params.toString()}`;
  try {
    const data = await callBacklogApi(req, url);
    res.json(data);
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ error: 'Session expired, please re-authenticate.' });
    }
    res.status(500).json({ error: 'Failed to fetch issues', details: err.message });
  }
});

if (process.env.NODE_ENV === 'test') {
  app.post('/test/session', (req, res) => {
    Object.assign(req.session, req.body);
    res.json({ ok: true });
  });
}

// Only start the server if this file is run directly, not when imported for tests
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app; 