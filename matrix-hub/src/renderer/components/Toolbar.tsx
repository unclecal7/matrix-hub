import { forwardRef } from 'react';
import { SearchIcon, LockToggleIcon, SaveIcon } from './Icons';
import PresetPanel from './PresetPanel';

interface ToolbarProps {
  search: string;
  setSearch: (s: string) => void;
  showLocks: boolean;
  setShowLocks: (v: boolean) => void;
  showPresets: boolean;
  setShowPresets: (v: boolean) => void;
  activeDeviceId: string | null;
  onRandomize: () => void;
}

const Toolbar = forwardRef<HTMLInputElement, ToolbarProps>(function Toolbar(
  { search, setSearch, showLocks, setShowLocks, showPresets, setShowPresets, activeDeviceId, onRandomize },
  ref,
) {
  return (
    <div className="mh-toolbar">
      <div className="mh-search">
        <SearchIcon />
        <input
          ref={ref}
          placeholder="Filter inputs, outputs, groups... (press /)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mh-toolbar-divider" />

      <button className={`mh-toolbar-btn ${showLocks ? 'active' : ''}`} onClick={() => setShowLocks(!showLocks)}>
        <LockToggleIcon />
        Locks {showLocks ? 'ON' : 'OFF'}
      </button>

      <button className="mh-toolbar-btn" onClick={onRandomize}>
        ↻ Randomize
      </button>

      <div style={{ position: 'relative' }}>
        <button className="mh-toolbar-btn mh-preset-btn" onClick={() => setShowPresets(!showPresets)}>
          <SaveIcon />
          Presets
        </button>
        {showPresets && <PresetPanel deviceId={activeDeviceId} onClose={() => setShowPresets(false)} />}
      </div>
    </div>
  );
});

export default Toolbar;
