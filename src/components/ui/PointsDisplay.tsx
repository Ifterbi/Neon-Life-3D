import React, { useEffect, useState } from 'react';
import { subscribeToPoints, getPointsSnapshot } from '../../game/store';

export const PointsDisplay: React.FC = () => {
  const [points, setPoints] = useState(() => getPointsSnapshot().points);

  useEffect(() => {
    return subscribeToPoints(() => {
      setPoints(getPointsSnapshot().points);
    });
  }, []);

  return (
    <div className="flex flex-col items-end pr-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold">Points</div>
      <div className="text-4xl font-black text-white tabular-nums tracking-tighter drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
        {points.toLocaleString()}
      </div>
    </div>
  );
};
