/**
 * GreenPulse AI Analysis Engine
 * Performs efficiency analysis, XAI reasoning, CO₂/cost calculations, and recommendations
 */

const EFFICIENCY_FACTORS = {
  'Blast Furnace': 550,
  'Basic Oxygen Furnace': 280,
  'Electric Arc Furnace': 450,
  'Continuous Casting Machine': 60,
  'Hot Rolling Mill': 180
};

const OPTIMAL_TEMPS = {
  'Blast Furnace': { min: 1100, max: 1500 },
  'Basic Oxygen Furnace': { min: 1600, max: 1700 },
  'Electric Arc Furnace': { min: 1500, max: 1800 },
  'Continuous Casting Machine': { min: 900, max: 1100 },
  'Hot Rolling Mill': { min: 800, max: 1100 }
};

const OPTIMAL_VIBRATION = 5;
const AGE_THRESHOLD = 10;
const HIGH_CURRENT_FACTOR = 1.15;

const EMISSION_FACTOR = parseFloat(process.env.EMISSION_FACTOR) || 0.82; // kg CO₂ per kWh
const COST_PER_KWH = parseFloat(process.env.COST_PER_KWH) || 8; // ₹ per kWh

/**
 * Run full AI analysis on a machine
 */
function analyzeMachine(machine) {
  const result = {};

  // Step 1: Calculate Expected Energy
  const factor = EFFICIENCY_FACTORS[machine.type] || 300;
  result.expectedEnergy = machine.productionOutput * factor;

  // Step 2: Calculate Inefficiency
  const actualEnergy = machine.electricityConsumption + (machine.fuelConsumption * 8.14); // fuel to kWh conversion
  const diff = actualEnergy - result.expectedEnergy;
  result.extraEnergy = Math.max(0, diff);
  result.inefficiencyPercent = result.expectedEnergy > 0
    ? Math.max(0, ((diff) / result.expectedEnergy) * 100)
    : 0;

  // Step 3: Classify Status
  if (result.inefficiencyPercent <= 10) {
    result.status = 'Efficient';
  } else if (result.inefficiencyPercent <= 25) {
    result.status = 'Warning';
  } else {
    result.status = 'Critical';
  }

  // Step 4: XAI - Explain causes
  result.xaiExplanation = generateXAI(machine, result);

  // Step 5: CO₂ calculations
  result.co2Total = actualEnergy * EMISSION_FACTOR;
  result.co2Excess = result.extraEnergy * EMISSION_FACTOR;

  // Step 6: Cost calculations
  result.costLossDay = result.extraEnergy * COST_PER_KWH;
  result.costLossMonth = result.costLossDay * 30;
  result.costLossYear = result.costLossDay * 365;

  // Step 7: Recommendations
  result.recommendations = generateRecommendations(machine, result);

  return result;
}

/**
 * Generate XAI explanations
 */
