const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');

router.get('/clients', (req, res) => ticketController.getErpClients(req, res));
router.post('/gatekeeping', (req, res) => ticketController.toggleGatekeeping(req, res));
router.post('/check', (req, res) => ticketController.checkPhone(req, res));

module.exports = router;
