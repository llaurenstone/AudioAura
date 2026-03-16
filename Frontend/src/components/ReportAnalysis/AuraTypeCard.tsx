import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

interface AuraTypeCardProps {
  name: string;
  description: string;
  personality?: string[];
}

export function AuraTypeCard({
  name,
  description,
  personality,
}: AuraTypeCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="report-aura-card"
    >
      <div className="report-aura-overlay" />

      <div className="report-aura-content">
        <div className="report-aura-header">
          <div className="report-aura-icon-wrap">
            <Sparkles className="report-aura-icon" />
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
