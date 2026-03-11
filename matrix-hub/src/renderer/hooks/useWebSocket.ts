import { useEffect, useRef } from 'react';
import { useDeviceStore } from '../stores/useDeviceStore';

export function useWebSocket(url: string) {
  const ws = useRef<WebSocket | null>(null);
  const { setDevices, updateDeviceStatus, updateRouting, updateLabel, updateDevice, addDevice, removeDevice } =
    useDeviceStore();

  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('[WebSocket] Connected');
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'FULL_STATE':
              setDevices(data.devices);
              break;
            case 'DEVICE_STATUS_CHANGED':
              updateDeviceStatus(data.deviceId, data.status);
              break;
            case 'ROUTING_CHANGED':
              updateRouting(data.deviceId, data.destination, data.source);
              break;
            case 'LABELS_CHANGED':
              updateLabel(data.deviceId, data.direction, data.index, data.label);
              break;
            case 'FULL_STATE_UPDATE':
              updateDevice(data.state);
              break;
            case 'DEVICE_ADDED':
              if (data.device) addDevice(data.device);
              break;
            case 'DEVICE_REMOVED':
              if (data.deviceId) removeDevice(data.deviceId);
              break;
          }
        } catch (err) {
          console.error('[WebSocket] Parse error:', err);
        }
      };

      ws.current.onclose = () => {
        console.log('[WebSocket] Disconnected, reconnecting...');
        // Mark all devices disconnected locally if the WS server drops
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
      }
    };
  }, [url, setDevices, updateDeviceStatus, updateRouting, updateLabel, updateDevice, addDevice, removeDevice]);

  const sendCommand = (endpoint: string, payload: any) => {
    // We use the REST API for sending commands, as specified in the architecture doc
    fetch(`${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err) => console.error('[API] Command failed:', err));
  };

  return { sendCommand };
}
