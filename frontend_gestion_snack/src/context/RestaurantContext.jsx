import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'restaurant_settings';

export const DEFAULT_RESTAURANT = {
  name: 'Snack Tiegni Bernard',
  address: 'Rue du Marché aux Herbes 42, 1000 Bruxelles, Belgique',
  phone: '+32 2 123 45 67',
  email: 'contact@snack-tiegni.be',
  description: 'Votre restaurant au cœur de Bruxelles, Belgique',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Rue+du+Marché+aux+Herbes+42+1000+Bruxelles',
  mapEmbedUrl: 'https://www.openstreetmap.org/export/embed.html?bbox=4.330%2C50.835%2C4.370%2C50.865&layer=mapnik&marker=50.8503%2C4.3517',
  facebook: '',
  instagram: '',
  hours: {
    weekdayOpen: '10:00',
    weekdayClose: '22:00',
    sundayOpen: '12:00',
    sundayClose: '21:00',
  },
};

const RestaurantContext = createContext(null);

const parseTime = (timeStr) => {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  return h + (m || 0) / 60;
};

export const computeIsOpen = (hours) => {
  const now = new Date();
  const day = now.getDay();
  const h = now.getHours() + now.getMinutes() / 60;
  const { weekdayOpen, weekdayClose, sundayOpen, sundayClose } = hours;
  if (day === 0) return h >= parseTime(sundayOpen) && h < parseTime(sundayClose);
  return h >= parseTime(weekdayOpen) && h < parseTime(weekdayClose);
};

const loadFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_RESTAURANT, ...parsed, hours: { ...DEFAULT_RESTAURANT.hours, ...parsed.hours } };
    }
  } catch { /* ignore */ }
  return DEFAULT_RESTAURANT;
};

export const RestaurantProvider = ({ children }) => {
  const [info, setInfo] = useState(loadFromStorage);

  // Reactive open/closed status — updated every second
  const [openNow, setOpenNow] = useState(() => computeIsOpen(info.hours));

  // Ref always points to latest info so the interval closure stays fresh
  const infoRef = useRef(info);
  useEffect(() => { infoRef.current = info; }, [info]);

  // Single interval that drives all open/closed badges across the app
  useEffect(() => {
    const tick = () => setOpenNow(computeIsOpen(infoRef.current.hours));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // Immediate re-evaluation whenever hours change (after admin saves)
  useEffect(() => {
    setOpenNow(computeIsOpen(info.hours));
  }, [info.hours]);

  // Cross-tab synchronization: if admin saves on another tab, update this tab
  useEffect(() => {
    const handle = (e) => {
      if (e.key !== STORAGE_KEY) return;
      if (e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setInfo({ ...DEFAULT_RESTAURANT, ...parsed, hours: { ...DEFAULT_RESTAURANT.hours, ...parsed.hours } });
        } catch { /* ignore */ }
      } else {
        // Key was removed (resetInfo on another tab)
        setInfo(DEFAULT_RESTAURANT);
      }
    };
    window.addEventListener('storage', handle);
    return () => window.removeEventListener('storage', handle);
  }, []);

  const updateInfo = useCallback((patch) => {
    setInfo(prev => {
      const next = {
        ...prev,
        ...patch,
        hours: { ...prev.hours, ...(patch.hours || {}) },
      };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const resetInfo = useCallback(() => {
    setInfo(DEFAULT_RESTAURANT);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  // Kept for backward compatibility — prefer using openNow from context
  const isOpenNow = useCallback(() => computeIsOpen(info.hours), [info.hours]);

  return (
    <RestaurantContext.Provider value={{ info, updateInfo, resetInfo, isOpenNow, openNow }}>
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error('useRestaurant must be used within RestaurantProvider');
  return ctx;
};

export default RestaurantContext;
