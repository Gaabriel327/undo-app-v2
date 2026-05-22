import { useState, useEffect } from 'react';
import { ApiService } from '../services/ApiService';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [morningTime, setMorningTime] = useState('08:00');
  const [eveningTime, setEveningTime] = useState('20:00');

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (ok) {
      ApiService.getPushStatus().then((s) => {
        setSubscribed(s.subscribed);
        if (s.morningTime) setMorningTime(s.morningTime);
        if (s.eveningTime) setEveningTime(s.eveningTime);
      }).catch(() => {});
    }
  }, []);

  const subscribe = async (morning = morningTime, evening = eveningTime) => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setLoading(false);
        return false;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const { key } = await ApiService.getVapidPublicKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      await ApiService.subscribePush(sub.toJSON(), morning, evening);
      setSubscribed(true);
      setMorningTime(morning);
      setEveningTime(evening);
      setLoading(false);
      return true;
    } catch (e) {
      console.error('Push subscribe error:', e);
      setLoading(false);
      return false;
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await ApiService.unsubscribePush(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      console.error('Push unsubscribe error:', e);
    }
    setLoading(false);
  };

  const updateTimes = async (morning: string, evening: string) => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await ApiService.subscribePush(sub.toJSON(), morning, evening);
        setMorningTime(morning);
        setEveningTime(evening);
      }
    } catch (e) {
      console.error('Update times error:', e);
    }
    setLoading(false);
  };

  return { supported, subscribed, loading, morningTime, eveningTime, subscribe, unsubscribe, updateTimes };
}
