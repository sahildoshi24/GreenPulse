export type User = { id: string; name: string; email: string };

export type MachineInput = {
  machineName: string;
  machineType: 'motor' | 'compressor' | 'pump' | 'turbine' | 'generator';
  ratedPowerKw: number;
  temperatureC: number;
  vibrationMmS: number;
  rpm: number;
  voltage: number;
  current: number;
  ageYears: number;
  dailyOperatingHours: number;
  maintenanceCondition: 'excellent' | 'good' | 'fair' | 'poor';
};

export type Contribution = { parameter: string; contributionPct: number };

export type Analysis = {
  efficiencyLossPct: number;
  energyWasteKwh: number;
  carbonEmissionKgCo2e: number;
  failureRiskPct: number;
  greenHealthScore: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  insights: string[];
  alerts: string[];
  contributions: Contribution[];
};

export type Machine = MachineInput & Analysis & { id: string; createdAt: string };
