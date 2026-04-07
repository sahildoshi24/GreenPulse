const express = require('express');
const router = express.Router();
const Machine = require('../models/Machine');
const { analyzeMachine, chatbotResponse } = require('../services/aiEngine');

// ─── GET ALL ACTIVE MACHINES ─────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const machines = await Machine.find({ isDeleted: false }).sort({ createdAt: -1 });
    res.json(machines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET DASHBOARD SUMMARY ──────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const machines = await Machine.find({ isDeleted: false });
    const totalMachines = machines.length;
    const totalCO2 = machines.reduce((s, m) => s + (m.co2Total || 0), 0);
    const totalElectricity = machines.reduce((s, m) => s + (m.electricityConsumption || 0), 0);
    const totalCostLoss = machines.reduce((s, m) => s + (m.costLossDay || 0), 0);
    const criticalCount = machines.filter(m => m.status === 'Critical').length;
    const warningCount = machines.filter(m => m.status === 'Warning').length;
    const efficientCount = machines.filter(m => m.status === 'Efficient').length;
    const totalExtraEnergy = machines.reduce((s, m) => s + (m.extraEnergy || 0), 0);
    const totalExpectedEnergy = machines.reduce((s, m) => s + (m.expectedEnergy || 0), 0);

    // Machine ranking by inefficiency
    const ranking = [...machines].sort((a, b) => b.inefficiencyPercent - a.inefficiencyPercent)
      .map(m => ({
        id: m._id,
        name: m.name,
        type: m.type,
        inefficiency: m.inefficiencyPercent,
        status: m.status,
        co2: m.co2Total,
        costLoss: m.costLossDay
      }));

    // CO₂ distribution by machine type
    const co2ByType = {};
    machines.forEach(m => {
      co2ByType[m.type] = (co2ByType[m.type] || 0) + m.co2Total;
    });

    res.json({
      totalMachines,
      totalCO2: parseFloat(totalCO2.toFixed(2)),
      totalElectricity: parseFloat(totalElectricity.toFixed(2)),
      totalCostLoss: parseFloat(totalCostLoss.toFixed(2)),
      criticalCount,
      warningCount,
      efficientCount,
      totalExtraEnergy: parseFloat(totalExtraEnergy.toFixed(2)),
      totalExpectedEnergy: parseFloat(totalExpectedEnergy.toFixed(2)),
      ranking,
      co2ByType
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET SINGLE MACHINE ─────────────────────────────────────


// ─── ADD MACHINE ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      name, type, age, productionOutput, electricityConsumption,
      fuelConsumption, operatingTemperature, current, voltage, vibrationLevel
    } = req.body;

    const machine = new Machine({
      name, type, age,
      productionOutput: parseFloat(productionOutput),
      electricityConsumption: parseFloat(electricityConsumption),
      fuelConsumption: parseFloat(fuelConsumption),
      operatingTemperature: parseFloat(operatingTemperature),
      current: parseFloat(current),
      voltage: parseFloat(voltage),
      vibrationLevel: parseFloat(vibrationLevel)
    });

    // Run AI analysis
    const analysis = analyzeMachine(machine);
    Object.assign(machine, analysis);
    machine.lastUpdated = new Date();

    await machine.save();
    res.status(201).json(machine);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── UPDATE MACHINE ──────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id);
    if (!machine) return res.status(404).json({ error: 'Machine not found' });

    const fields = ['name', 'type', 'age', 'productionOutput', 'electricityConsumption',
      'fuelConsumption', 'operatingTemperature', 'current', 'voltage', 'vibrationLevel'];

    // Track changes for history
    const changes = [];
    fields.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== machine[field]) {
        changes.push({
          timestamp: new Date(),
          field,
          oldValue: machine[field],
          newValue: req.body[field],
          energyAtChange: machine.electricityConsumption,
          co2AtChange: machine.co2Total,
          efficiencyAtChange: machine.inefficiencyPercent
        });
        machine[field] = field === 'name' || field === 'type' ? req.body[field] : parseFloat(req.body[field]);
      }
    });

    if (changes.length > 0) {
      machine.history.push(...changes);
    }

    // Re-run AI analysis
    const analysis = analyzeMachine(machine);
    Object.assign(machine, analysis);
    machine.lastUpdated = new Date();

    await machine.save();
    res.json(machine);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── SOFT DELETE MACHINE ─────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id);
    if (!machine) return res.status(404).json({ error: 'Machine not found' });

    machine.isDeleted = true;
    machine.deletedAt = new Date();
    await machine.save();

    res.json({ message: 'Machine moved to Recently Deleted', machine });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET DELETED MACHINES ────────────────────────────────────
router.get('/deleted/all', async (req, res) => {
  try {
    const machines = await Machine.find({ isDeleted: true }).sort({ deletedAt: -1 });
    res.json(machines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── RESTORE MACHINE ────────────────────────────────────────
router.patch('/:id/restore', async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id);
    if (!machine) return res.status(404).json({ error: 'Machine not found' });

    machine.isDeleted = false;
    machine.deletedAt = null;

    // Re-run analysis on restore
    const analysis = analyzeMachine(machine);
    Object.assign(machine, analysis);
    machine.lastUpdated = new Date();

    await machine.save();
    res.json({ message: 'Machine restored successfully', machine });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PERMANENT DELETE ────────────────────────────────────────
router.delete('/:id/permanent', async (req, res) => {
  try {
    await Machine.findByIdAndDelete(req.params.id);
    res.json({ message: 'Machine permanently deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET SINGLE MACHINE ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id);
    if (!machine) return res.status(404).json({ error: 'Machine not found' });
    res.json(machine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AI CHATBOT ──────────────────────────────────────────────
router.post('/chat/ask', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    const machines = await Machine.find({ isDeleted: false });
    const response = chatbotResponse(query, machines);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DATA ANALYSIS ───────────────────────────────────────────
router.get('/analysis/data', async (req, res) => {
  try {
    const machines = await Machine.find({ isDeleted: false });

    // Machine-wise comparison
    const comparison = machines.map(m => ({
      id: m._id,
      name: m.name,
      type: m.type,
      electricity: m.electricityConsumption,
      expectedEnergy: m.expectedEnergy,
      extraEnergy: m.extraEnergy,
      inefficiency: m.inefficiencyPercent,
      co2: m.co2Total,
      co2Excess: m.co2Excess,
      costLoss: m.costLossDay,
      status: m.status
    }));

    // CO₂ distribution
    const co2Distribution = {};
    machines.forEach(m => {
      co2Distribution[m.name] = m.co2Total;
    });

    // Rankings
    const rankByInefficiency = [...comparison].sort((a, b) => b.inefficiency - a.inefficiency);
    const rankByCO2 = [...comparison].sort((a, b) => b.co2 - a.co2);
    const rankByCost = [...comparison].sort((a, b) => b.costLoss - a.costLoss);

    res.json({
      comparison,
      co2Distribution,
      rankByInefficiency,
      rankByCO2,
      rankByCost
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
