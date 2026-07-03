import React from 'react';
import { TopBar } from './TopBar';
import { UpgradesPanel } from './UpgradesPanel';
import { ControlsPanel } from './ControlsPanel';
import { PrestigeButton } from './PrestigeButton';
import { AscensionButton } from './AscensionButton';
import { CubeNavigation } from './CubeNavigation';
import { FaceSelectorPanel } from './FaceSelectorPanel';

export const UI: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6">
      <TopBar />

      <div className="flex justify-between items-end w-full">
        <div className="pointer-events-auto flex flex-col gap-4">
          <FaceSelectorPanel />
          <UpgradesPanel />
        </div>
        <div className="pointer-events-auto flex-1 flex justify-center">
          <CubeNavigation />
        </div>
        <div className="pointer-events-auto flex flex-col gap-3 items-end">
          <AscensionButton />
          <PrestigeButton />
          <ControlsPanel />
        </div>
      </div>
      
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-white/50 text-sm font-medium tracking-wide">
        Drag to rotate. Left-click cells to select face & toggle alive state.
      </div>
    </div>
  );
};
