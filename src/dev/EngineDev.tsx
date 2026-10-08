import { useCallback, useEffect, useRef, useState } from 'react';
import { stepSpring } from '../engine/spring';
import Stand, { RegisteredStand, StandRegisterContext } from '../paper/Stand';
import './enginedev.css';

export default function EngineDev() {
  const [sliderVal, setSliderVal] = useState<number>(0);
  const standsRef = useRef<RegisteredStand[]>([]);
  const animRef = useRef<number | null>(null);

  const registerStand = useCallback((item: RegisteredStand) => {
    standsRef.current.push(item);
    return () => {
      standsRef.current = standsRef.current.filter((s) => s !== item);
    };
  }, []);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, []);

  function handleSliderChange(val: number) {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    setSliderVal(val);
    standsRef.current.forEach((s) => {
      s.t = val;
      s.v = 0;
      s.element.style.setProperty('--up', String(val));
      if (s.cast) s.cast.style.setProperty('--up', String(val));
    });
  }

  function handleRise() {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }

    // Reset springs
    standsRef.current.forEach((s) => {
      s.t = 0;
      s.v = 0;
      s.element.style.setProperty('--up', '0');
      if (s.cast) s.cast.style.setProperty('--up', '0');
    });
    setSliderVal(0);

    const startTime = performance.now();
    let lastTime = startTime;

    function tick(now: number) {
      const elapsed = (now - startTime) / 1000;
      const dt = Math.min((now - lastTime) / 1000, 1 / 30);
      lastTime = now;

      let allSettled = true;

      standsRef.current.forEach((s) => {
        const elapsedAfterDelay = Math.max(0, elapsed - s.d);
        // Target ramps from 0 to 1 over 0.5 s after delay
        const target = Math.min(1, elapsedAfterDelay / 0.5);

        const settled = stepSpring(s, target, dt);
        s.element.style.setProperty('--up', String(s.t));
        if (s.cast) s.cast.style.setProperty('--up', String(s.t));

        if (!settled || target < 1) {
          allSettled = false;
        }
      });

      if (!allSettled) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        animRef.current = null;
        setSliderVal(1);
      }
    }

    animRef.current = requestAnimationFrame(tick);
  }

  return (
    <div className="engine-dev-container">
      <div className="engine-dev-header">
        <div className="engine-dev-title">Paper Stand Engine (?dev=engine)</div>
        <div className="engine-dev-controls">
          <label className="engine-dev-slider-label">
            <span>--up: {sliderVal.toFixed(2)}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={sliderVal}
              onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
              className="engine-dev-slider"
            />
          </label>
          <button type="button" onClick={handleRise} className="engine-dev-btn">
            Rise
          </button>
        </div>
      </div>

      <div className="engine-dev-viewport">
        <StandRegisterContext.Provider
          value={{ page: 'L', registerStand }}
        >
          <div className="engine-dev-page">
            {/* Card 1: d = 0 */}
            <Stand x={40} y={540} w={140} h={180} d={0}>
              <div className="engine-dev-card">
                <div>
                  <div className="engine-dev-card-title">Card 1</div>
                  <div className="engine-dev-card-desc">Delay: 0.0s</div>
                </div>
                <span className="engine-dev-card-badge">d = 0s</span>
              </div>
            </Stand>

            {/* Card 2: d = 0.1, lift = 40 (kraft strut P5) */}
            <Stand x={215} y={460} w={140} h={180} lift={40} d={0.1}>
              <div className="engine-dev-card">
                <div>
                  <div className="engine-dev-card-title">Card 2</div>
                  <div className="engine-dev-card-desc">Lift: 40px (Strut)</div>
                </div>
                <span className="engine-dev-card-badge">d = 0.1s · lift=40</span>
              </div>
            </Stand>

            {/* Card 3: d = 0.2 */}
            <Stand x={390} y={380} w={140} h={180} d={0.2}>
              <div className="engine-dev-card">
                <div>
                  <div className="engine-dev-card-title">Card 3</div>
                  <div className="engine-dev-card-desc">Delay: 0.2s</div>
                </div>
                <span className="engine-dev-card-badge">d = 0.2s</span>
              </div>
            </Stand>
          </div>
        </StandRegisterContext.Provider>
      </div>
    </div>
  );
}
