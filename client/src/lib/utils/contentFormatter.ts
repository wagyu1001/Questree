// 콘텐츠 포맷팅 관련 유틸리티 함수들

// 마크다운 스타일 텍스트를 HTML로 변환
export function formatContent(content: string): string {
  if (!content) return '';
  
  let formatted = content
    // 제목 (## 제목)
    .replace(/^## (.+)$/gm, '<h2 class="content-heading">$1</h2>')
    // 부제목 (### 부제목)
    .replace(/^### (.+)$/gm, '<h3 class="content-subheading">$1</h3>')
    // 강조 텍스트 (**텍스트**)
    .replace(/\*\*(.+?)\*\*/g, '<strong class="content-bold">$1</strong>')
    // 기울임 텍스트 (*텍스트*)
    .replace(/\*(.+?)\*/g, '<em class="content-italic">$1</em>')
    // 인라인 코드 (`코드`)
    .replace(/`([^`]+)`/g, '<code class="content-code">$1</code>')
    // 코드 블록 (```코드```)
    .replace(/```([\s\S]*?)```/g, '<pre class="content-code-block"><code>$1</code></pre>')
    // 리스트 아이템 (- 아이템 또는 * 아이템)
    .replace(/^[-*] (.+)$/gm, '<li class="content-list-item">$1</li>')
    // 번호 리스트 (1. 아이템)
    .replace(/^\d+\. (.+)$/gm, '<li class="content-ordered-item">$1</li>')
    // 강조 텍스트 (==텍스트==)
    .replace(/==(.+?)==/g, '<mark class="content-highlight">$1</mark>')
    // 취소선 (~~텍스트~~)
    .replace(/~~(.+?)~~/g, '<del class="content-strikethrough">$1</del>')
    // 인용문 (> 텍스트)
    .replace(/^> (.+)$/gm, '<blockquote class="content-quote">$1</blockquote>')
    // 질문/답변 구분선 (---)
    .replace(/^---$/gm, '<div class="conversation-separator"><div class="separator-line"></div><div class="separator-text">새로운 질문</div><div class="separator-line"></div></div>')
    // 일반 구분선 (---)
    .replace(/^---$/gm, '<hr class="content-divider">')
    // 일반 줄바꿈 (연속된 줄바꿈을 최소화)
    .replace(/\n\n+/g, '<br><br>') // 연속 줄바꿈을 두 개로 통합
    .replace(/\n/g, '<br>');
  
  // 리스트 아이템들을 ul로 감싸기
  formatted = formatted
    .replace(/(<li class="content-list-item">.*?<\/li>)/gs, '<ul class="content-list">$1</ul>')
    .replace(/(<li class="content-ordered-item">.*?<\/li>)/gs, '<ol class="content-ordered-list">$1</ol>');
  
  // 연속된 blockquote를 하나로 묶기
  formatted = formatted.replace(/(<blockquote class="content-quote">.*?<\/blockquote>)/gs, (match) => {
    return match.replace(/<br><br>/g, '<br>');
  });
  
  return formatted;
}
