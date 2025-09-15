// 텍스트 관련 유틸리티 함수들

// HTML 이스케이프 함수
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 텍스트 선택 검증 함수
export function validateTextSelection(text: string): { isValid: boolean; error: string } {
  if (!text || text.trim().length === 0) {
    return { isValid: false, error: '선택된 텍스트가 없습니다.' };
  }
  
  if (text.length < 3) {
    return { isValid: false, error: '최소 3자 이상 선택해주세요.' };
  }
  
  if (text.length > 2000) {
    return { isValid: false, error: '최대 2000자까지 선택 가능합니다.' };
  }
  
  return { isValid: true, error: '' };
}

// 팔로업 질문 검증 함수
export function validateFollowUpPrompt(prompt: string): { isValid: boolean; error: string } {
  if (!prompt || prompt.trim().length === 0) {
    return { isValid: false, error: '질문을 입력해주세요.' };
  }
  
  if (prompt.length < 3) {
    return { isValid: false, error: '질문은 최소 3자 이상 입력해주세요.' };
  }
  
  if (prompt.length > 2000) {
    return { isValid: false, error: '질문은 최대 2000자까지 입력 가능합니다.' };
  }
  
  // 악의적인 패턴 검사
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<link/i,
    /<meta/i,
    /data:text\/html/i,
    /vbscript:/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(prompt)) {
      return { isValid: false, error: '안전하지 않은 내용이 포함되어 있습니다. 다시 입력해주세요.' };
    }
  }
  
  return { isValid: true, error: '' };
}

// 선택된 텍스트가 특정 영역 내에 있는지 확인
export function isTextInContentArea(selection: Selection | null): boolean {
  if (!selection || selection.rangeCount === 0) return false;
  
  const range = selection.getRangeAt(0);
  const contentElement = document.querySelector('.content-text');
  
  if (!contentElement) return false;
  
  const contentRect = contentElement.getBoundingClientRect();
  const rect = range.getBoundingClientRect();
  
  return rect.top >= contentRect.top && rect.bottom <= contentRect.bottom;
}
