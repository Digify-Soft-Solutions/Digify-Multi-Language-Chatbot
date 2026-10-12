const express = require('express');
const cors = require('cors');
const path = require('path');
const webhookRoutes = require('./routes/webhook.routes');
const ticketRoutes = require('./routes/ticket.routes');
const erpRoutes = require('./routes/erp.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/webhook', webhookRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/erp', erpRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Digify Soft Solutions Customer Care & Multi-Language Bot',
    port: process.env.PORT || 5000,
    timestamp: new Date().toISOString()
  });
});

// Redirect root to Next.js Frontend on port 3000
app.get('/', (req, res) => {
  res.redirect('http://localhost:3000');
});

app.get('/admin', (req, res) => {
  res.redirect('http://localhost:3000');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
