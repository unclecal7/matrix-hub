import { useState, useEffect, useCallback } from 'react';
import type { GroupWithAssignments } from '../../shared/types';

interface IOItem {
  id: number;
  label: string;
  sourceName?: string;
  autoGroup?: string;
}

const API = '';

const PRESET_COLORS = ['#00e5a0', '#3b82f6', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

interface GroupEditorProps {
  deviceId: string | null;
  direction: 'input' | 'output';
  ioItems: IOItem[];
  onClose: () => void;
  onGroupsChanged: () => void;
  autoGroupOverrides?: Record<string, { name?: string; color?: string }>;
  onAutoGroupOverride?: (key: string, override: { name?: string; color?: string }) => void;
}

export default function GroupEditor({
  deviceId,
  direction,
  ioItems,
  onClose,
  onGroupsChanged,
  autoGroupOverrides = {},
  onAutoGroupOverride,
}: GroupEditorProps) {
  const [groups, setGroups] = useState<GroupWithAssignments[]>([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedIOs, setSelectedIOs] = useState<Set<number>>(new Set());
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await fetch(`${API}/api/devices/${deviceId}/groups`);
      const all: GroupWithAssignments[] = await res.json();
      setGroups(all.filter((g) => g.direction === direction));
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  }, [deviceId, direction]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const selectGroup = (groupId: string) => {
    const g = groups.find((g) => g.id === groupId);
    setSelectedGroup(groupId);
    setSelectedIOs(g ? new Set(g.assignments) : new Set());
    setSaveStatus(null);
  };

  const createGroup = async () => {
    if (!deviceId || !newName.trim()) return;
    try {
      await fetch(`${API}/api/devices/${deviceId}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), direction, color: newColor }),
      });
      setNewName('');
      loadGroups();
      onGroupsChanged();
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Delete this group? I/Os will revert to default grouping.')) return;
    try {
      await fetch(`${API}/api/groups/${groupId}`, { method: 'DELETE' });
      if (selectedGroup === groupId) setSelectedGroup(null);
      loadGroups();
      onGroupsChanged();
    } catch (err) {
      console.error('Failed to delete group:', err);
    }
  };

  const saveAssignments = async () => {
    if (!selectedGroup) return;
    try {
      const res = await fetch(`${API}/api/groups/${selectedGroup}/assignments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indices: Array.from(selectedIOs) }),
      });
      if (res.ok) {
        setSaveStatus('Saved!');
        setTimeout(() => setSaveStatus(null), 2000);
        // Update the group count in the left panel without resetting selectedIOs
        setGroups((prev) =>
          prev.map((g) => (g.id === selectedGroup ? { ...g, assignments: Array.from(selectedIOs) } : g)),
        );
        onGroupsChanged();
      }
    } catch (err) {
      console.error('Failed to save assignments:', err);
      setSaveStatus('Error!');
    }
  };

  const toggleIO = (id: number) => {
    setSelectedIOs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const activeGroup = groups.find((g) => g.id === selectedGroup);

  // Track which other groups each IO belongs to (for display, not blocking)
  const otherGroupNames = new Map<number, string[]>();
  groups.forEach((g) => {
    if (g.id !== selectedGroup) {
      g.assignments.forEach((idx) => {
        const names = otherGroupNames.get(idx) || [];
        names.push(g.name);
        otherGroupNames.set(idx, names);
      });
    }
  });

  // Derive auto groups from ioItems
  const autoGroups = new Map<string, IOItem[]>();
  ioItems.forEach((item) => {
    if (item.autoGroup) {
      const list = autoGroups.get(item.autoGroup) || [];
      list.push(item);
      autoGroups.set(item.autoGroup, list);
    }
  });

  const isAutoGroupSelected = selectedGroup?.startsWith('auto:');
  const selectedAutoGroup = isAutoGroupSelected ? selectedGroup!.slice(5) : null;
  const autoGroupItems = selectedAutoGroup ? autoGroups.get(selectedAutoGroup) || [] : [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 700,
          height: '50vh',
          background: 'var(--mh-surface)',
          border: '1px solid var(--mh-border)',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--mh-border)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--mh-mono)',
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--mh-accent)',
              letterSpacing: '0.04em',
            }}
          >
            {direction === 'output' ? 'Output' : 'Input'} Groups
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--mh-text-muted)',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Left: Group list */}
          <div
            style={{
              width: 260,
              borderRight: '1px solid var(--mh-border)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
              {/* Auto groups (read-only) */}
              {autoGroups.size > 0 && (
                <>
                  <div
                    style={{
                      padding: '4px 12px 2px',
                      fontSize: 9,
                      fontFamily: 'var(--mh-mono)',
                      color: 'var(--mh-text-muted)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Auto Groups
                  </div>
                  {Array.from(autoGroups.entries()).map(([name, items]) => {
                    const ov = autoGroupOverrides[name];
                    return (
                      <div
                        key={`auto:${name}`}
                        onClick={() => {
                          setSelectedGroup(`auto:${name}`);
                          setSelectedIOs(new Set());
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 12px',
                          cursor: 'pointer',
                          background: selectedGroup === `auto:${name}` ? 'var(--mh-surface2)' : 'transparent',
                          fontSize: 14,
                          color: selectedGroup === `auto:${name}` ? 'var(--mh-text)' : 'var(--mh-text-dim)',
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            flexShrink: 0,
                            background: ov?.color || 'var(--mh-text-muted)',
                          }}
                        />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ov?.name || name}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--mh-mono)',
                            fontSize: 11,
                            color: 'var(--mh-text-muted)',
                          }}
                        >
                          {items.length}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
              {/* Custom groups */}
              {groups.length > 0 && (
                <div
                  style={{
                    padding: `${autoGroups.size > 0 ? '8px' : '4px'} 12px 2px`,
                    fontSize: 9,
                    fontFamily: 'var(--mh-mono)',
                    color: 'var(--mh-text-muted)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  Custom Groups
                </div>
              )}
              {groups.map((g) => (
                <div
                  key={g.id}
                  onClick={() => selectGroup(g.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    background: selectedGroup === g.id ? 'var(--mh-surface2)' : 'transparent',
                    fontSize: 14,
                    color: selectedGroup === g.id ? 'var(--mh-text)' : 'var(--mh-text-dim)',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      flexShrink: 0,
                      background: g.color,
                    }}
                  />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g.name}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--mh-mono)',
                      fontSize: 11,
                      color: 'var(--mh-text-muted)',
                    }}
                  >
                    {g.assignments.length}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteGroup(g.id);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--mh-text-muted)',
                      fontSize: 11,
                      cursor: 'pointer',
                      padding: '0 2px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            {/* Create group */}
            <div
              style={{
                padding: '8px 12px',
                borderTop: '1px solid var(--mh-border)',
                display: 'flex',
                gap: 4,
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', gap: 6 }}>
                {PRESET_COLORS.map((c) => (
                  <div
                    key={c}
                    onClick={() => setNewColor(c)}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      background: c,
                      cursor: 'pointer',
                      border: newColor === c ? '2px solid var(--mh-text)' : '2px solid transparent',
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Group name"
                  onKeyDown={(e) => e.key === 'Enter' && createGroup()}
                  style={{
                    flex: 1,
                    background: 'var(--mh-bg)',
                    border: '1px solid var(--mh-border)',
                    borderRadius: 4,
                    padding: '6px 8px',
                    color: 'var(--mh-text)',
                    fontSize: 13,
                    fontFamily: 'var(--mh-font)',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={createGroup}
                  style={{
                    background: 'rgba(0,229,160,0.1)',
                    border: '1px solid rgba(0,229,160,0.3)',
                    borderRadius: 4,
                    padding: '4px 10px',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--mh-accent)',
                    cursor: 'pointer',
                    fontFamily: 'var(--mh-font)',
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Right: IO assignment */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {isAutoGroupSelected && selectedAutoGroup ? (
              <>
                <div
                  style={{
                    padding: '8px 14px',
                    borderBottom: '1px solid var(--mh-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      value={autoGroupOverrides[selectedAutoGroup]?.name ?? selectedAutoGroup}
                      onChange={(e) => onAutoGroupOverride?.(selectedAutoGroup, { name: e.target.value })}
                      style={{
                        flex: 1,
                        background: 'var(--mh-bg)',
                        border: '1px solid var(--mh-border)',
                        borderRadius: 4,
                        padding: '5px 8px',
                        color: 'var(--mh-text)',
                        fontSize: 13,
                        fontFamily: 'var(--mh-font)',
                        fontWeight: 600,
                        outline: 'none',
                      }}
                    />
                    {autoGroupOverrides[selectedAutoGroup]?.name && (
                      <button
                        onClick={() => onAutoGroupOverride?.(selectedAutoGroup, { name: undefined })}
                        title="Reset name"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--mh-text-muted)',
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        reset
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {PRESET_COLORS.map((c) => (
                      <div
                        key={c}
                        onClick={() => onAutoGroupOverride?.(selectedAutoGroup, { color: c })}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 3,
                          background: c,
                          cursor: 'pointer',
                          border:
                            autoGroupOverrides[selectedAutoGroup]?.color === c
                              ? '2px solid var(--mh-text)'
                              : '2px solid transparent',
                        }}
                      />
                    ))}
                    {autoGroupOverrides[selectedAutoGroup]?.color && (
                      <button
                        onClick={() => onAutoGroupOverride?.(selectedAutoGroup, { color: undefined })}
                        title="Reset color"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--mh-text-muted)',
                          fontSize: 11,
                          cursor: 'pointer',
                          marginLeft: 4,
                        }}
                      >
                        reset
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
                  {autoGroupItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '5px 14px',
                        fontSize: 13,
                        color: 'var(--mh-text-dim)',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--mh-mono)',
                          fontSize: 11,
                          color: 'var(--mh-text-muted)',
                          width: 28,
                          textAlign: 'right',
                        }}
                      >
                        {item.id}
                      </span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : activeGroup ? (
              <>
                <div
                  style={{
                    padding: '8px 14px',
                    borderBottom: '1px solid var(--mh-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--mh-text-dim)' }}>
                    Select {direction}s for <strong style={{ color: activeGroup.color }}>{activeGroup.name}</strong>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {saveStatus && (
                      <span style={{ fontSize: 12, color: 'var(--mh-accent)', fontWeight: 600 }}>{saveStatus}</span>
                    )}
                    <button
                      onClick={saveAssignments}
                      style={{
                        background: 'rgba(0,229,160,0.1)',
                        border: '1px solid rgba(0,229,160,0.3)',
                        borderRadius: 4,
                        padding: '5px 12px',
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--mh-accent)',
                        cursor: 'pointer',
                        fontFamily: 'var(--mh-font)',
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
                  {ioItems.map((item) => {
                    const isSelected = selectedIOs.has(item.id);
                    const others = otherGroupNames.get(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleIO(item.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '5px 14px',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--mh-accent-dim)' : 'transparent',
                          fontSize: 13,
                          color: isSelected ? 'var(--mh-text)' : 'var(--mh-text-dim)',
                        }}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            flexShrink: 0,
                            border: isSelected ? `2px solid ${activeGroup.color}` : '2px solid var(--mh-border)',
                            background: isSelected ? activeGroup.color : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected && <span style={{ color: '#000', fontSize: 11, fontWeight: 900 }}>✓</span>}
                        </div>
                        <span
                          style={{
                            fontFamily: 'var(--mh-mono)',
                            fontSize: 11,
                            color: 'var(--mh-text-muted)',
                            width: 28,
                            textAlign: 'right',
                          }}
                        >
                          {item.id}
                        </span>
                        <span>{item.label}</span>
                        {item.sourceName && (
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--mh-accent)',
                              fontFamily: 'var(--mh-mono)',
                              opacity: 0.7,
                            }}
                          >
                            → {item.sourceName}
                          </span>
                        )}
                        {others && (
                          <span
                            style={{
                              fontSize: 9,
                              color: 'var(--mh-text-muted)',
                              fontFamily: 'var(--mh-mono)',
                              marginLeft: 'auto',
                            }}
                          >
                            {others.join(', ')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--mh-text-muted)',
                  fontSize: 14,
                }}
              >
                Select or create a group
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
