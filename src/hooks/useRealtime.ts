import { useEffect, useRef } from 'react';
import { useAlarmStore } from '@/store/useAlarmStore';
import { useGlobalStore } from '@/store/useGlobalStore';

export const useRealtime = () => {
  const { startRealtimeUpdate, fetchDevices } = useAlarmStore();
  const { fetchCabins, fetchStatistics } = useGlobalStore();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchCabins();
    fetchDevices();
    fetchStatistics();
    cleanupRef.current = startRealtimeUpdate();

    const statsInterval = setInterval(() => {
      fetchStatistics();
    }, 30000);

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      clearInterval(statsInterval);
    };
  }, []);
};
