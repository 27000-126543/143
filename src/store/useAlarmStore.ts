import { create } from 'zustand';
import type { Alarm, SensorData, Device } from '@/types/models';
import { api } from '@/services/api';

interface AlarmState {
  alarms: Alarm[];
  sensorData: SensorData[];
  devices: Device[];
  lastUpdate: string | null;
  loading: boolean;
  fetchAlarms: () => Promise<void>;
  fetchSensorData: () => Promise<void>;
  fetchDevices: () => Promise<void>;
  startRealtimeUpdate: () => () => void;
  acknowledgeAlarm: (alarmId: string, operatorId: string, operatorName: string) => Promise<void>;
  escalateAlarm: (alarmId: string, escalatedTo: string, escalatedToName: string) => Promise<void>;
  resolveAlarm: (alarmId: string, operatorId: string, resolution: string) => Promise<void>;
  controlDevice: (deviceId: string, action: 'start' | 'stop', operatorId: string, reason: string) => Promise<void>;
}

export const useAlarmStore = create<AlarmState>((set, get) => ({
  alarms: [],
  sensorData: [],
  devices: [],
  lastUpdate: null,
  loading: false,

  fetchAlarms: async () => {
    set({ loading: true });
    try {
      const alarms = await api.getAlarms();
      set({ alarms, loading: false });
    } catch (error) {
      set({ loading: false });
      console.error('Failed to fetch alarms:', error);
    }
  },

  fetchSensorData: async () => {
    try {
      const sensorData = await api.getSensorData();
      set({ sensorData, lastUpdate: new Date().toISOString() });
    } catch (error) {
      console.error('Failed to fetch sensor data:', error);
    }
  },

  fetchDevices: async () => {
    try {
      const devices = await api.getDevices();
      set({ devices });
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    }
  },

  startRealtimeUpdate: () => {
    get().fetchSensorData();
    get().fetchAlarms();
    get().fetchDevices();

    const interval = setInterval(() => {
      get().fetchSensorData();
      get().fetchAlarms();
    }, 3000);

    return () => clearInterval(interval);
  },

  acknowledgeAlarm: async (alarmId: string, operatorId: string, operatorName: string) => {
    try {
      const updatedAlarm = await api.acknowledgeAlarm(alarmId, operatorId, operatorName);
      set((state) => ({
        alarms: state.alarms.map((a) => (a.id === alarmId ? updatedAlarm : a)),
      }));
    } catch (error) {
      console.error('Failed to acknowledge alarm:', error);
      throw error;
    }
  },

  escalateAlarm: async (alarmId: string, escalatedTo: string, escalatedToName: string) => {
    try {
      const updatedAlarm = await api.escalateAlarm(alarmId, escalatedTo, escalatedToName);
      set((state) => ({
        alarms: state.alarms.map((a) => (a.id === alarmId ? updatedAlarm : a)),
      }));
    } catch (error) {
      console.error('Failed to escalate alarm:', error);
      throw error;
    }
  },

  resolveAlarm: async (alarmId: string, operatorId: string, resolution: string) => {
    try {
      const updatedAlarm = await api.resolveAlarm(alarmId, operatorId, resolution);
      set((state) => ({
        alarms: state.alarms.map((a) => (a.id === alarmId ? updatedAlarm : a)),
      }));
    } catch (error) {
      console.error('Failed to resolve alarm:', error);
      throw error;
    }
  },

  controlDevice: async (deviceId: string, action: 'start' | 'stop', operatorId: string, reason: string) => {
    try {
      await api.controlDevice(deviceId, action, operatorId, reason);
      set((state) => ({
        devices: state.devices.map((d) =>
          d.id === deviceId ? { ...d, status: action === 'start' ? 'running' : 'stopped' } : d
        ),
      }));
    } catch (error) {
      console.error('Failed to control device:', error);
      throw error;
    }
  },
}));