function generateXAI(machine, analysis) {
  const explanations = [];

  // Vibration analysis
  if (machine.vibrationLevel > OPTIMAL_VIBRATION) {
    const excess = machine.vibrationLevel - OPTIMAL_VIBRATION;
    const impact = Math.min(excess * 2.4, 30);
    explanations.push({
      cause: 'High Vibration Level',
      impact: parseFloat(impact.toFixed(1)),
      detail: `Vibration at ${machine.vibrationLevel}/20 exceeds optimal level of ${OPTIMAL_VIBRATION}. This indicates mechanical wear, misalignment, or bearing degradation causing +${impact.toFixed(1)}% energy loss.`
    });
  }

  // Age analysis
  if (machine.age > AGE_THRESHOLD) {
    const excessAge = machine.age - AGE_THRESHOLD;
    const impact = Math.min(excessAge * 1.2, 20);
    explanations.push({
      cause: 'Aging Components',
      impact: parseFloat(impact.toFixed(1)),
      detail: `Machine age of ${machine.age} years exceeds ${AGE_THRESHOLD}-year threshold. Component degradation causes +${impact.toFixed(1)}% efficiency loss due to wear on refractory linings, seals, and moving parts.`
    });
  }

  // Temperature analysis
  const optTemp = OPTIMAL_TEMPS[machine.type];
  if (optTemp) {
    if (machine.operatingTemperature > optTemp.max) {
      const excess = machine.operatingTemperature - optTemp.max;
      const impact = Math.min(excess * 0.08, 15);
      explanations.push({
        cause: 'Excessive Operating Temperature',
        impact: parseFloat(impact.toFixed(1)),
        detail: `Temperature ${machine.operatingTemperature}°C exceeds optimal max of ${optTemp.max}°C. Overheating increases energy consumption by +${impact.toFixed(1)}% and accelerates equipment degradation.`
      });
    } else if (machine.operatingTemperature < optTemp.min) {
      const deficit = optTemp.min - machine.operatingTemperature;
      const impact = Math.min(deficit * 0.06, 12);
      explanations.push({
        cause: 'Sub-optimal Operating Temperature',
        impact: parseFloat(impact.toFixed(1)),
        detail: `Temperature ${machine.operatingTemperature}°C is below optimal min of ${optTemp.min}°C. Insufficient heat reduces process efficiency by +${impact.toFixed(1)}%.`
      });
    }
  }

  // Electrical analysis (Power Factor)
  const power = (machine.current * machine.voltage) / 1000; // kW
  const expectedPower = (result_expectedPowerForType(machine.type, machine.productionOutput));
  if (power > expectedPower * HIGH_CURRENT_FACTOR) {
    const excessPercent = ((power - expectedPower) / expectedPower) * 100;
    const impact = Math.min(excessPercent * 0.5, 18);
    explanations.push({
      cause: 'Electrical Overload',
      impact: parseFloat(impact.toFixed(1)),
      detail: `Actual power draw ${power.toFixed(0)}kW exceeds expected ${expectedPower.toFixed(0)}kW. Possible causes: poor power factor, phase imbalance, or motor inefficiency contributing +${impact.toFixed(1)}% loss.`
    });
  }

  // Fuel efficiency analysis
  const fuelToElecRatio = machine.fuelConsumption > 0 ? machine.electricityConsumption / machine.fuelConsumption : 0;
  if (machine.fuelConsumption > 0 && fuelToElecRatio < 2) {
    const impact = Math.min((2 - fuelToElecRatio) * 5, 10);
    explanations.push({
      cause: 'High Fuel Dependency',
      impact: parseFloat(impact.toFixed(1)),
      detail: `Low electricity-to-fuel ratio (${fuelToElecRatio.toFixed(1)}) suggests heavy reliance on combustion. This increases CO₂ by +${impact.toFixed(1)}% compared to electrified processes.`
    });
  }

  return explanations;
}

function result_expectedPowerForType(type, productionOutput) {
  const basePower = {
    'Blast Furnace': 45,
    'Basic Oxygen Furnace': 25,
    'Electric Arc Furnace': 60,
    'Continuous Casting Machine': 8,
    'Hot Rolling Mill': 22
  };
  return (basePower[type] || 30) * productionOutput;
}

/**
 * Generate AI Recommendations
 */
function generateRecommendations(machine, analysis) {
  const recs = [];

  if (analysis.status === 'Efficient') {
    recs.push('✅ Machine is operating within optimal parameters. Continue current maintenance schedule.');
    recs.push('📊 Monitor vibration and temperature trends for early anomaly detection.');
    return recs;
  }

  if (analysis.status === 'Warning') {
    recs.push('⚠️ Schedule preventive maintenance within 7 days.');
    recs.push('📉 Reduce operational load by 10-15% during peak hours to minimize stress.');

    if (machine.vibrationLevel > OPTIMAL_VIBRATION) {
      recs.push('🔧 Inspect and realign rotating components. Check bearing condition.');
    }
    if (machine.age > AGE_THRESHOLD) {
      recs.push('📅 Plan component replacement within 3-6 months for worn parts.');
    }
    const optTemp = OPTIMAL_TEMPS[machine.type];
    if (optTemp && machine.operatingTemperature > optTemp.max) {
      recs.push('🌡️ Check cooling systems and reduce heat input. Inspect insulation integrity.');
    }
    recs.push('💡 Consider installing variable frequency drives (VFDs) for motor-driven equipment.');
  }

  if (analysis.status === 'Critical') {
    recs.push('🚨 IMMEDIATE INSPECTION REQUIRED. Shut down and inspect within 24 hours.');
    recs.push('🔴 Current inefficiency level poses significant financial and environmental risk.');

    if (machine.vibrationLevel > 12) {
      recs.push('🔧 URGENT: Vibration exceeds safe limits. Risk of catastrophic bearing failure.');
    }
    if (machine.age > 20) {
      recs.push('🏭 Machine has exceeded typical service life. Begin replacement planning immediately.');
      recs.push(`📅 Recommended replacement timeline: within ${Math.max(1, 12 - Math.floor((machine.age - 20) * 2))} months.`);
    } else if (machine.age > AGE_THRESHOLD) {
      recs.push('📅 Schedule major overhaul or replacement within 6 months.');
    }

    recs.push(`💰 Current daily loss: ₹${analysis.costLossDay.toFixed(0)}. Annual projected loss: ₹${analysis.costLossYear.toFixed(0)}.`);
    recs.push('🌿 Reducing inefficiency by 50% would save ' + (analysis.co2Excess * 0.5 * 365 / 1000).toFixed(1) + ' tonnes CO₂/year.');
    recs.push('📊 Conduct full energy audit and thermal imaging survey.');
  }

  return recs;
}

