import { Response } from 'express';
import { analyzeMachine } from '../analysis/analysis.service.js';
import { AuthRequest } from '../../middleware/auth.js';
import { HttpError } from '../../utils/httpError.js';
import { prisma } from '../../utils/prisma.js';
import { machineSchema } from './machine.schema.js';

export const createMachine = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, 'Unauthorized');

  const parsed = machineSchema.parse(req.body);
  const analysis = analyzeMachine(parsed);

  const machine = await prisma.machine.create({
    data: {
      userId,
      ...parsed,
      ...analysis,
      insightsJson: JSON.stringify(analysis.insights),
      alertsJson: JSON.stringify(analysis.alerts),
      contributionsJson: JSON.stringify(analysis.contributions)
    }
  });

  return res.status(201).json({
    ...machine,
    insights: analysis.insights,
    alerts: analysis.alerts,
    contributions: analysis.contributions
  });
};

export const getMachines = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, 'Unauthorized');

  const machines = await prisma.machine.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  return res.json(machines.map((m) => ({
    ...m,
    insights: JSON.parse(m.insightsJson),
    alerts: JSON.parse(m.alertsJson),
    contributions: JSON.parse(m.contributionsJson)
  })));
};

export const getMachineById = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, 'Unauthorized');

  const machine = await prisma.machine.findFirst({ where: { id: req.params.id, userId } });
  if (!machine) throw new HttpError(404, 'Machine not found');

  return res.json({
    ...machine,
    insights: JSON.parse(machine.insightsJson),
    alerts: JSON.parse(machine.alertsJson),
    contributions: JSON.parse(machine.contributionsJson)
  });
};

export const deleteMachine = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, 'Unauthorized');

  const existing = await prisma.machine.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) throw new HttpError(404, 'Machine not found');

  await prisma.machine.delete({ where: { id: req.params.id } });
  return res.status(204).send();
};

export const analyzeOnly = async (req: AuthRequest, res: Response) => {
  const parsed = machineSchema.parse(req.body);
  return res.json(analyzeMachine(parsed));
};
