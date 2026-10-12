const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');

// Real-time stream
router.get('/stream', (req, res) => ticketController.streamTickets(req, res));

// Ticket stats
router.get('/stats', (req, res) => ticketController.getStats(req, res));

// Ticket CRUD
router.get('/', (req, res) => ticketController.getTickets(req, res));
router.get('/:id', (req, res) => ticketController.getTicket(req, res));
router.patch('/:id/status', (req, res) => ticketController.updateStatus(req, res));
router.patch('/:id/notes', (req, res) => ticketController.updateNotes(req, res));
router.post('/:id/verify-erp', (req, res) => ticketController.verifyErp(req, res));
router.post('/:id/reject', (req, res) => ticketController.rejectClient(req, res));
router.post('/:id/reply', (req, res) => ticketController.replyTicket(req, res));
router.delete('/:id', (req, res) => ticketController.deleteTicket(req, res));

module.exports = router;
