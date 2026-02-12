import { motion } from 'framer-motion';

export const ProgressRing = ({ value, label, color }: { value: number; label: string; color: string }) => {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative h-28 w-28">
      <svg className="h-28 w-28 -rotate-90">
        <circle cx="56" cy="56" r={radius} stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeWidth="10" fill="none" />
        <motion.circle
          cx="56"
          cy="56"
          r={radius}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.8 }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-xs">
        <span className="text-lg font-bold">{value.toFixed(0)}%</span>
        <span>{label}</span>
      </div>
    </div>
  );
};
