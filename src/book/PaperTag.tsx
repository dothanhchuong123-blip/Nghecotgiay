import React from 'react';
import { useStore, setPaperPick } from '../state';
import { currentPaper, paperId } from './paper';
import { HANG_TRONG, HT_COPY, STAGE } from '../data';

export default function PaperTag() {
  const { state, dispatch } = useStore();
  const P = currentPaper(state);

  const line1 = HT_COPY.paperTag.replace('{name}', P.label);
  const line2 = HT_COPY.paperFrom;

  const handleNextPaper = () => {
    const keys = Object.keys(HANG_TRONG.papers);
    const currId = paperId(state);
    const currIdx = keys.indexOf(currId);
    const nextIdx = currIdx >= 0 ? (currIdx + 1) % keys.length : 0;
    dispatch(setPaperPick(keys[nextIdx]));
  };

  return (
    <button
      type="button"
      className="paper-tag-card"
      onClick={handleNextPaper}
      aria-label={line1}
    >
      <div
        className="paper-tag-tape"
        aria-hidden="true"
        style={{ backgroundImage: `url("${STAGE.paper.tape}")` }}
      />
      <span className="paper-tag-line1">{line1}</span>
      <span className="paper-tag-line2">{line2}</span>
    </button>
  );
}
