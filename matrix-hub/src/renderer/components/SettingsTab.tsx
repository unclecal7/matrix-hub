import { useState, useEffect, useCallback } from 'react';

interface DeviceConfig {
  id: string;
  type: 'videohub' | 'atem';
  name: string;
  ip: string;
  status?: string;
}

const API = '';

interface CompanionConfig {
  ip: string;
  oscPort: number;
  enabled: boolean;
}

export default function SettingsTab() {
  const [devices, setDevices] = useState<DeviceConfig[]>([]);
  const [form, setForm] = useState({ name: '', type: 'videohub' as 'videohub' | 'atem', ip: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', ip: '' });
  const [companion, setCompanion] = useState<CompanionConfig>({ ip: '127.0.0.1', oscPort: 12321, enabled: false });
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<Record<string, { type: 'success' | 'error'; message: string }>>({});

  const loadDevices = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/devices`);
      setDevices(await res.json());
    } catch (err) {
      console.error('Failed to load devices:', err);
    }
  }, []);

  const loadCompanion = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/settings/companion`);
      if (res.ok) setCompanion(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    loadDevices();
    loadCompanion();
  }, [loadDevices, loadCompanion]);

  const addDevice = async () => {
    if (!form.name || !form.ip) return;
    try {
      await fetch(`${API}/api/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setForm({ name: '', type: 'videohub', ip: '' });
      loadDevices();
    } catch (err) {
      console.error('Failed to add device:', err);
    }
  };

  const updateDevice = async (id: string) => {
    try {
      await fetch(`${API}/api/devices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      setEditingId(null);
      loadDevices();
    } catch (err) {
      console.error('Failed to update device:', err);
    }
  };

  const deleteDevice = async (id: string) => {
    if (!confirm('Remove this device?')) return;
    try {
      await fetch(`${API}/api/devices/${id}`, { method: 'DELETE' });
      loadDevices();
    } catch (err) {
      console.error('Failed to delete device:', err);
    }
  };

  const saveCompanion = async (updates: Partial<CompanionConfig>) => {
    const updated = { ...companion, ...updates };
    setCompanion(updated);
    try {
      await fetch(`${API}/api/settings/companion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error('Failed to save companion settings:', err);
    }
  };

  const testCompanion = async () => {
    setTestResult('idle');
    try {
      const res = await fetch(`${API}/api/settings/companion/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult(data.success ? 'success' : 'error');
    } catch {
      setTestResult('error');
    }
  };

  const startEdit = (d: DeviceConfig) => {
    setEditingId(d.id);
    setEditForm({ name: d.name, ip: d.ip });
  };

  const importLabels = (deviceId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const xml = await file.text();
        const res = await fetch(`${API}/api/devices/${deviceId}/import-labels`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml' },
          body: xml,
        });
        const data = await res.json();
        if (res.ok) {
          setImportStatus((s) => ({
            ...s,
            [deviceId]: { type: 'success', message: `Imported ${data.count} output labels` },
          }));
        } else {
          setImportStatus((s) => ({ ...s, [deviceId]: { type: 'error', message: data.error || 'Import failed' } }));
        }
      } catch (err: any) {
        setImportStatus((s) => ({ ...s, [deviceId]: { type: 'error', message: err.message } }));
      }
      setTimeout(
        () =>
          setImportStatus((s) => {
            const n = { ...s };
            delete n[deviceId];
            return n;
          }),
        5000,
      );
    };
    input.click();
  };

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        padding: '24px 32px',
        background: 'var(--mh-bg)',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--mh-mono)',
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--mh-accent)',
          marginBottom: 20,
          letterSpacing: '0.05em',
        }}
      >
        Device Management
      </h2>

      {/* Device List */}
      <div style={{ marginBottom: 32 }}>
        {devices.map((d) => (
          <div
            key={d.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              background: 'var(--mh-surface)',
              borderRadius: 8,
              border: '1px solid var(--mh-border)',
              marginBottom: 8,
            }}
          >
            {/* Status dot */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                flexShrink: 0,
                background: d.status === 'connected' ? 'var(--mh-accent)' : 'var(--mh-danger)',
                boxShadow: d.status === 'connected' ? '0 0 6px rgba(0,229,160,0.4)' : '0 0 6px rgba(244,63,94,0.4)',
              }}
            />

            {editingId === d.id ? (
              <>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  style={inputStyle}
                  placeholder="Name"
                />
                <input
                  value={editForm.ip}
                  onChange={(e) => setEditForm((f) => ({ ...f, ip: e.target.value }))}
                  style={inputStyle}
                  placeholder="IP Address"
                />
                <button style={btnStyle} onClick={() => updateDevice(d.id)}>
                  Save
                </button>
                <button style={{ ...btnStyle, color: 'var(--mh-text-muted)' }} onClick={() => setEditingId(null)}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span
                  style={{
                    fontFamily: 'var(--mh-mono)',
                    fontSize: 10,
                    padding: '2px 6px',
                    background: 'var(--mh-bg)',
                    borderRadius: 4,
                    color: 'var(--mh-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {d.type}
                </span>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--mh-text)' }}>{d.name}</span>
                <span
                  style={{
                    fontFamily: 'var(--mh-mono)',
                    fontSize: 11,
                    color: 'var(--mh-text-dim)',
                  }}
                >
                  {d.ip}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: d.status === 'connected' ? 'var(--mh-accent)' : 'var(--mh-text-muted)',
                  }}
                >
                  {d.status || 'unknown'}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                  {d.type === 'atem' && (
                    <button
                      style={{
                        ...btnStyle,
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))',
                        borderColor: 'rgba(99,102,241,0.3)',
                        color: 'rgb(129,140,248)',
                      }}
                      onClick={() => importLabels(d.id)}
                    >
                      Import Labels
                    </button>
                  )}
                  {importStatus[d.id] && (
                    <span
                      style={{
                        fontSize: 10,
                        color: importStatus[d.id].type === 'success' ? 'var(--mh-accent)' : 'var(--mh-danger)',
                      }}
                    >
                      {importStatus[d.id].message}
                    </span>
                  )}
                  <button style={btnStyle} onClick={() => startEdit(d)}>
                    Edit
                  </button>
                  <button style={{ ...btnStyle, color: 'var(--mh-danger)' }} onClick={() => deleteDevice(d.id)}>
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {devices.length === 0 && (
          <div style={{ color: 'var(--mh-text-muted)', fontSize: 12 }}>No devices configured.</div>
        )}
      </div>

      {/* Add Device Form */}
      <h3
        style={{
          fontFamily: 'var(--mh-mono)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--mh-text-dim)',
          marginBottom: 12,
          letterSpacing: '0.04em',
        }}
      >
        Add Device
      </h3>
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          padding: '14px',
          background: 'var(--mh-surface)',
          borderRadius: 8,
          border: '1px solid var(--mh-border)',
        }}
      >
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Device name"
          style={inputStyle}
        />
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))}
          style={{
            ...inputStyle,
            width: 130,
            cursor: 'pointer',
            appearance: 'none',
          }}
        >
          <option value="videohub">Videohub</option>
          <option value="atem">ATEM</option>
        </select>
        <input
          value={form.ip}
          onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))}
          placeholder="IP address"
          style={inputStyle}
          onKeyDown={(e) => e.key === 'Enter' && addDevice()}
        />
        <button
          onClick={addDevice}
          style={{
            ...btnStyle,
            background: 'linear-gradient(135deg, rgba(0,229,160,0.15), rgba(0,229,160,0.05))',
            borderColor: 'rgba(0,229,160,0.3)',
            color: 'var(--mh-accent)',
            fontWeight: 700,
          }}
        >
          + Add
        </button>
      </div>

      {/* Companion Integration */}
      <h3
        style={{
          fontFamily: 'var(--mh-mono)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--mh-text-dim)',
          marginBottom: 12,
          marginTop: 32,
          letterSpacing: '0.04em',
        }}
      >
        Companion Integration (OSC Feedback)
      </h3>
      <div
        style={{
          padding: '14px',
          background: 'var(--mh-surface)',
          borderRadius: 8,
          border: '1px solid var(--mh-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Enable toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={companion.enabled}
            onChange={(e) => saveCompanion({ enabled: e.target.checked })}
            style={{ accentColor: 'var(--mh-accent)' }}
          />
          <span style={{ fontSize: 12, color: 'var(--mh-text)' }}>Enable OSC feedback to Companion</span>
        </label>

        {/* IP + Port */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 11, color: 'var(--mh-text-dim)', width: 80 }}>Companion IP</label>
          <input
            value={companion.ip}
            onChange={(e) => setCompanion((c) => ({ ...c, ip: e.target.value }))}
            onBlur={() => saveCompanion({ ip: companion.ip })}
            style={inputStyle}
            placeholder="127.0.0.1"
          />
          <label style={{ fontSize: 11, color: 'var(--mh-text-dim)', width: 60 }}>OSC Port</label>
          <input
            type="number"
            value={companion.oscPort}
            onChange={(e) => setCompanion((c) => ({ ...c, oscPort: parseInt(e.target.value) || 12321 }))}
            onBlur={() => saveCompanion({ oscPort: companion.oscPort })}
            style={{ ...inputStyle, width: 80 }}
            placeholder="12321"
          />
        </div>

        {/* Test button + result */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={testCompanion}
            style={{
              ...btnStyle,
              background: 'linear-gradient(135deg, rgba(0,229,160,0.15), rgba(0,229,160,0.05))',
              borderColor: 'rgba(0,229,160,0.3)',
              color: 'var(--mh-accent)',
              fontWeight: 700,
            }}
          >
            Test Connection
          </button>
          {testResult === 'success' && (
            <span style={{ fontSize: 11, color: 'var(--mh-accent)' }}>Sent! Check Companion for /matrix/test</span>
          )}
          {testResult === 'error' && (
            <span style={{ fontSize: 11, color: 'var(--mh-danger)' }}>Failed to send test message</span>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--mh-bg)',
  border: '1px solid var(--mh-border)',
  borderRadius: 6,
  padding: '6px 10px',
  color: 'var(--mh-text)',
  fontSize: 12,
  fontFamily: 'var(--mh-font)',
  outline: 'none',
  width: 160,
};

const btnStyle: React.CSSProperties = {
  background: 'var(--mh-surface2)',
  border: '1px solid var(--mh-border)',
  borderRadius: 5,
  padding: '5px 10px',
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'var(--mh-font)',
  color: 'var(--mh-text-dim)',
  cursor: 'pointer',
};
