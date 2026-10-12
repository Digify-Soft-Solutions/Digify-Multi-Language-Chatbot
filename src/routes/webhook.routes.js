const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// Webhook endpoints for WACloud / Meta
router.get('/whatsapp', (req, res) => webhookController.verifyWebhook(req, res));
router.post('/whatsapp', (req, res) => webhookController.handleIncomingWebhook(req, res));

// Live simulation endpoint for testing tickets
router.post('/simulate', (req, res) => webhookController.simulateWebhook(req, res));

// Direct simulator test endpoint
router.post('/test/chat', (req, res) => webhookController.testChat(req, res));

module.exports = router;
