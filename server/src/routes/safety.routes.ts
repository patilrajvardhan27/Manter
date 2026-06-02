import { Router } from 'express';
import {
  reportUser, blockUser, unblockUser,
  createCheckin, confirmCheckin, cancelCheckin, getActiveCheckin,
  getContacts, createContact, updateContact, deleteContact,
} from '../controllers/safety.controller';

const router = Router();

// Report & block
router.post('/report', reportUser);
router.post('/block/:userId', blockUser);
router.delete('/block/:userId', unblockUser);

// Date check-in
router.get('/checkin/active', getActiveCheckin);
router.post('/checkin', createCheckin);
router.post('/checkin/:id/confirm', confirmCheckin);
router.delete('/checkin/:id', cancelCheckin);

// Emergency contacts
router.get('/contacts', getContacts);
router.post('/contacts', createContact);
router.put('/contacts/:id', updateContact);
router.delete('/contacts/:id', deleteContact);

export default router;
