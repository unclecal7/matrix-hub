import { useState, useCallback, useRef } from 'react';
import { useDeviceStore } from './stores/useDeviceStore';
import { useWebSocket } from './hooks/useWebSocket';
import { useCustomGroups } from './hooks/useCustomGroups';
import { useGroupFiltering } from './hooks/useGroupFiltering';
import SettingsTab from './components/SettingsTab';
import GroupEditor from './components/GroupEditor';
import TitleBar from './components/TitleBar';
import Toolbar from './components/Toolbar';
import GroupSidebar from './components/GroupSidebar';
import RoutingGrid from './components/RoutingGrid';
import StatusBar from './components/StatusBar';

export default function MatrixHub() {
  const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
  const { sendCommand } = useWebSocket(wsUrl);

  const devices = useDeviceStore((state) => state.devices);
  const activeDeviceId = useDeviceStore((state) => state.activeDeviceId);
  const setActiveDevice = useDeviceStore((state) => state.setActiveDevice);
  const activeDevice = activeDeviceId ? devices[activeDeviceId] : null;

  const [activeTab, setActiveTab] = useState('videohub');
  const [search, setSearch] = useState('');
  const [showLocks, setShowLocks] = useState(true);
  const [showPresets, setShowPresets] = useState(false);
  const [groupEditor, setGroupEditor] = useState<'input' | 'output' | null>(null);
  const [groupVersion, setGroupVersion] = useState(0);
  const [activeOutputGroups, setActiveOutputGroups] = useState<Set<string>>(new Set());
  const [activeInputGroups, setActiveInputGroups] = useState<Set<string>>(new Set());
  const [collapsedSidebarSections, setCollapsedSidebarSections] = useState(new Set());
  const [autoGroupOverrides, setAutoGroupOverrides] = useState<Record<string, { name?: string; color?: string }>>(
    () => {
      try {
        return JSON.parse(localStorage.getItem('autoGroupOverrides') || '{}');
      } catch {
        return {};
      }
    },
  );

  const updateAutoGroupOverride = useCallback((key: string, override: { name?: string; color?: string }) => {
    setAutoGroupOverrides((prev) => {
      const next = { ...prev, [key]: { ...prev[key], ...override } };
      localStorage.setItem('autoGroupOverrides', JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleSidebarSection = useCallback((name: string) => {
    setCollapsedSidebarSections((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  const isOffline = activeDevice?.status === 'disconnected' || !activeDevice;
  const routing = activeDevice?.routing || {};

  const { customGroups, customGroupMap } = useCustomGroups(activeDeviceId, groupVersion);
  const { inputsArray, outputsArray, inputGroups, outputGroups, filteredInputs, filteredOutputs, visibleRows } =
    useGroupFiltering(activeDevice, customGroupMap, autoGroupOverrides, search, activeOutputGroups, activeInputGroups);

  const handleRoute = useCallback(
    (outId: number, inId: number) => {
      if (activeDeviceId) {
        sendCommand(`/api/devices/${activeDeviceId}/route`, {
          destination: outId,
          source: inId,
        });
      }
    },
    [activeDeviceId, sendCommand],
  );

  const randomizeRouting = useCallback(() => {
    if (!activeDeviceId) return;
    outputsArray.forEach((out) => {
      const randomIn = inputsArray[Math.floor(Math.random() * inputsArray.length)];
      sendCommand(`/api/devices/${activeDeviceId}/route`, {
        destination: out.id,
        source: randomIn.id,
      });
    });
  }, [activeDeviceId, outputsArray, inputsArray, sendCommand]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const recallPreset = useCallback(
    (index: number) => {
      if (!activeDeviceId) return;
      fetch(`/api/devices/${activeDeviceId}/presets`)
        .then((r) => r.json())
        .then((presets: any[]) => {
          if (presets[index]) {
            fetch(`/api/devices/${activeDeviceId}/presets/${presets[index].id}/recall`, {
              method: 'POST',
            }).catch(() => {});
          }
        })
        .catch(() => {});
    },
    [activeDeviceId],
  );

  const activeRoutesCount = Object.keys(routing).length;
  const lockedCount = outputsArray.filter((o) => o.locked).length;

  return (
    <div className="mh-root">
      <TitleBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        devices={devices}
        activeDevice={activeDevice}
        isOffline={isOffline}
        setActiveDevice={setActiveDevice}
      />

      {activeTab === 'settings' && <SettingsTab />}

      {activeTab !== 'settings' && (
        <>
          <Toolbar
            ref={searchInputRef}
            search={search}
            setSearch={setSearch}
            showLocks={showLocks}
            setShowLocks={setShowLocks}
            showPresets={showPresets}
            setShowPresets={setShowPresets}
            activeDeviceId={activeDeviceId}
            onRandomize={randomizeRouting}
          />

          <div className="mh-grid-area">
            <GroupSidebar
              outputGroups={outputGroups}
              inputGroups={inputGroups}
              activeOutputGroups={activeOutputGroups}
              setActiveOutputGroups={setActiveOutputGroups}
              activeInputGroups={activeInputGroups}
              setActiveInputGroups={setActiveInputGroups}
              collapsedSidebarSections={collapsedSidebarSections}
              toggleSidebarSection={toggleSidebarSection}
              customGroups={customGroups}
              setGroupEditor={setGroupEditor}
            />

            <RoutingGrid
              inputs={filteredInputs}
              visibleRows={visibleRows}
              routing={routing}
              showLocks={showLocks}
              isOffline={isOffline}
              outputsArray={outputsArray}
              inputsArray={inputsArray}
              onRoute={handleRoute}
              onSearch={focusSearch}
              onPresetRecall={recallPreset}
            />
          </div>

          <StatusBar
            inputCount={filteredInputs.length}
            outputCount={filteredOutputs.length}
            activeRoutesCount={activeRoutesCount}
            lockedCount={lockedCount}
            activeTab={activeTab}
          />
        </>
      )}

      {groupEditor && (
        <GroupEditor
          deviceId={activeDeviceId}
          direction={groupEditor}
          ioItems={
            groupEditor === 'input'
              ? inputsArray.map((i) => ({ id: i.id, label: i.label, autoGroup: i.group }))
              : outputsArray.map((o) => {
                  const sourceId = routing[o.id];
                  const sourceName =
                    sourceId !== undefined ? inputsArray.find((i) => i.id === sourceId)?.label : undefined;
                  return { id: o.id, label: o.label, sourceName };
                })
          }
          onClose={() => setGroupEditor(null)}
          onGroupsChanged={() => setGroupVersion((v) => v + 1)}
          autoGroupOverrides={autoGroupOverrides}
          onAutoGroupOverride={updateAutoGroupOverride}
        />
      )}
    </div>
  );
}
