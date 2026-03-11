import { useState, useEffect, useCallback } from 'react';

interface Preset {
  id: string;
  name: string;
  device_id: string;
  routing: Record<number, number>;
  created_at: string;
}

const API = '';

interface PresetPanelProps {
  deviceId: string | null;
  onClose: () => void;
}

export default function PresetPanel({ deviceId, onClose }: PresetPanelProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [saveName, setSaveName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [recalling, setRecalling] = useState<string | null>(null);

  const loadPresets = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await fetch(`${API}/api/devices/${deviceId}/presets`);
      setPresets(await res.json());
    } catch (err) {
      console.error('Failed to load presets:', err);
    }
  }, [deviceId]);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const savePreset = async () => {
    if (!deviceId || !saveName.trim()) return;
    try {
      await fetch(`${API}/api/devices/${deviceId}/presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saveName.trim() }),
      });
      setSaveName('');
      setShowSaveForm(false);
      loadPresets();
    } catch (err) {
      console.error('Failed to save preset:', err);
    }
  };

  const recallPreset = async (presetId: string) => {
    if (!deviceId) return;
    setRecalling(presetId);
    try {
      await fetch(`${API}/api/devices/${deviceId}/presets/${presetId}/recall`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to recall preset:', err);
    }
    setTimeout(() => setRecalling(null), 600);
  };

  const deletePreset = async (presetId: string) => {
    if (!confirm('Delete this preset?')) return;
    try {
      await fetch(`${API}/api/presets/${presetId}`, { method: 'DELETE' });
      loadPresets();
    } catch (err) {
      console.error('Failed to delete preset:', err);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 44,
        right: 16,
        width: 300,
        background: 'var(--mh-surface)',
        border: '1px solid var(--mh-border)',
        borderRadius: 10,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--mh-border)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--mh-mono)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--mh-accent)',
            letterSpacing: '0.04em',
          }}
        >
          Presets
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowSaveForm(!showSaveForm)} style={headerBtnStyle}>
            + Save Current
          </button>
          <button onClick={onClose} style={{ ...headerBtnStyle, color: 'var(--mh-text-muted)' }}>
            ✕
          </button>
        </div>
      </div>

      {/* Save form */}
      {showSaveForm && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '8px 14px',
            borderBottom: '1px solid var(--mh-border)',
            background: 'var(--mh-surface2)',
          }}
        >
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Preset name..."
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && savePreset()}
            style={{
              flex: 1,
              background: 'var(--mh-bg)',
              border: '1px solid var(--mh-border)',
              borderRadius: 5,
              padding: '5px 8px',
              color: 'var(--mh-text)',
              fontSize: 11,
              fontFamily: 'var(--mh-font)',
              outline: 'none',
            }}
          />
          <button
            onClick={savePreset}
            style={{
              ...headerBtnStyle,
              background: 'rgba(0,229,160,0.1)',
              borderColor: 'rgba(0,229,160,0.3)',
              color: 'var(--mh-accent)',
            }}
          >
            Save
          </button>
        </div>
      )}

      {/* Preset list */}
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {presets.length === 0 && (
          <div
            style={{
              padding: '20px 14px',
              fontSize: 11,
              color: 'var(--mh-text-muted)',
              textAlign: 'center',
            }}
          >
            No presets saved yet
          </div>
        )}
        {presets.map((s) => (
          <div
            key={s.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderBottom: '1px solid rgba(37,42,54,0.5)',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mh-surface2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mh-text)' }}>{s.name}</div>
              <div
                style={{
                  fontSize: 9,
                  fontFamily: 'var(--mh-mono)',
                  color: 'var(--mh-text-muted)',
                  marginTop: 1,
                }}
              >
                {Object.keys(s.routing).length} routes
              </div>
            </div>
            <button
              onClick={() => recallPreset(s.id)}
              style={{
                ...headerBtnStyle,
                background: recalling === s.id ? 'rgba(0,229,160,0.2)' : 'rgba(0,229,160,0.08)',
                borderColor: 'rgba(0,229,160,0.25)',
                color: 'var(--mh-accent)',
                fontWeight: 700,
              }}
            >
              {recalling === s.id ? '...' : 'Recall'}
            </button>
            <button
              onClick={() => deletePreset(s.id)}
              style={{ ...headerBtnStyle, color: 'var(--mh-danger)', padding: '3px 6px' }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const headerBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--mh-border)',
  borderRadius: 4,
  padding: '3px 8px',
  fontSize: 10,
  fontWeight: 600,
  fontFamily: 'var(--mh-font)',
  color: 'var(--mh-text-dim)',
  cursor: 'pointer',
};
