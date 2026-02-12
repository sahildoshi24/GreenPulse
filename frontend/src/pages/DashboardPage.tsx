import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Leaf, LogOut, Moon, Sun, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { Machine, MachineInput } from '../lib/types';
import { useAuth } from '../features/auth/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { ProgressRing } from '../components/ProgressRing';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

const initialForm: MachineInput = {
  machineName: '', machineType: 'motor', ratedPowerKw: 75, temperatureC: 70, vibrationMmS: 2, rpm: 1450,
  voltage: 400, current: 100, ageYears: 3, dailyOperatingHours: 16, maintenanceCondition: 'good'
};

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selected, setSelected] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<MachineInput>(initialForm);

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Machine[]>('/machines');
      setMachines(data);
      setSelected(data[0] ?? null);
    } catch {
      setError('Unable to load machines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchMachines(); }, []);

  const submitMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post<Machine>('/machines', form);
      setMachines((prev) => [data, ...prev]);
      setSelected(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Machine submission failed');
    }
  };

  const deleteMachine = async (id: string) => {
    await api.delete(`/machines/${id}`);
    const next = machines.filter((m) => m.id !== id);
    setMachines(next);
    setSelected(next[0] ?? null);
  };

  const contributionData = useMemo(() => selected?.contributions ?? [], [selected]);

  return (
    <div className="min-h-screen p-3 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[250px_1fr]">
        <aside className="card h-fit space-y-4">
          <div>
            <h1 className="text-xl font-bold">GreenPulse</h1>
            <p className="text-sm text-slate-500">Industrial sustainability intelligence</p>
          </div>
          <div className="rounded-xl bg-emerald-500/10 p-3 text-sm">
            <p className="font-semibold">Operator</p>
            <p>{user?.name}</p>
          </div>
          <button className="flex w-full items-center justify-center gap-2 rounded-lg border p-2" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} Toggle theme
          </button>
          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 p-2 text-white dark:bg-white dark:text-slate-900" onClick={() => logout()}>
            <LogOut size={16} /> Logout
          </button>
        </aside>

        <main className="space-y-4">
          <section className="card">
            <h2 className="mb-3 text-lg font-semibold">Machine Input Module</h2>
            <form onSubmit={submitMachine} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                ['Machine name', 'machineName', 'text', 'e.g. Press Line 2'],
                ['Machine type', 'machineType', 'select', 'Operational class'],
                ['Rated power (kW)', 'ratedPowerKw', 'number', 'Nameplate rating'],
                ['Temperature (°C)', 'temperatureC', 'number', 'Thermal operating point'],
                ['Vibration (mm/s)', 'vibrationMmS', 'number', 'Vibration severity'],
                ['RPM', 'rpm', 'number', 'Rotational speed'],
                ['Voltage (V)', 'voltage', 'number', 'Electrical input voltage'],
                ['Current (A)', 'current', 'number', 'Load current'],
                ['Age (years)', 'ageYears', 'number', 'Machine age'],
                ['Daily hours (h)', 'dailyOperatingHours', 'number', 'Utilization level'],
                ['Maintenance condition', 'maintenanceCondition', 'selectMaintenance', 'Inspection quality']
              ].map(([label, field, type, hint]) => (
                <label key={field as string} className="text-sm">
                  <span className="mb-1 block font-medium">{label}</span>
                  {type === 'select' ? (
                    <select className="w-full rounded-lg border p-2" value={form.machineType} onChange={(e) => setForm({ ...form, machineType: e.target.value as MachineInput['machineType'] })}>
                      {['motor', 'compressor', 'pump', 'turbine', 'generator'].map((opt) => <option key={opt}>{opt}</option>)}
                    </select>
                  ) : type === 'selectMaintenance' ? (
                    <select className="w-full rounded-lg border p-2" value={form.maintenanceCondition} onChange={(e) => setForm({ ...form, maintenanceCondition: e.target.value as MachineInput['maintenanceCondition'] })}>
                      {['excellent', 'good', 'fair', 'poor'].map((opt) => <option key={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input
                      className="w-full rounded-lg border p-2"
                      type={type as string}
                      required
                      value={form[field as keyof MachineInput] as string | number}
                      onChange={(e) => setForm({ ...form, [field]: type === 'number' ? Number(e.target.value) : e.target.value })}
                    />
                  )}
                  <span className="text-xs text-slate-500">{hint}</span>
                </label>
              ))}
              <div className="md:col-span-2 xl:col-span-3">
                <button className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-500">Analyze machine</button>
              </div>
            </form>
            {error && <p className="mt-2 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
          </section>

          {loading ? <LoadingSkeleton /> : (
            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <section className="space-y-4">
                {selected ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="card flex items-center justify-between"><span>Health Grade</span><span className="rounded-full bg-emerald-600 px-3 py-1 font-bold text-white">{selected.greenHealthScore}</span></div>
                      <div className="card"><ProgressRing value={100 - selected.efficiencyLossPct} label="Efficiency" color="#22c55e" /></div>
                      <div className="card"><ProgressRing value={selected.failureRiskPct} label="Failure Risk" color="#f97316" /></div>
                      <div className="card"><ProgressRing value={Math.min(100, selected.carbonEmissionKgCo2e)} label="CO₂ Meter" color="#ef4444" /></div>
                    </div>

                    <div className="card">
                      <h3 className="mb-3 font-semibold">Parameter Contribution Chart</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={contributionData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="parameter" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="contributionPct" radius={[8, 8, 0, 0]}>
                            {contributionData.map((_, index) => <Cell key={index} fill={['#22c55e', '#f97316', '#38bdf8', '#a855f7', '#ef4444'][index % 5]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="card">
                        <h3 className="mb-2 font-semibold">Insight Engine</h3>
                        <ul className="space-y-2 text-sm">
                          {selected.insights.map((insight, idx) => <li key={idx} className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">{insight}</li>)}
                        </ul>
                      </div>
                      <div className="card">
                        <h3 className="mb-2 font-semibold">Alerts Panel</h3>
                        <div className="space-y-2">
                          {selected.alerts.length ? selected.alerts.map((alert, idx) => (
                            <div key={idx} className="flex items-center gap-2 rounded-lg bg-orange-100 p-2 text-sm text-orange-900 dark:bg-orange-900/30 dark:text-orange-200"><AlertTriangle size={16} />{alert}</div>
                          )) : <p className="text-sm text-slate-500">No active alerts.</p>}
                        </div>
                      </div>
                    </div>
                  </>
                ) : <div className="card text-center text-slate-500">Submit a machine to generate environmental intelligence.</div>}
              </section>

              <aside className="card">
                <h3 className="mb-3 font-semibold">Machine Records</h3>
                <AnimatePresence>
                  <div className="space-y-2">
                    {machines.map((m) => (
                      <motion.button key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full rounded-xl border p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => setSelected(m)}>
                        <div className="flex items-center justify-between"><p className="font-medium">{m.machineName}</p><Leaf size={15} className="text-emerald-500" /></div>
                        <p className="text-xs text-slate-500">Waste: {m.energyWasteKwh} kWh · CO₂e: {m.carbonEmissionKgCo2e} kg</p>
                        <button type="button" onClick={(e) => { e.stopPropagation(); void deleteMachine(m.id); }} className="mt-2 flex items-center gap-1 text-xs text-red-500"><Trash2 size={12} />Delete</button>
                      </motion.button>
                    ))}
                  </div>
                </AnimatePresence>
              </aside>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
