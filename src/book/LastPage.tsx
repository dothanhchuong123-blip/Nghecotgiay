import React, { useState } from 'react';
import { COPY, STAGE } from '../data';
import Stand from '../paper/Stand';
import Tape from '../paper/Tape';
import './last-page.css';

export interface LastPageProps {
  page?: 'L' | 'R';
}

export function LastPageLeft() {
  const [artMissing, setArtMissing] = useState(false);

  return (
    <div className="last-page-left">
      <div className="last-page-photo-wrap">
        <Tape angle={-8} className="last-page-tape-tl" />
        <Tape angle={10} className="last-page-tape-tr" />
        {!artMissing ? (
          <img
            src="/book/ban-3d.jpg"
            alt={COPY.back.pin || ''}
            className="last-page-photo"
            onError={() => {
              console.log('[art missing] /book/ban-3d.jpg');
              setArtMissing(true);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

export function LastPageRight() {
  const titleCfg = STAGE.right.title;

  return (
    <div className="last-page-right">
      <Stand
        x={titleCfg?.x ?? 30}
        y={340}
        w={titleCfg?.w ?? 510}
        h={380}
        d={0.1}
        rest={titleCfg?.rest ?? 0.97}
        tabs={[120, (titleCfg?.w ?? 510) - 166]}
      >
        <div
          className="last-page-title-card"
          style={{ backgroundImage: `url("${STAGE.paper.titleCard}")` }}
        >
          <h1 className="last-page-title">{COPY.back.title}</h1>
          <p className="last-page-line">{COPY.back.line}</p>
        </div>
      </Stand>
    </div>
  );
}

export default function LastPage({ page = 'L' }: LastPageProps) {
  if (page === 'R') {
    return <LastPageRight />;
  }
  return <LastPageLeft />;
}
