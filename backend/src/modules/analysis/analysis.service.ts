export type MachineInput = {
  machineName: string;
  machineType: string;
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

export type AnalysisResult = {
  efficiencyLossPct: number;
  energyWasteKwh: number;
  carbonEmissionKgCo2e: number;
  failureRiskPct: number;
  greenHealthScore: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  insights: string[];
  alerts: string[];
  contributions: { parameter: string; contributionPct: number }[];
};

const baselineByType: Record<string, { temp: number; vibration: number; rpm: number }> = {
  motor: { temp: 72, vibration: 2.8, rpm: 1450 },
  compressor: { temp: 80, vibration: 3.2, rpm: 3000 },
  pump: { temp: 68, vibration: 2.4, rpm: 1750 },
  turbine: { temp: 92, vibration: 4.2, rpm: 3600 },
  generator: { temp: 78, vibration: 2.6, rpm: 1500 }
};

const maintenanceFactor: Record<MachineInput['maintenanceCondition'], number> = {
  excellent: 0.9,
  good: 1,
  fair: 1.15,
  poor: 1.32
};

const gradeScore = (loss: number, risk: number): AnalysisResult['greenHealthScore'] => {
  const blend = loss * 0.55 + risk * 0.45;
  if (blend < 8) return 'A';
  if (blend < 16) return 'B';
  if (blend < 26) return 'C';
  if (blend < 38) return 'D';
  if (blend < 52) return 'E';
  return 'F';
};

const safeDivision = (value: number, baseline: number) => Math.max(0, (value - baseline) / baseline);

export const analyzeMachine = (input: MachineInput): AnalysisResult => {
  const profile = baselineByType[input.machineType.toLowerCase()] ?? baselineByType.motor;

  const tempImpact = safeDivision(input.temperatureC, profile.temp) * 28;
  const vibrationImpact = safeDivision(input.vibrationMmS, profile.vibration) * 34;
  const rpmImpact = Math.abs(input.rpm - profile.rpm) / profile.rpm * 18;

  const measuredPowerKw = (input.voltage * input.current * 1.732 * 0.86) / 1000;
  const powerMismatchImpact = Math.abs(measuredPowerKw - input.ratedPowerKw) / input.ratedPowerKw * 20;
  const ageImpact = Math.min(input.ageYears * 1.3, 14);

  const weightedMaintenance = maintenanceFactor[input.maintenanceCondition];

  const rawLoss = (tempImpact + vibrationImpact + rpmImpact + powerMismatchImpact + ageImpact) * weightedMaintenance;
  const efficiencyLossPct = Number(Math.min(Math.max(rawLoss, 1), 74).toFixed(2));

  const baselineDailyEnergy = input.ratedPowerKw * input.dailyOperatingHours;
  const energyWasteKwh = Number((baselineDailyEnergy * (efficiencyLossPct / 100)).toFixed(2));
  const carbonEmissionKgCo2e = Number((energyWasteKwh * 0.42).toFixed(2));

  const failureRiskPct = Number(
    Math.min(
      95,
      Math.max(
        4,
        (vibrationImpact * 0.4 + tempImpact * 0.25 + powerMismatchImpact * 0.2 + ageImpact * 0.15) * weightedMaintenance
      )
    ).toFixed(2)
  );

  const contributionRaw = [
    { parameter: 'Temperature', value: tempImpact },
    { parameter: 'Vibration', value: vibrationImpact },
    { parameter: 'RPM Stability', value: rpmImpact },
    { parameter: 'Power Mismatch', value: powerMismatchImpact },
    { parameter: 'Machine Age', value: ageImpact }
  ];

  const totalContribution = contributionRaw.reduce((sum, item) => sum + item.value, 0) || 1;
  const contributions = contributionRaw.map((item) => ({
    parameter: item.parameter,
    contributionPct: Number(((item.value / totalContribution) * 100).toFixed(2))
  }));

  const major = [...contributions].sort((a, b) => b.contributionPct - a.contributionPct)[0];

  const insights = [
    `Efficiency drop primarily caused by ${major.parameter.toLowerCase()}.`,
    `Temperature contributes ${contributions.find((x) => x.parameter === 'Temperature')?.contributionPct ?? 0}% of power loss.`,
    `RPM instability indicates mechanical imbalance when sustained beyond baseline.`
  ];

  const alerts: string[] = [];
  if (input.vibrationMmS > profile.vibration * 1.35) alerts.push('High vibration detected → energy leak risk.');
  if (input.temperatureC > profile.temp * 1.22) alerts.push('Temperature abnormal → friction and thermal stress risk.');
  if (Math.abs(measuredPowerKw - input.ratedPowerKw) / input.ratedPowerKw > 0.18) {
    alerts.push('Power mismatch detected → potential electrical fault.');
  }
  if (input.maintenanceCondition === 'poor') alerts.push('Maintenance condition poor → accelerated wear risk.');

  return {
    efficiencyLossPct,
    energyWasteKwh,
    carbonEmissionKgCo2e,
    failureRiskPct,
    greenHealthScore: gradeScore(efficiencyLossPct, failureRiskPct),
    insights,
    alerts,
    contributions
  };
};
