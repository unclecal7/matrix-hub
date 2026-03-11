import { create } from 'zustand';
import type { DeviceState } from '../../shared/types';

export type { DeviceState };

interface AppState {
  devices: Record<string, DeviceState>;
  activeDeviceId: string | null;

  // Actions
  setDevices: (devices: DeviceState[]) => void;
  setActiveDevice: (id: string) => void;
  updateDeviceStatus: (id: string, status: DeviceState['status']) => void;
  updateRouting: (id: string, destination: number, source: number) => void;
  updateLabel: (id: string, direction: 'input' | 'output', index: number, label: string) => void;
  updateDevice: (device: DeviceState) => void;
  addDevice: (device: DeviceState) => void;
  removeDevice: (id: string) => void;
}

export const useDeviceStore = create<AppState>((set) => ({
  devices: {},
  activeDeviceId: null,

  setDevices: (deviceList) =>
    set((state) => {
      const devicesMap: Record<string, DeviceState> = {};
      deviceList.forEach((d) => (devicesMap[d.id] = d));
      return {
        devices: devicesMap,
        activeDeviceId: state.activeDeviceId || (deviceList.length > 0 ? deviceList[0].id : null),
      };
    }),

  setActiveDevice: (id) => set({ activeDeviceId: id }),

  updateDeviceStatus: (id, status) =>
    set((state) => {
      const device = state.devices[id];
      if (!device) return state;
      return {
        devices: { ...state.devices, [id]: { ...device, status } },
      };
    }),

  updateRouting: (id, destination, source) =>
    set((state) => {
      const device = state.devices[id];
      if (!device) return state;
      return {
        devices: {
          ...state.devices,
          [id]: {
            ...device,
            routing: { ...device.routing, [destination]: source },
          },
        },
      };
    }),

  updateDevice: (device) =>
    set((state) => ({
      devices: { ...state.devices, [device.id]: device },
    })),

  addDevice: (device) =>
    set((state) => ({
      devices: { ...state.devices, [device.id]: device },
    })),

  removeDevice: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.devices;
      return {
        devices: rest,
        activeDeviceId: state.activeDeviceId === id ? Object.keys(rest)[0] || null : state.activeDeviceId,
      };
    }),

  updateLabel: (id, direction, index, label) =>
    set((state) => {
      const device = state.devices[id];
      if (!device) return state;

      if (direction === 'input') {
        return {
          devices: {
            ...state.devices,
            [id]: {
              ...device,
              inputs: { ...device.inputs, [index]: { ...device.inputs[index], label } },
            },
          },
        };
      } else {
        return {
          devices: {
            ...state.devices,
            [id]: {
              ...device,
              outputs: { ...device.outputs, [index]: { ...device.outputs[index], label } },
            },
          },
        };
      }
    }),
}));
