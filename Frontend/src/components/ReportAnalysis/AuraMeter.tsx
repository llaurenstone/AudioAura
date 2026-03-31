import { motion } from "motion/react";

interface AuraMeterProps {
  label: string;
  value?: number;
  color: "purple" | "pink" | "blue" | "green";
  delay?: number;
}

const colorClasses: Record<AuraMeterProps["color"], string> = {
  purple: "report-meter-fill-purple",
  pink: "report-meter-fill-pink",
  blue: "report-meter-fill-blue",
  green: "report-meter-fill-green",
};

function getIntensityLabel(value: number) {
  if (value >= 80) return "Very High";
  if (value >= 60) return "High";
  if (value >= 40) return "Medium";
  if (value >= 20) return "Low";
  return "Very Low";
}

export function AuraMeter({
  label,
  value,
  color,
  delay = 0,
}: AuraMeterProps) {
  const hasValue = value !== undefined;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="report-meter"
    >
      <div className="report-meter-head">
        <span className="report-meter-label">{label}</span>
        <span className="report-meter-intensity">
          {hasValue ? getIntensityLabel(value) : "Unavailable"}
        </span>
      </div>

      <div className="report-meter-track">
        <motion.div
          className={`report-meter-fill ${colorClasses[color]}`}
          initial={{ width: 0 }}
          animate={{ width: hasValue ? `${value}%` : "0%" }}
          transition={{ delay: delay + 0.2, duration: 1, ease: "easeOut" }}
        />

        {hasValue && (
          <motion.div
            className="report-meter-shimmer"
            animate={{ x: ["-100%", "100%"] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
              delay: delay + 1,
            }}
          />
        )}
      </div>

      <div className="report-meter-value">
        {hasValue ? `${value}%` : "No analysis yet"}
      </div>
    </motion.div>
  );
}
