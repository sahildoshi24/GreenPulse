const mongoose = require('mongoose');

const historyEntrySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  field: String,
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  energyAtChange: Number,
  co2AtChange: Number,
  efficiencyAtChange: Number
});

const machineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ['Blast Furnace', 'Basic Oxygen Furnace', 'Electric Arc Furnace', 'Continuous Casting Machine', 'Hot Rolling Mill']
  },
  age: { type: Number, required: true, min: 0 },
  productionOutput: { type: Number, required: true, min: 0 },
  electricityConsumption: { type: Number, required: true, min: 0 },
  fuelConsumption: { type: Number, required: true, min: 0 },
  operatingTemperature: { type: Number, required: true },
  current: { type: Number, required: true, min: 0 },
  voltage: { type: Number, required: true, min: 0 },
  vibrationLevel: { type: Number, required: true, min: 0, max: 20 },

  // AI Analysis Results
  expectedEnergy: { type: Number, default: 0 },
  inefficiencyPercent: { type: Number, default: 0 },
  status: { type: String, enum: ['Efficient', 'Warning', 'Critical', 'deleted'], default: 'Efficient' },
  extraEnergy: { type: Number, default: 0 },
  co2Total: { type: Number, default: 0 },
  co2Excess: { type: Number, default: 0 },
  costLossDay: { type: Number, default: 0 },
  costLossMonth: { type: Number, default: 0 },
  costLossYear: { type: Number, default: 0 },

  // XAI
  xaiExplanation: [{ cause: String, impact: Number, detail: String }],

  // Recommendations
  recommendations: [String],

  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },

  // History
  history: [historyEntrySchema],

  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Standard efficiency factors (kWh per ton) for each machine type
machineSchema.statics.EFFICIENCY_FACTORS = {
  'Blast Furnace': 550,
  'Basic Oxygen Furnace': 280,
  'Electric Arc Furnace': 450,
  'Continuous Casting Machine': 60,
  'Hot Rolling Mill': 180
};

// Optimal temperature ranges
machineSchema.statics.OPTIMAL_TEMPS = {
  'Blast Furnace': { min: 1100, max: 1500 },
  'Basic Oxygen Furnace': { min: 1600, max: 1700 },
  'Electric Arc Furnace': { min: 1500, max: 1800 },
  'Continuous Casting Machine': { min: 900, max: 1100 },
  'Hot Rolling Mill': { min: 800, max: 1100 }
};

module.exports = mongoose.model('Machine', machineSchema);
