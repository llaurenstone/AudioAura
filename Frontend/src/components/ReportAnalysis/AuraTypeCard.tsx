import { motion } from "motion/react";
import aura1 from "../../assets/aura1.png";
import aura2 from "../../assets/aura2.png";
import aura3 from "../../assets/aura3.png";
import aura4 from "../../assets/aura4.png";
import aura5 from "../../assets/aura5.png";
import aura6 from "../../assets/aura6.png";
import { Sparkles } from "lucide-react";

interface AuraTypeCardProps {
  name: string;
  description: string;
  personality?: string[];
}

const auraImagesByName: Record<string, string> = {
  "Midnight Eclipse": aura1,
  "Lunar Dreamer": aura2,
  "Solar Bloom": aura3,
  "Inferno Pulse": aura4,
  "Rose Velvet": aura5,
  "Sage Drift": aura6,
};

const auraThemeClassByName: Record<string, string> = {
  "Midnight Eclipse": "report-aura-card--midnight-eclipse",
  "Lunar Dreamer": "report-aura-card--lunar-dreamer",
  "Solar Bloom": "report-aura-card--solar-bloom",
  "Inferno Pulse": "report-aura-card--inferno-pulse",
  "Rose Velvet": "report-aura-card--rose-velvet",
  "Sage Drift": "report-aura-card--sage-drift",
};

export function AuraTypeCard({
  name,
  description,
  personality,
}: AuraTypeCardProps) {
  const auraImage = auraImagesByName[name];
  const auraThemeClass = auraThemeClassByName[name] ?? "";

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`report-aura-card ${auraThemeClass}`.trim()}
    >
      <div className="report-aura-overlay" />

      <div className="report-aura-content">
        <div className="report-aura-header">
          <div className="report-aura-icon-wrap">
            {auraImage ? (
              <img
                className="report-aura-icon"
                src={auraImage}
                alt={`${name} aura icon`}
              />
            ) : 
             <Sparkles className="report-aura-icon report-aura-icon--fallback" />
             }
          </div>
          <div>
            <p className="report-section-label">Your AudioAura Type</p>
            <h2 className="report-aura-title">{name}</h2>
          </div>
        </div>

        <p className="report-aura-description">{description}</p>

        {personality?.length ? (
          <div className="report-aura-traits">
            <p className="report-aura-traits-title">
              What your AudioAura says about you:
            </p>

            {personality.map((trait, index) => (
              <motion.div
                key={trait}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                className="report-aura-trait"
              >
                <div className="report-aura-trait-dot" />
                <p>{trait}</p>
              </motion.div>
            ))}
          </div>
        ) : null}
      </div>

      {Array.from({ length: 5 }).map((_, index) => (
        <motion.div
          key={index}
          className="report-aura-star"
          style={{
            left: `${20 + index * 16}%`,
            top: `${14 + (index % 2) * 68}%`,
          }}
          animate={{
            opacity: [0.3, 0.85, 0.3],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 2 + index * 0.45,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.section>
  );
}
