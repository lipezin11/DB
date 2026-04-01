import { useState } from 'react';

export const initialUniversalData = {
  // SUJEITO
  subject: {
    photos: [] as string[],
    count: '1',
    gender: 'masculino',
    description: '',
    position: 'centro',
  },
  
  // DIMENSÕES
  dimensions: {
    format: '1:1',
  },

  // TEXTO
  text: {
    active: false,
    headline: '',
    subheadline: '',
    cta: '',
    position: 'esquerda',
  },

  // PROJETO & CENÁRIO
  context: {
    niche: '',
    environment: '',
    useScenarioPhoto: false,
    scenarioPhotos: [] as string[],
  },

  // CORES & ILUMINAÇÃO
  lighting: {
    ambient: '#0f172a',
    rim: '#ffffff',
    fill: '#4f46e5',
  },

  // COMPOSIÇÃO
  composition: {
    shotType: 'Plano Médio (Busto)',
    floatingElements: false,
    floatingElementsImage: '', // URL base64 da imagem
    floatingElementsText: '',  // Descrição do elemento
  },

  // ESTILO
  style: {
    referencePhotos: [] as string[],
    sobriety: 20,
    activeVisualGrid: false,
    activeStyles: [] as string[],
    useBlur: true,
    useSideGradient: false,
    gradientPosition: 'bottom', // 'bottom' | 'top' | 'left' | 'right'
    gradientColor: '#000000',
  },

  // PROMPT ADICIONAL
  prompt: {
    active: false,
    text: '',
  }
};

export type UniversalFormData = typeof initialUniversalData;

export function useUniversalForm() {
  const [formData, setFormData] = useState<UniversalFormData>(initialUniversalData);

  const updateForm = (updater: (prev: UniversalFormData) => Partial<UniversalFormData>) => {
    setFormData(prev => ({ ...prev, ...updater(prev) }));
  };

  return {
    formData,
    updateForm,
  };
}
