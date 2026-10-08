import { useState } from 'react';
import {
  Paper,
  DieCut,
  Tape,
  Stamp,
  TornEdge,
  Chip,
  useStepped,
  jitter,
  useReducedMotion,
} from '../paper';
import './kit.css';

export default function Kit() {
  const [chipActive, setChipActive] = useState(true);
  const frame = useStepped(12);
  const reduced = useReducedMotion();
  const j = jitter(frame, 1);

  return (
    <div className="kit-page">
      <div className="kit-title">Paper Component Kit (?dev=kit)</div>

      <div className="kit-grid">
        {/* 1. Paper Tones & Lifted */}
        <div className="kit-section">
          <div className="kit-section-title">1. Paper (tones & lifted)</div>
          <div className="kit-row">
            <Paper tone="card" className="kit-paper-sample">
              tone="card"
            </Paper>
            <Paper tone="card" lifted className="kit-paper-sample">
              tone="card" lifted
            </Paper>
            <Paper tone="do" className="kit-paper-sample">
              tone="do"
            </Paper>
            <Paper tone="do2" className="kit-paper-sample">
              tone="do2"
            </Paper>
            <Paper tone="son" className="kit-paper-sample">
              tone="son" (white text)
            </Paper>
            <Paper tone="cham" className="kit-paper-sample">
              tone="cham" (white text)
            </Paper>
          </div>
        </div>

        {/* 2. DieCut */}
        <div className="kit-section">
          <div className="kit-section-title">2. DieCut (filter: var(--die))</div>
          <div className="kit-row">
            <DieCut>
              <img
                src="/book/deco/lotus.webp"
                alt="Lotus"
                className="kit-diecut-preview"
              />
            </DieCut>
            <DieCut>
              <img
                src="/book/deco/star-lantern.webp"
                alt="Star Lantern"
                className="kit-diecut-preview"
              />
            </DieCut>
          </div>
        </div>

        {/* 3. Tape */}
        <div className="kit-section">
          <div className="kit-section-title">3. Tape (110×26px, angle=-3)</div>
          <div className="kit-row">
            <Paper tone="card" className="kit-tape-demo-box">
              <Tape angle={-3} className="kit-tape-pos" />
              <span>Card with Tape</span>
            </Paper>
          </div>
        </div>

        {/* 4. Stamp */}
        <div className="kit-section">
          <div className="kit-section-title">4. Stamp</div>
          <div className="kit-row">
            <Stamp>NGHÊ CÓT</Stamp>
            <Stamp>VIỆT PHỤC</Stamp>
          </div>
        </div>

        {/* 5. TornEdge */}
        <div className="kit-section">
          <div className="kit-section-title">5. TornEdge (24 top / 24 bottom points, mulberry32 seed)</div>
          <div className="kit-row">
            <TornEdge seed={1}>
              <div className="kit-torn-sample">
                TornEdge seed=1 (dó paper strip with torn top and bottom edges)
              </div>
            </TornEdge>
            <TornEdge seed={77}>
              <div className="kit-torn-sample">
                TornEdge seed=77 (deterministic seeded edges)
              </div>
            </TornEdge>
          </div>
        </div>

        {/* 6. Chip */}
        <div className="kit-section">
          <div className="kit-section-title">6. Chip (pill button, active state)</div>
          <div className="kit-row">
            <Chip active={false} onClick={() => setChipActive(false)}>
              Inactive Chip
            </Chip>
            <Chip active={true} onClick={() => setChipActive(true)}>
              Active Chip
            </Chip>
            <Chip active={chipActive} onClick={() => setChipActive(!chipActive)}>
              Toggle Me ({chipActive ? 'Active' : 'Inactive'})
            </Chip>
          </div>
        </div>

        {/* 7. Motion & Jitter */}
        <div className="kit-section">
          <div className="kit-section-title">
            7. Motion (useStepped @12fps & jitter ±1px, ±0.6deg)
            {reduced ? ' [reduced motion: ON]' : ''}
          </div>
          <div className="kit-row">
            <div
              className="kit-jitter-box"
              style={{
                transform: `translate(${j.dx}px, ${j.dy}px) rotate(${j.rot}deg)`,
              }}
            >
              Frame: {frame} | dx: {j.dx}px | dy: {j.dy}px | rot: {j.rot}°
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
