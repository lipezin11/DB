'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

const DB_NAME = 'ForjaNeuralDB';
const STORE_NAME = 'gallery';

function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e: any) => resolve(e.target.result);
    request.onerror = (e) => reject(e);
  });
}

function saveToDB(images: GeneratedImage[]) {
  if (typeof window === 'undefined') return;
  initDB().then(db => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear(); 
    images.forEach(img => store.add(img));
  }).catch(e => console.error('IndexedDB save error', e));
}

function loadFromDB(): Promise<GeneratedImage[]> {
  if (typeof window === 'undefined') return Promise.resolve([]);
  return new Promise((resolve) => {
    initDB().then(db => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = (e: any) => {
         const results = e.target.result as GeneratedImage[];
         results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
         resolve(results);
      };
    }).catch(() => resolve([]));
  });
}

export type GeneratedImage = {
  id: string;
  url: string;
  prompt: string;
  isVertical: boolean;
  dimensions: string;
  appType: 'design' | 'ref' | 'bg' | 'product' | 'art';
  date: string;
  // Photoshop Killer — isolated layer assets
  subjectLayerUrl?: string;     // Subject on white/transparent background
  backgroundLayerUrl?: string;  // Background with subject removed
  hasLayers?: boolean;          // Whether layers have been extracted
};

interface AppContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  generatedImages: GeneratedImage[];
  addGeneratedImage: (img: GeneratedImage) => void;
  updateGeneratedImage: (id: string, updates: Partial<GeneratedImage>) => void;
  removeGeneratedImage: (id: string) => void;
  clearGeneratedImages: () => void;
  isGeneratingGlobal: boolean;
  setIsGeneratingGlobal: (val: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKeyState] = useState('');
  const [generatedImages, setGeneratedImagesState] = useState<GeneratedImage[]>([]);
  const [isGeneratingGlobal, setIsGeneratingGlobal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('designBuilderApiKey');
      if (savedKey) setApiKeyState(savedKey);
      
      loadFromDB().then((images) => {
        if (images && images.length > 0) {
          setGeneratedImagesState(images);
        }
      });
    }
  }, []);

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    if (typeof window !== 'undefined') localStorage.setItem('designBuilderApiKey', key);
  };

  const addGeneratedImage = (img: GeneratedImage) => {
    setGeneratedImagesState(prev => {
      const next = [img, ...prev];
      saveToDB(next);
      return next;
    });
  };

  const updateGeneratedImage = (id: string, updates: Partial<GeneratedImage>) => {
    setGeneratedImagesState(prev => {
      const next = prev.map(img => img.id === id ? { ...img, ...updates } : img);
      saveToDB(next);
      return next;
    });
  };

  const removeGeneratedImage = (id: string) => {
    setGeneratedImagesState(prev => {
      const next = prev.filter(i => i.id !== id);
      saveToDB(next);
      return next;
    });
  };

  const clearGeneratedImages = () => {
    setGeneratedImagesState([]);
    if (typeof window !== 'undefined') {
       initDB().then(db => {
         const tx = db.transaction(STORE_NAME, 'readwrite');
         tx.objectStore(STORE_NAME).clear();
       });
    }
  };

  return (
    <AppContext.Provider value={{ 
      apiKey, setApiKey, generatedImages, addGeneratedImage, 
      updateGeneratedImage, removeGeneratedImage, clearGeneratedImages,
      isGeneratingGlobal, setIsGeneratingGlobal 
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
