// 스크롤 관련 유틸리티 함수들

// 스크롤을 맨 아래로 이동
export function scrollToBottom(element?: HTMLElement | null): void {
  if (element) {
    element.scrollTo({
      top: element.scrollHeight,
      behavior: 'smooth'
    });
  } else {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  }
}

// 스크롤 위치 확인 (하단에서 10px 이내인지)
export function isAtBottom(element: HTMLElement): boolean {
  const { scrollTop, scrollHeight, clientHeight } = element;
  return scrollTop + clientHeight >= scrollHeight - 10;
}

// 스크롤 이벤트 핸들러 생성
export function createScrollHandler(
  element: HTMLElement | null,
  onScrollChange: (isAtBottom: boolean) => void
) {
  return () => {
    if (!element) return;
    onScrollChange(isAtBottom(element));
  };
}