/**
 * AI Chatbot response generator
 */
function chatbotResponse(query, machines) {
  const q = query.toLowerCase();
  const activeMachines = machines.filter(m => !m.isDeleted);

  if (activeMachines.length === 0) {
    return {
      answer: "No machines are currently registered in the system. Please add machines to get AI-powered insights.",
      suggestions: ["Add a new machine to get started", "Learn about supported machine types"]
    };
  }

  // Most inefficient machine
  if (q.includes('most inefficient') || q.includes('worst') || q.includes('least efficient')) {
    const worst = [...activeMachines].sort((a, b) => b.inefficiencyPercent - a.inefficiencyPercent)[0];
    return {
      answer: `The most inefficient machine is **${worst.name}** (${worst.type}) with an inefficiency of **${worst.inefficiencyPercent.toFixed(1)}%**. Status: **${worst.status}**.\n\nKey issues:\n${worst.xaiExplanation.map(x => `• ${x.cause}: +${x.impact}%`).join('\n')}\n\nThis machine is causing ₹${worst.costLossDay.toFixed(0)}/day in excess costs and ${worst.co2Excess.toFixed(1)} kg excess CO₂/day.`,
      suggestions: ["View detailed analysis", "See recommendations", "Compare with other machines"]
    };
  }

  // CO₂ related
  if (q.includes('co2') || q.includes('carbon') || q.includes('co₂') || q.includes('emission')) {
    const totalCO2 = activeMachines.reduce((sum, m) => sum + m.co2Total, 0);
    const excessCO2 = activeMachines.reduce((sum, m) => sum + m.co2Excess, 0);
    const topEmitter = [...activeMachines].sort((a, b) => b.co2Total - a.co2Total)[0];

    let answer = `**Total CO₂ Emissions:** ${totalCO2.toFixed(1)} kg/day (${(totalCO2 * 365 / 1000).toFixed(1)} tonnes/year)\n`;
    answer += `**Excess CO₂ from inefficiency:** ${excessCO2.toFixed(1)} kg/day\n`;
    answer += `**Top emitter:** ${topEmitter.name} (${topEmitter.type}) at ${topEmitter.co2Total.toFixed(1)} kg/day\n\n`;

    if (q.includes('increasing') || q.includes('why') || q.includes('reduce')) {
      answer += `CO₂ is driven by energy consumption. Key factors:\n`;
      const criticalMachines = activeMachines.filter(m => m.status === 'Critical');
      if (criticalMachines.length > 0) {
        answer += `• ${criticalMachines.length} critical machine(s) contributing excess emissions\n`;
        criticalMachines.forEach(m => {
          answer += `  - ${m.name}: ${m.co2Excess.toFixed(1)} kg excess CO₂/day\n`;
        });
      }
      answer += `\n**To reduce CO₂:** Fix inefficiencies in critical machines first. Potential savings: ${excessCO2.toFixed(1)} kg CO₂/day.`;
    }

    return { answer, suggestions: ["Show machine ranking by CO₂", "How to reduce emissions", "View critical machines"] };
  }

  // Energy related
  if (q.includes('energy') || q.includes('electricity') || q.includes('power') || q.includes('consumption')) {
    const totalElec = activeMachines.reduce((sum, m) => sum + m.electricityConsumption, 0);
    const totalExpected = activeMachines.reduce((sum, m) => sum + m.expectedEnergy, 0);
    const totalExtra = activeMachines.reduce((sum, m) => sum + m.extraEnergy, 0);

    let answer = `**Energy Overview:**\n`;
    answer += `• Total electricity consumption: ${totalElec.toFixed(0)} kWh/day\n`;
    answer += `• Expected (optimal): ${totalExpected.toFixed(0)} kWh/day\n`;
    answer += `• Excess energy: ${totalExtra.toFixed(0)} kWh/day\n`;
    answer += `• Energy waste: ${totalExpected > 0 ? ((totalExtra / totalExpected) * 100).toFixed(1) : 0}%\n\n`;

    if (q.includes('reduce') || q.includes('save') || q.includes('loss')) {
      answer += `**To reduce energy loss:**\n`;
      answer += `1. Address critical machines immediately\n`;
      answer += `2. Optimize load distribution during peak hours\n`;
      answer += `3. Install VFDs on motor-driven equipment\n`;
      answer += `4. Improve insulation and cooling systems\n`;
      answer += `\nPotential savings: ₹${(totalExtra * COST_PER_KWH).toFixed(0)}/day`;
    }

    return { answer, suggestions: ["Show most energy-hungry machines", "Cost impact analysis", "Efficiency ranking"] };
  }

  // Cost related
  if (q.includes('cost') || q.includes('money') || q.includes('loss') || q.includes('saving') || q.includes('₹') || q.includes('rupee')) {
    const totalLossDay = activeMachines.reduce((sum, m) => sum + m.costLossDay, 0);
    const topCost = [...activeMachines].sort((a, b) => b.costLossDay - a.costLossDay)[0];

    let answer = `**Financial Impact from Inefficiency:**\n`;
    answer += `• Daily loss: ₹${totalLossDay.toFixed(0)}\n`;
    answer += `• Monthly loss: ₹${(totalLossDay * 30).toFixed(0)}\n`;
    answer += `• Annual loss: ₹${(totalLossDay * 365).toFixed(0)}\n\n`;
    answer += `**Biggest cost driver:** ${topCost.name} at ₹${topCost.costLossDay.toFixed(0)}/day\n`;

    return { answer, suggestions: ["Show cost breakdown by machine", "How to reduce costs", "ROI of maintenance"] };
  }

  // Status / overview
  if (q.includes('status') || q.includes('overview') || q.includes('summary') || q.includes('how many') || q.includes('dashboard')) {
    const efficient = activeMachines.filter(m => m.status === 'Efficient').length;
    const warning = activeMachines.filter(m => m.status === 'Warning').length;
    const critical = activeMachines.filter(m => m.status === 'Critical').length;
    const totalCO2 = activeMachines.reduce((sum, m) => sum + m.co2Total, 0);

    let answer = `**Plant Overview:**\n`;
    answer += `• Total machines: ${activeMachines.length}\n`;
    answer += `• ✅ Efficient: ${efficient}\n`;
    answer += `• ⚠️ Warning: ${warning}\n`;
    answer += `• 🔴 Critical: ${critical}\n`;
    answer += `• Total CO₂: ${totalCO2.toFixed(1)} kg/day\n`;

    return { answer, suggestions: ["Show critical machines", "View energy analysis", "Get recommendations"] };
  }

  // Maintenance / recommendation
  if (q.includes('maintenance') || q.includes('recommend') || q.includes('action') || q.includes('fix') || q.includes('improve')) {
    const needsAction = activeMachines.filter(m => m.status !== 'Efficient').sort((a, b) => b.inefficiencyPercent - a.inefficiencyPercent);

    if (needsAction.length === 0) {
      return { answer: "All machines are currently operating efficiently. Continue regular maintenance schedules.", suggestions: [] };
    }

    let answer = `**Action Plan (${needsAction.length} machines need attention):**\n\n`;
    needsAction.forEach((m, i) => {
      answer += `**${i + 1}. ${m.name}** (${m.status}) - ${m.inefficiencyPercent.toFixed(1)}% inefficient\n`;
      m.recommendations.slice(0, 2).forEach(r => { answer += `   ${r}\n`; });
      answer += '\n';
    });

    return { answer, suggestions: ["Prioritize by cost impact", "Show detailed recommendations", "Schedule maintenance"] };
  }

  // Machine specific query
  const machineMatch = activeMachines.find(m => q.includes(m.name.toLowerCase()));
  if (machineMatch) {
    let answer = `**${machineMatch.name}** (${machineMatch.type})\n`;
    answer += `• Age: ${machineMatch.age} years\n`;
    answer += `• Status: **${machineMatch.status}**\n`;
    answer += `• Inefficiency: ${machineMatch.inefficiencyPercent.toFixed(1)}%\n`;
    answer += `• CO₂: ${machineMatch.co2Total.toFixed(1)} kg/day\n`;
    answer += `• Cost loss: ₹${machineMatch.costLossDay.toFixed(0)}/day\n\n`;

    if (machineMatch.xaiExplanation.length > 0) {
      answer += `**Root Causes:**\n`;
      machineMatch.xaiExplanation.forEach(x => {
        answer += `• ${x.cause}: +${x.impact}% — ${x.detail}\n`;
      });
    }

    return { answer, suggestions: ["View recommendations", "Compare with similar machines", "Show history"] };
  }

  // Default fallback
  return {
    answer: `I can help you with insights about your steel plant operations. Here's what I can answer:\n\n• Machine efficiency analysis\n• CO₂ and energy consumption\n• Cost impact calculations\n• Maintenance recommendations\n• Machine comparisons and rankings\n\nTry asking specific questions like "Which machine is most inefficient?" or "How can I reduce energy loss?"`,
    suggestions: ["Show plant overview", "Most inefficient machine", "CO₂ analysis", "Cost breakdown"]
  };
}

module.exports = { analyzeMachine, chatbotResponse };
