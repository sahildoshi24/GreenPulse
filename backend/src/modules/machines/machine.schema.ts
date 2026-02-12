import { z } from 'zod';

export const machineSchema = z.object({
  machineName: z.string().min(2).max(100),
  machineType: z.enum(['motor', 'compressor', 'pump', 'turbine', 'generator']),
  ratedPowerKw: z.number().min(0.5).max(100000),
  temperatureC: z.number().min(-30).max(250),
  vibrationMmS: z.number().min(0).max(100),
  rpm: z.number().int().min(100).max(50000),
  voltage: z.number().min(10).max(50000),
  current: z.number().min(0.1).max(5000),
  ageYears: z.number().int().min(0).max(100),
  dailyOperatingHours: z.number().min(0.5).max(24),
  maintenanceCondition: z.enum(['excellent', 'good', 'fair', 'poor'])
});
