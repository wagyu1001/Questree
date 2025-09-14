// Google Analytics 이벤트 추적 함수들

export const trackEvent = (eventName, parameters = {}) => {
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, parameters);
  }
};

// AI 질문 이벤트 추적
export const trackAIQuestion = (questionType, hasImage = false) => {
  trackEvent('ai_question', {
    question_type: questionType,
    has_image: hasImage,
    event_category: 'AI Interaction'
  });
};

// 페이지 뷰 이벤트 추적
export const trackPageView = (pageName) => {
  trackEvent('page_view', {
    page_name: pageName,
    event_category: 'Navigation'
  });
};

// 사용자 상호작용 이벤트 추적
export const trackUserInteraction = (action, element) => {
  trackEvent('user_interaction', {
    action: action,
    element: element,
    event_category: 'User Engagement'
  });
};
