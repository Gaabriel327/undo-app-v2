require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { router: authRouter } = require('./routes/auth');
const reflectionsRouter = require('./routes/reflections');
const groupsRouter = require('./routes/groups');
const tokensRouter = require('./routes/tokens');

const app = express();
const PORT = process.env.PORT || 5001;

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((s) => s.trim());

app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use('/api/auth', authRouter);
app.use('/api/reflections', reflectionsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/tokens', tokensRouter);

app.get('/healthz', (_req, res) => res.json({ status: 'ok', version: '2.0.0' }));

app.use((_req, res) => res.status(404).json({ error: 'Route nicht gefunden' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

app.listen(PORT, () => {
  console.log(`Undo App v2 Backend läuft auf Port ${PORT}`);
});
