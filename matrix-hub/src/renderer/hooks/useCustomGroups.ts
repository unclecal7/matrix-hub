import { useState, useEffect, useMemo } from 'react';

export function useCustomGroups(activeDeviceId: string | null, groupVersion: number) {
  const [customGroups, setCustomGroups] = useState<any[]>([]);

  useEffect(() => {
    if (!activeDeviceId) return;
    fetch(`/api/devices/${activeDeviceId}/groups`)
      .then((r) => r.json())
      .then(setCustomGroups)
      .catch(() => setCustomGroups([]));
  }, [activeDeviceId, groupVersion]);

  const customGroupMap = useMemo(() => {
    const map = new Map<string, Map<number, { group: string; color: string }[]>>();
    for (const g of customGroups) {
      if (!map.has(g.direction)) map.set(g.direction, new Map());
      const dirMap = map.get(g.direction)!;
      for (const idx of g.assignments) {
        const list = dirMap.get(idx) || [];
        list.push({ group: g.name, color: g.color });
        dirMap.set(idx, list);
      }
    }
    return map;
  }, [customGroups]);

  return { customGroups, customGroupMap };
}
