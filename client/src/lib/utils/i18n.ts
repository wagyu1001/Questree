// 다국어 지원 유틸리티

export type Language = 'ko' | 'en';

export interface Translations {
  // 메인 페이지
  title: string;
  subtitle: string;
  
  // ChatInput 컴포넌트
  placeholder: string;
  sendButton: string;
  processing: string;
  fileButton: string;
  fileCount: string;
  clearFiles: string;
  removeFile: string;
  charCounter: string;
  loading: string;
  
  // TabView 컴포넌트
  startConversation: string;
  startConversationDesc: string;
  hint: string;
  selectedText: string;
  followUpQuestion: string;
  followUpPlaceholder: string;
  cancel: string;
  askQuestion: string;
  asking: string;
  
  // TreeView 컴포넌트
  conversationTree: string;
  nodes: string;
  emptyTree: string;
  emptyTreeDesc: string;
  
  // 공통
  loadingMessage: string;
  error: string;
  unknownError: string;
  serverError: string;
  validationError: string;
  
  // 튜토리얼 모달
  tutorialTitle: string;
  tutorialModalTitle: string;
  tutorialStep1: string;
  tutorialStep2: string;
  tutorialStep3: string;
  tutorialTip: string;
  tutorialTipText: string;
  gotIt: string;
  closeModal: string;
  
  // 날짜 형식
  dateFormat: Intl.DateTimeFormatOptions;
}

const translations: Record<Language, Translations> = {
  ko: {
    // 메인 페이지
    title: 'Questree',
    subtitle: 'AI와의 대화를 트리로 시각화하는 학습 도구',
    
    // ChatInput 컴포넌트
    placeholder: '질문을 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)',
    sendButton: '전송',
    processing: '처리 중...',
    fileButton: '이미지 파일 첨부',
    fileCount: '선택된 파일: {count}개',
    clearFiles: '모든 파일 제거',
    removeFile: '파일 제거',
    charCounter: '{current}/{max}',
    loading: '로딩 중...',
    
    // TabView 컴포넌트
    startConversation: '질문을 시작해보세요',
    startConversationDesc: '아래 입력창에 궁금한 것을 물어보시면 AI가 답변해드립니다.',
    hint: '답변에서 텍스트를 선택하면 추가 질문을 할 수 있습니다.',
    selectedText: '선택된 텍스트:',
    followUpQuestion: '에 대한 추가 질문',
    followUpPlaceholder: '추가 질문을 입력하세요...',
    cancel: '취소',
    askQuestion: '질문하기',
    asking: '질문 중...',
    
    // TreeView 컴포넌트
    conversationTree: '대화 트리',
    nodes: '{count}개 노드',
    emptyTree: '대화를 시작하시면',
    emptyTreeDesc: '트리가 여기에 표시됩니다',
    
    // 공통
    loadingMessage: 'AI가 답변을 생성하고 있습니다...',
    error: '오류가 발생했습니다.',
    unknownError: '알 수 없는 오류가 발생했습니다.',
    serverError: '서버 오류가 발생했습니다.',
    validationError: '입력값이 올바르지 않습니다.',
    
    // 튜토리얼 모달
    tutorialTitle: '텍스트 선택으로 추가 질문하기',
    tutorialModalTitle: '새로운 기능 안내',
    tutorialStep1: 'AI 답변에서 궁금한 부분의 텍스트를 드래그하여 선택하세요',
    tutorialStep2: '선택된 텍스트에 대한 추가 질문을 입력하세요',
    tutorialStep3: '질문을 전송하면 새로운 노드가 생성되어 대화 트리에 추가됩니다',
    tutorialTip: '팁:',
    tutorialTipText: '모바일에서는 텍스트를 길게 누르고 드래그하여 선택할 수 있습니다.',
    gotIt: '알겠습니다',
    closeModal: '모달 닫기',
    
    // 날짜 형식
    dateFormat: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }
  },
  en: {
    // 메인 페이지
    title: 'Questree',
    subtitle: 'Interactive learning tool that visualizes AI conversations as trees',
    
    // ChatInput 컴포넌트
    placeholder: 'Enter your question... (Enter to send, Shift+Enter for new line)',
    sendButton: 'Send',
    processing: 'Processing...',
    fileButton: 'Attach image file',
    fileCount: 'Selected files: {count}',
    clearFiles: 'Clear all files',
    removeFile: 'Remove file',
    charCounter: '{current}/{max}',
    loading: 'Loading...',
    
    // TabView 컴포넌트
    startConversation: 'Start a conversation',
    startConversationDesc: 'Ask anything in the input below and AI will answer you.',
    hint: 'You can ask follow-up questions by selecting text from the answer.',
    selectedText: 'Selected text:',
    followUpQuestion: 'follow-up question',
    followUpPlaceholder: 'Enter your follow-up question...',
    cancel: 'Cancel',
    askQuestion: 'Ask',
    asking: 'Asking...',
    
    // TreeView 컴포넌트
    conversationTree: 'Conversation Tree',
    nodes: '{count} nodes',
    emptyTree: 'Start a conversation',
    emptyTreeDesc: 'and the tree will appear here',
    
    // 공통
    loadingMessage: 'AI is generating an answer...',
    error: 'An error occurred.',
    unknownError: 'An unknown error occurred.',
    serverError: 'Server error occurred.',
    validationError: 'Invalid input.',
    
    // 튜토리얼 모달
    tutorialTitle: 'Ask Follow-up Questions by Selecting Text',
    tutorialModalTitle: 'New Feature Guide',
    tutorialStep1: 'Drag to select the text you\'re curious about from the AI answer',
    tutorialStep2: 'Enter your follow-up question about the selected text',
    tutorialStep3: 'Send the question and a new node will be created and added to the conversation tree',
    tutorialTip: 'Tip:',
    tutorialTipText: 'On mobile, you can long-press and drag to select text.',
    gotIt: 'Got it',
    closeModal: 'Close modal',
    
    // 날짜 형식
    dateFormat: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }
  }
};

// 브라우저 언어 감지 함수
export function detectBrowserLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'en'; // 서버 사이드에서는 기본값으로 영어 사용
  }
  
  const browserLang = navigator.language || (navigator as any).userLanguage;
  
  // 한국어 감지 (ko, ko-KR, ko-kr 등)
  if (browserLang.toLowerCase().startsWith('ko')) {
    return 'ko';
  }
  
  // 기본값은 영어
  return 'en';
}

// 텍스트 포맷팅 함수 (플레이스홀더 치환)
export function formatText(text: string, params: Record<string, string | number> = {}): string {
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key]?.toString() || match;
  });
}

// 현재 언어에 따른 번역 텍스트 가져오기
export function getTranslation(key: keyof Translations, language: Language, params?: Record<string, string | number>): string {
  const translation = translations[language][key];
  return params ? formatText(translation, params) : translation;
}

// 모든 번역 텍스트 가져오기
export function getTranslations(language: Language): Translations {
  return translations[language];
}
