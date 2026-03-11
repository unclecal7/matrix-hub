import { useCallback } from 'react';
import { ChevronIcon } from './Icons';
import type { IOItem } from '../hooks/useGroupFiltering';

interface GroupSidebarProps {
  outputGroups: Map<string, IOItem[]>;
  inputGroups: Map<string, IOItem[]>;
  activeOutputGroups: Set<string>;
  setActiveOutputGroups: (fn: (prev: Set<string>) => Set<string>) => void;
  activeInputGroups: Set<string>;
  setActiveInputGroups: (fn: (prev: Set<string>) => Set<string>) => void;
  collapsedSidebarSections: Set<unknown>;
  toggleSidebarSection: (name: string) => void;
  customGroups: any[];
  setGroupEditor: (dir: 'input' | 'output' | null) => void;
}

export default function GroupSidebar({
  outputGroups,
  inputGroups,
  activeOutputGroups,
  setActiveOutputGroups,
  activeInputGroups,
  setActiveInputGroups,
  collapsedSidebarSections,
  toggleSidebarSection,
  customGroups,
  setGroupEditor,
}: GroupSidebarProps) {
  const toggleOutputGroup = useCallback(
    (name: string) => {
      setActiveOutputGroups((prev) => {
        const next = new Set(prev);
        next.has(name) ? next.delete(name) : next.add(name);
        return next;
      });
    },
    [setActiveOutputGroups],
  );

  const toggleInputGroup = useCallback(
    (name: string) => {
      setActiveInputGroups((prev) => {
        const next = new Set(prev);
        next.has(name) ? next.delete(name) : next.add(name);
        return next;
      });
    },
    [setActiveInputGroups],
  );

  const outputExpanded = !collapsedSidebarSections.has('__output_groups__');
  const inputExpanded = !collapsedSidebarSections.has('__input_groups__');
  const autoExpanded = !collapsedSidebarSections.has('__auto_generated__');
  const customGroupNames = new Set(customGroups.filter((g) => g.direction === 'input').map((g) => g.name));

  const autoEntries: [string, IOItem[]][] = [];
  const customEntries: [string, IOItem[]][] = [];
  for (const [name, items] of inputGroups.entries()) {
    if (customGroupNames.has(name)) customEntries.push([name, items]);
    else autoEntries.push([name, items]);
  }

  return (
    <div className="mh-sidebar">
      <div
        className="mh-sidebar-title"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => toggleSidebarSection('__output_groups__')}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChevronIcon collapsed={!outputExpanded} />
          Output Groups
        </span>
        <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
          {activeOutputGroups.size > 0 && (
            <button
              onClick={() => setActiveOutputGroups(() => new Set())}
              style={{
                background: 'transparent',
                border: '1px solid rgba(244,63,94,0.3)',
                borderRadius: 3,
                color: 'var(--mh-danger)',
                fontSize: 8,
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: '14px',
                fontFamily: 'var(--mh-mono)',
              }}
            >
              CLEAR
            </button>
          )}
          <button
            onClick={() => setGroupEditor('output')}
            style={{
              background: 'transparent',
              border: '1px solid var(--mh-border)',
              borderRadius: 3,
              color: 'var(--mh-text-muted)',
              fontSize: 9,
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: '14px',
            }}
          >
            +
          </button>
        </div>
      </div>
      {outputExpanded && Array.from(outputGroups.entries()).map(([name, items]) => (
        <div
          key={name}
          className={`mh-group-item ${activeOutputGroups.has(name) ? 'active' : ''}`}
          onClick={() => toggleOutputGroup(name)}
        >
          <div className="mh-group-dot" style={{ background: items[0].color }} />
          <span style={{ fontSize: 11 }}>{name}</span>
          <span className="mh-group-count">{items.length}</span>
        </div>
      ))}

      <div
        className="mh-sidebar-title"
        style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => toggleSidebarSection('__input_groups__')}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChevronIcon collapsed={!inputExpanded} />
          Input Groups
        </span>
        <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
          {activeInputGroups.size > 0 && (
            <button
              onClick={() => setActiveInputGroups(() => new Set())}
              style={{
                background: 'transparent',
                border: '1px solid rgba(244,63,94,0.3)',
                borderRadius: 3,
                color: 'var(--mh-danger)',
                fontSize: 8,
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: '14px',
                fontFamily: 'var(--mh-mono)',
              }}
            >
              CLEAR
            </button>
          )}
          <button
            onClick={() => setGroupEditor('input')}
            style={{
              background: 'transparent',
              border: '1px solid var(--mh-border)',
              borderRadius: 3,
              color: 'var(--mh-text-muted)',
              fontSize: 9,
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: '14px',
            }}
          >
            +
          </button>
        </div>
      </div>

      {inputExpanded && autoEntries.length > 0 && (
        <>
          <div
            className="mh-group-item"
            onClick={() => toggleSidebarSection('__auto_generated__')}
            style={{ opacity: 0.7 }}
          >
            <span style={{ fontSize: 10, fontFamily: 'var(--mh-mono)', letterSpacing: '0.05em' }}>Auto Generated</span>
            <span className="mh-group-count">{autoEntries.reduce((s, [, i]) => s + i.length, 0)}</span>
            <ChevronIcon collapsed={!autoExpanded} />
          </div>
          {autoExpanded &&
            autoEntries.map(([name, items]) => (
              <div
                key={name}
                className={`mh-group-item ${activeInputGroups.has(name) ? 'active' : ''}`}
                onClick={() => toggleInputGroup(name)}
                style={{ paddingLeft: 20 }}
              >
                <div className="mh-group-dot" style={{ background: items[0].color }} />
                <span style={{ fontSize: 11 }}>{name}</span>
                <span className="mh-group-count">{items.length}</span>
              </div>
            ))}
        </>
      )}
      {inputExpanded && customEntries.map(([name, items]) => (
        <div
          key={name}
          className={`mh-group-item ${activeInputGroups.has(name) ? 'active' : ''}`}
          onClick={() => toggleInputGroup(name)}
        >
          <div className="mh-group-dot" style={{ background: items[0].color }} />
          <span style={{ fontSize: 11 }}>{name}</span>
          <span className="mh-group-count">{items.length}</span>
        </div>
      ))}
    </div>
  );
}
