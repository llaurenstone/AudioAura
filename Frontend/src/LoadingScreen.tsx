import { useEffect, useMemo, useState } from "react";
import "./LoadingScreen.css";

import aura1 from "./assets/aura1.png";
import aura2 from "./assets/aura2.png";
import aura3 from "./assets/aura3.png";
import aura4 from "./assets/aura4.png";
import aura5 from "./assets/aura5.png";
import aura6 from "./assets/aura6.png";

import bg from "./assets/homescreen.png";

type Props = { progress?: number };

export default function LoadingScreen({ progress = 0 }: Props) {
  const [shown, setShown] = useState(0);

  const auras = useMemo(() => [aura1, aura2, aura3, aura4, aura5, aura6], []);

  const [auraIndex, setAuraIndex] = useState(0);
  const [fade, setFade] = useState(true);

  const target = useMemo(() => {
    const p = Number.isFinite(progress) ? progress : 0;
    return Math.max(0, Math.min(100, p));
  }, [progress]);

  // smooth progress bar
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setShown((cur) => {
        const diff = target - cur;
        if (Math.abs(diff) < 0.1) return target;
        return cur + diff * 0.06;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  // smoother aura crossfade
  useEffect(() => {
    const HOLD_MS = 800;   // how long it's fully visible
    const FADE_MS = 260;   // fade duration (match CSS)

    const id = window.setInterval(() => {
      setFade(false); // fade out

      window.setTimeout(() => {
        setAuraIndex((i) => (i + 1) % auras.length); // swap while invisible
        setFade(true); // fade in
      }, FADE_MS);
    }, HOLD_MS + FADE_MS * 2);

    return () => window.clearInterval(id);
  }, [auras.length]);

  return (
    <div className="loadingWrap" style={{ backgroundImage: `url(${bg})` }}>
      <div className="loadingCenter">
        <div className="loadingIcon" aria-hidden>
          <div className="auraStack">
            <img
              className={`auraImage ${fade ? "auraOn" : "auraOff"}`}
              src={auras[auraIndex]}
              alt="Aura"
            />
          </div>
        </div>

        <h1 className="loadingTitle">Reading your aura…</h1>
        <p className="loadingSub">Tuning into your top vibes…</p>

        <div className="loadingBar" aria-hidden>
          <div className="loadingFill" style={{ width: `${shown}%` }} />
        </div>

        <div className="loadingPct">{Math.round(shown)}%</div>
      </div>
    </div>
  );
}