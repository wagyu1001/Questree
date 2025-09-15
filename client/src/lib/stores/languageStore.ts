import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { detectBrowserLanguage, getTranslations, formatText, type Language, type Translations } from '../utils/i18n.js';

// formatText 함수를 re-export
export { formatText };

// 언어 상태 스토어
export const languageStore = writable<Language>('en');

// 번역 텍스트 스토어
export const translationsStore = writable<Translations>(getTranslations('en'));

// 언어 변경 함수
export function setLanguage(language: Language) {
  languageStore.set(language);
  translationsStore.set(getTranslations(language));
  
  // 브라우저 환경에서만 로컬 스토리지에 저장
  if (browser) {
    localStorage.setItem('questree-language', language);
  }
}

// 초기화 함수
export function initializeLanguage() {
  if (browser) {
    // 로컬 스토리지에서 저장된 언어 설정 확인
    const savedLanguage = localStorage.getItem('questree-language') as Language;
    
    if (savedLanguage && (savedLanguage === 'ko' || savedLanguage === 'en')) {
      setLanguage(savedLanguage);
    } else {
      // 저장된 설정이 없으면 브라우저 언어 감지
      const detectedLanguage = detectBrowserLanguage();
      setLanguage(detectedLanguage);
    }
  } else {
    // 서버 사이드에서는 기본값으로 영어 사용
    setLanguage('en');
  }
}

// 언어 변경 구독
languageStore.subscribe((language) => {
  translationsStore.set(getTranslations(language));
});
