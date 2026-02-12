import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { HttpError } from '../../utils/httpError.js';
import { prisma } from '../../utils/prisma.js';
import { loginSchema, signupSchema } from './auth.schema.js';

const createToken = (userId: string) => jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });

export const signup = async (req: Request, res: Response) => {
  const parsed = signupSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (existing) throw new HttpError(409, 'Email already in use');

  const passwordHash = await bcrypt.hash(parsed.password, 10);
  const user = await prisma.user.create({
    data: { email: parsed.email, name: parsed.name, passwordHash }
  });

  return res.status(201).json({
    token: createToken(user.id),
    user: { id: user.id, name: user.name, email: user.email }
  });
};

export const login = async (req: Request, res: Response) => {
  const parsed = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (!user) throw new HttpError(401, 'Invalid credentials');

  const validPassword = await bcrypt.compare(parsed.password, user.passwordHash);
  if (!validPassword) throw new HttpError(401, 'Invalid credentials');

  return res.json({
    token: createToken(user.id),
    user: { id: user.id, name: user.name, email: user.email }
  });
};

export const logout = async (_req: Request, res: Response) => res.json({ message: 'Logged out successfully' });
