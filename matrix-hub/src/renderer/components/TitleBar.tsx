import type { DeviceState } from '../stores/useDeviceStore';
import { GridIcon, GearIcon } from './Icons';

interface TitleBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  devices: Record<string, DeviceState>;
  activeDevice: DeviceState | null;
  isOffline: boolean;
  setActiveDevice: (id: string) => void;
}

export default function TitleBar({
  activeTab,
  setActiveTab,
  devices,
  activeDevice,
  isOffline,
  setActiveDevice,
}: TitleBarProps) {
  return (
    <div className="mh-titlebar">
      <div className="mh-logo">
        <GridIcon />
        MATRIX HUB
      </div>

      <div className="mh-tabs">
        <button
          className={`mh-tab ${activeTab === 'videohub' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('videohub');
            const vhDevice = Object.values(devices).find((d) => d.type === 'videohub');
            if (vhDevice) setActiveDevice(vhDevice.id);
          }}
        >
          Videohub Routing
        </button>
        <button
          className={`mh-tab ${activeTab === 'atem' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('atem');
            const atemDevice = Object.values(devices).find((d) => d.type === 'atem');
            if (atemDevice) setActiveDevice(atemDevice.id);
          }}
        >
          ATEM Aux Bus
        </button>
        <button
          className={`mh-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <GearIcon /> Settings
        </button>
      </div>

      <div className="mh-device-badge">
        <div className={`mh-status-dot ${isOffline ? 'offline' : ''}`} />
        <span style={{ fontFamily: 'var(--mh-mono)', fontWeight: 600 }}>
          {isOffline ? 'OFFLINE' : activeDevice?.name || 'No Device Selected'}
        </span>
        <span style={{ color: 'var(--mh-text-muted)' }}>{activeDevice?.ip || ''}</span>
      </div>
    </div>
  );
}
