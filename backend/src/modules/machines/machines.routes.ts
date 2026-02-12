import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { analyzeOnly, createMachine, deleteMachine, getMachineById, getMachines } from './machines.controller.js';

export const machinesRouter = Router();

machinesRouter.use(authMiddleware);
machinesRouter.post('/machines', createMachine);
machinesRouter.get('/machines', getMachines);
machinesRouter.get('/machines/:id', getMachineById);
machinesRouter.delete('/machines/:id', deleteMachine);
machinesRouter.post('/analyze', analyzeOnly);
