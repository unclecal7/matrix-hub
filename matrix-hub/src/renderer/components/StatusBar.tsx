import { LockToggleIcon } from './Icons';

interface StatusBarProps {
  inputCount: number;
  outputCount: number;
  activeRoutesCount: number;
  lockedCount: number;
  activeTab: string;
}

export default function StatusBar({
  inputCount,
  outputCount,
  activeRoutesCount,
  lockedCount,
  activeTab,
}: StatusBarProps) {
  return (
    <div className="mh-statusbar">
      <div className="mh-statusbar-item">
        <span className="mh-statusbar-accent">{inputCount}</span> Inputs
      </div>
      <div className="mh-statusbar-item">
        <span className="mh-statusbar-accent">{outputCount}</span> Outputs
      </div>
      <div className="mh-statusbar-item">
        <span className="mh-statusbar-accent">{activeRoutesCount}</span> Active Routes
      </div>
      <div className="mh-statusbar-item">
        <LockToggleIcon />
        <span className="mh-statusbar-accent">{lockedCount}</span> Locked
      </div>
      <div style={{ marginLeft: 'auto', fontFamily: 'var(--mh-mono)', letterSpacing: '0.05em' }}>
        {activeTab === 'videohub' ? 'VIDEOHUB ' + inputCount + 'x' + outputCount : 'ATEM CONSTELLATION 8K — AUX BUS'}
      </div>
    </div>
  );
}
