import auraRingVideo from "../../assets/aura-ring.mp4";

type AuraRingAnimationProps = {
  className?: string;
  videoClassName?: string;
};

function AuraRingAnimation({ className = "", videoClassName = "" }: AuraRingAnimationProps) {
  return (
    <div
      className={`pointer-events-none absolute ${className}`}
      aria-hidden="true"
    >
      <video
        className={`auraRingVideo ${videoClassName}`}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src={auraRingVideo} type="video/mp4" />
      </video>
    </div>
  );
}

export default AuraRingAnimation;
