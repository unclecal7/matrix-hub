import { useMemo } from 'react';
import type { DeviceState } from '../stores/useDeviceStore';

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

export interface IOItem {
  id: number;
  label: string;
  group: string;
  groups: string[];
  color: string;
  _autoKey?: string;
  locked?: boolean;
}

export function useGroupFiltering(
  activeDevice: DeviceState | null,
  customGroupMap: Map<string, Map<number, { group: string; color: string }[]>>,
  autoGroupOverrides: Record<string, { name?: string; color?: string }>,
  search: string,
  activeOutputGroups: Set<string>,
  activeInputGroups: Set<string>,
) {
  const inputsArray: IOItem[] = useMemo(() => {
    if (!activeDevice) return [];
    const inputCustom = customGroupMap.get('input');
    return Object.entries(activeDevice.inputs)
      .map(([id, data]) => {
        const numId = parseInt(id);
        const customList = inputCustom?.get(numId);
        const autoKey = data.group || 'Default Inputs';
        const override = autoGroupOverrides[autoKey];
        const autoGroupName = override?.name || autoKey;
        const customNames = customList ? customList.map((c) => c.group) : [];
        const groups = customNames.length > 0 ? [...customNames, autoGroupName] : [autoGroupName];
        return {
          id: numId,
          label: data.label,
          group: autoGroupName,
          groups,
          color: customList?.[0]?.color || override?.color || data.color || stringToColor(autoKey),
          _autoKey: autoKey,
        };
      })
      .sort((a, b) => {
        const groupOrder: Record<string, number> = {
          'Physical Inputs': 0,
          'ME Outputs': 1,
          Utility: 2,
          'Media Players': 3,
          SuperSource: 4,
          Other: 5,
        };
        const ka = a._autoKey || a.group;
        const kb = b._autoKey || b.group;
        const ga = groupOrder[ka] ?? 99;
        const gb = groupOrder[kb] ?? 99;
        if (ga !== gb) return ga - gb;
        return a.id - b.id;
      });
  }, [activeDevice?.inputs, customGroupMap, autoGroupOverrides]);

  const outputsArray: IOItem[] = useMemo(() => {
    if (!activeDevice) return [];
    const outputCustom = customGroupMap.get('output');
    return Object.entries(activeDevice.outputs)
      .map(([id, data]) => {
        const numId = parseInt(id);
        const customList = outputCustom?.get(numId);
        const defaultGroup = data.group || 'Default Outputs';
        const customNames = customList ? customList.map((c) => c.group) : [];
        const groups = customNames.length > 0 ? [...customNames, defaultGroup] : [defaultGroup];
        return {
          id: numId,
          label: data.label,
          group: defaultGroup,
          groups,
          color: customList?.[0]?.color || data.color || stringToColor(defaultGroup),
          locked: activeDevice.locks?.[id as any] === 'L' || activeDevice.locks?.[id as any] === 'O',
        };
      })
      .sort((a, b) => a.id - b.id);
  }, [activeDevice?.outputs, activeDevice?.locks, customGroupMap]);

  const inputGroups = useMemo(() => {
    const map = new Map<string, IOItem[]>();
    inputsArray.forEach((item) => {
      for (const g of item.groups) {
        if (!map.has(g)) map.set(g, []);
        map.get(g)!.push(item);
      }
    });
    return map;
  }, [inputsArray]);

  const outputGroups = useMemo(() => {
    const map = new Map<string, IOItem[]>();
    outputsArray.forEach((item) => {
      for (const g of item.groups) {
        if (!map.has(g)) map.set(g, []);
        map.get(g)!.push(item);
      }
    });
    return map;
  }, [outputsArray]);

  const filteredInputs = useMemo(() => {
    let result = inputsArray;
    if (activeInputGroups.size > 0) {
      result = result.filter((i) => i.groups.some((g) => activeInputGroups.has(g)));
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) => i.label.toLowerCase().includes(q) || i.groups.some((g) => g.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [search, inputsArray, activeInputGroups]);

  const filteredOutputs = useMemo(() => {
    let result = outputsArray;
    if (activeOutputGroups.size > 0) {
      result = result.filter((o) => o.groups.some((g) => activeOutputGroups.has(g)));
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) => o.label.toLowerCase().includes(q) || o.groups.some((g) => g.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [search, outputsArray, activeOutputGroups]);

  const visibleRows = useMemo(() => {
    return filteredOutputs.map((item) => ({ type: 'output' as const, ...item }));
  }, [filteredOutputs]);

  return {
    inputsArray,
    outputsArray,
    inputGroups,
    outputGroups,
    filteredInputs,
    filteredOutputs,
    visibleRows,
  };
}
