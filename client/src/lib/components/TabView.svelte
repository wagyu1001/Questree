<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { conversationStore, getActiveNode, createNode, addNode, getLoadingState } from '../stores.js';
  import { validateTextSelection, validateFollowUpPrompt, isTextInContentArea } from '../utils/textUtils.js';
  import { scrollToBottom } from '../utils/scrollUtils.js';
  import { formatContent } from '../utils/contentFormatter.js';
  import TutorialModal from './TutorialModal.svelte';
  
  // 상태 변수들
  let activeNode = getActiveNode($conversationStore);
  let selectedText = '';
  let showFollowUpInput = false;
  let followUpPrompt = '';
  let isAskingFollowUp = false;
  let followUpError = '';
  let isDragging = false;
  let dragEndTimer: ReturnType<typeof setTimeout> | null = null;
  let tabContentEl: HTMLDivElement | null = null;
  
  // 튜토리얼 모달 관련 변수들
  let tutorialModal: TutorialModal;
  let hasShownTutorial = false;
  let previousNodeCount = 0;

  // 반응형 구독
  $: activeNode = getActiveNode($conversationStore);
  $: loadingState = getLoadingState($conversationStore);

  // activeNode.content가 바뀔 때 감지하고 자동 스크롤
  $: if (tabContentEl && activeNode?.content) {
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  }

  // 첫 답변을 받았을 때 튜토리얼 표시
  $: {
    const currentNodeCount = Object.keys($conversationStore.nodes).length;
    if (currentNodeCount > 0 && previousNodeCount === 0 && !hasShownTutorial && activeNode?.content && !loadingState.isLoading) {
      // 첫 번째 노드가 생성되고 내용이 있을 때 튜토리얼 표시
      setTimeout(() => {
        if (tutorialModal) {
          tutorialModal.show();
          hasShownTutorial = true;
        }
      }, 1000); // 1초 후에 표시하여 사용자가 답변을 확인할 시간 제공
    }
    previousNodeCount = currentNodeCount;
  }


  // ===== 마우스 이벤트 핸들러 =====
  function handleMouseDown(event: MouseEvent) {
    isDragging = false;
  }

  function handleMouseMove(event: MouseEvent) {
    if (event.buttons === 1) {
      isDragging = true;
    }
  }

  function handleMouseUp(event: MouseEvent) {
    if (typeof window === 'undefined') return;
    
    if (isDragging) {
      if (dragEndTimer) {
        clearTimeout(dragEndTimer);
      }
      
      dragEndTimer = setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        
        if (text && text.length > 0) {
          selectedText = text;
          showFollowUpInput = true;
          followUpPrompt = '';
          followUpError = '';
        } else {
          showFollowUpInput = false;
          selectedText = '';
        }
        isDragging = false;
      }, 150);
    }
  }

  // ===== 텍스트 선택 핸들러 =====
  function handleSelectionChange() {
    if (typeof window === 'undefined' || isDragging) return;
    
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0) {
      selectedText = text;
      
      if (isTextInContentArea(selection)) {
        showFollowUpInput = true;
      }
    }
  }

  // ===== 키보드 이벤트 핸들러 =====
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && showFollowUpInput) {
      cancelFollowUp();
    }
  }

  function handleGlobalKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && showFollowUpInput) {
      cancelFollowUp();
    }
  }

  // ===== 팔로업 질문 핸들러 =====
  function cancelFollowUp() {
    showFollowUpInput = false;
    selectedText = '';
    followUpPrompt = '';
    followUpError = '';
  }

  async function submitFollowUp() {
    if (!followUpPrompt.trim() || !activeNode || isAskingFollowUp) return;
    
    const validation = validateFollowUpPrompt(followUpPrompt);
    if (!validation.isValid) {
      followUpError = validation.error;
      return;
    }
    
    isAskingFollowUp = true;
    followUpError = '';
    
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: followUpPrompt.trim(),
          selectedText: selectedText
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '서버 오류가 발생했습니다.');
      }
      
      const data = await response.json();
      
      const newNode = createNode(
        selectedText.length > 50 ? selectedText.substring(0, 50) + '...' : selectedText,
        data.answer,
        activeNode.id,
        selectedText
      );
      
      addNode(newNode);
      cancelFollowUp();
      
    } catch (err) {
      console.error('팔로업 질문 API 호출 오류:', err);
      followUpError = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    } finally {
      isAskingFollowUp = false;
    }
  }


  function handleFollowUpKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitFollowUp();
    } else if (event.key === 'Escape') {
      cancelFollowUp();
    }
  }

  // ===== 이벤트 핸들러 =====
  function handleDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    
    if (target.closest('.follow-up-input-container')) {
      return;
    }
    
    if (target.closest('.cancel-follow-up-btn')) {
      showFollowUpInput = false;
      selectedText = '';
    }
  }


  onMount(() => {
    if (typeof document !== 'undefined') {
      document.addEventListener('click', handleDocumentClick);
      document.addEventListener('selectionchange', handleSelectionChange);
      document.addEventListener('keydown', handleGlobalKeydown);
    }
  });

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('keydown', handleGlobalKeydown);
    }
    // 타이머 정리
    if (dragEndTimer) {
      clearTimeout(dragEndTimer);
    }
  });
</script>

{#if browser}
  <div class="tab-view">
    {#if activeNode}
      <div class="tab-header">
        <h1 class="tab-title">{activeNode.title}</h1>
        <div class="tab-meta">
          <span class="timestamp">
            {new Date(activeNode.timestamp).toLocaleString('ko-KR')}
          </span>
        </div>
      </div>
      
      <div 
        class="tab-content"
        role="textbox"
        tabindex="0"
        bind:this={tabContentEl}
        on:mousedown={handleMouseDown}
        on:mousemove={handleMouseMove}
        on:mouseup={handleMouseUp}
        on:keydown={handleKeydown}
      >
        <div class="content-text">
          {@html formatContent(activeNode.content)}
        </div>
      </div>
    {:else if loadingState.isLoading}
      <div class="loading-content">
        <div class="loading-spinner-container">
          <div class="loading-spinner">
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
          </div>
          <h3 class="loading-title">{loadingState.loadingMessage}</h3>
          <div class="loading-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    {:else}
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            <path d="M13 8H7"></path>
            <path d="M17 12H7"></path>
          </svg>
        </div>
        <h2>질문을 시작해보세요</h2>
        <p>아래 입력창에 궁금한 것을 물어보시면 AI가 답변해드립니다.</p>
        <p class="hint">답변에서 텍스트를 선택하면 추가 질문을 할 수 있습니다.</p>
      </div>
    {/if}
  </div>
{:else}
  <div class="tab-view">
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          <path d="M13 8H7"></path>
          <path d="M17 12H7"></path>
        </svg>
      </div>
      <h2>로딩 중...</h2>
      <p>잠시만 기다려주세요.</p>
    </div>
  </div>
{/if}

{#if browser}
  <!-- 추가 질문 입력 영역 -->
  {#if showFollowUpInput && selectedText}
    <div class="follow-up-input-container" on:click|stopPropagation role="dialog" aria-label="추가 질문 입력" tabindex="0" on:keydown={handleKeydown}>
      <div class="selected-text-display">
        <span class="selected-text-label">선택된 텍스트:</span>
        <span class="selected-text-content">"{selectedText}"</span>
        <span class="follow-up-suffix">에 대한 추가 질문</span>
      </div>
      
      <div class="follow-up-input-area">
        <textarea
          bind:value={followUpPrompt}
          on:keydown={handleFollowUpKeydown}
          placeholder="추가 질문을 입력하세요..."
          rows="3"
          class="follow-up-textarea"
        ></textarea>
        
        <div class="follow-up-actions">
          <button 
            class="cancel-follow-up-btn"
            on:click={cancelFollowUp}
            disabled={isAskingFollowUp}
          >
            취소
          </button>
          <button 
            class="submit-follow-up-btn" 
            on:click={submitFollowUp}
            disabled={!followUpPrompt.trim() || isAskingFollowUp}
          >
            {#if isAskingFollowUp}
              <div class="spinner"></div>
              질문 중...
            {:else}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9"></polygon>
              </svg>
              질문하기
            {/if}
          </button>
        </div>
      </div>
      
      {#if followUpError}
        <div class="follow-up-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          {followUpError}
        </div>
      {/if}
    </div>
  {/if}
{/if}

<!-- 튜토리얼 모달 -->
<TutorialModal bind:this={tutorialModal} on:close={() => {}} />

<style>
  .tab-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding-bottom: 120px; /* ChatInput 공간 확보 */
  }

  /* 모바일 반응형 디자인 */
  @media (max-width: 768px) {
    .tab-view {
      padding-bottom: 140px; /* 모바일에서 입력창 공간 더 확보 */
    }
    
    .tab-header {
      padding: 1rem;
    }
    
    .tab-title {
      font-size: 1.25rem;
      line-height: 1.3;
    }
    
    .tab-content {
      padding: 1rem;
    }
    
    .content-text {
      font-size: 0.95rem;
      line-height: 1.4;
    }
    
    .content-text :global(.content-h2) {
      font-size: 1.25rem;
      margin: 0.5rem 0 0.375rem 0;
    }
    
    .content-text :global(.content-h3) {
      font-size: 1.125rem;
      margin: 0.5rem 0 0.125rem 0;
    }
    
    .content-text :global(.content-h4) {
      font-size: 1rem;
      margin: 0.375rem 0 0.125rem 0;
    }
    
    .content-text :global(.content-code-block) {
      padding: 0.5rem;
      font-size: 0.8rem;
    }
    
    .loading-spinner-container {
      padding: 1.5rem;
      margin: 1rem;
    }
    
    .loading-title {
      font-size: 1rem;
    }
    
    .empty-state {
      padding: 1.5rem;
    }
    
    .empty-state h2 {
      font-size: 1.25rem;
    }
    
    .empty-icon svg {
      width: 48px;
      height: 48px;
    }
    
    /* 추가 질문 입력 영역 모바일 최적화 */
    .follow-up-input-container {
      bottom: 20px;
      width: 95%;
      max-width: none;
    }
    
    .selected-text-display {
      padding: 0.75rem 1rem;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
    
    .selected-text-label {
      font-size: 0.8rem;
    }
    
    .selected-text-content {
      font-size: 0.8rem;
      max-width: 100%;
      white-space: normal;
    }
    
    .follow-up-suffix {
      font-size: 0.8rem;
    }
    
    .follow-up-input-area {
      padding: 1rem;
    }
    
    .follow-up-textarea {
      font-size: 16px; /* iOS 줌 방지 */
      min-height: 60px;
      padding: 0.5rem;
    }
    
    .follow-up-actions {
      gap: 0.5rem;
    }
    
    .cancel-follow-up-btn,
    .submit-follow-up-btn {
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
    }
  }

  @media (max-width: 480px) {
    .tab-view {
      padding-bottom: 160px; /* 더 작은 화면에서 입력창 공간 더 확보 */
    }
    
    .tab-header {
      padding: 0.75rem;
    }
    
    .tab-title {
      font-size: 1.125rem;
    }
    
    .tab-meta {
      margin-top: 0.375rem;
    }
    
    .timestamp {
      font-size: 0.8rem;
    }
    
    .tab-content {
      padding: 0.75rem;
    }
    
    .content-text {
      font-size: 0.9rem;
    }
    
    .content-text :global(.content-h2) {
      font-size: 1.125rem;
    }
    
    .content-text :global(.content-h3) {
      font-size: 1rem;
    }
    
    .content-text :global(.content-h4) {
      font-size: 0.95rem;
    }
    
    .content-text :global(.content-code) {
      font-size: 0.8rem;
      padding: 0.125rem 0.1875rem;
    }
    
    .content-text :global(.content-code-block) {
      padding: 0.375rem;
      font-size: 0.75rem;
    }
    
    .content-text :global(.content-list),
    .content-text :global(.content-ordered-list) {
      padding-left: 1rem;
    }
    
    .content-text :global(.content-quote) {
      padding: 0.75rem 1rem;
      margin: 0.75rem 0;
    }
    
    .loading-spinner-container {
      padding: 1rem;
      margin: 0.5rem;
    }
    
    .loading-title {
      font-size: 0.95rem;
    }
    
    .loading-spinner {
      width: 48px;
      height: 48px;
    }
    
    .empty-state {
      padding: 1rem;
    }
    
    .empty-state h2 {
      font-size: 1.125rem;
    }
    
    .empty-state p {
      font-size: 0.9rem;
    }
    
    .hint {
      font-size: 0.8rem;
    }
    
    .empty-icon svg {
      width: 40px;
      height: 40px;
    }
    
    /* 추가 질문 입력 영역 소형 화면 최적화 */
    .follow-up-input-container {
      bottom: 30px;
      width: 98%;
    }
    
    .selected-text-display {
      padding: 0.5rem 0.75rem;
    }
    
    .selected-text-label,
    .selected-text-content,
    .follow-up-suffix {
      font-size: 0.75rem;
    }
    
    .follow-up-input-area {
      padding: 0.75rem;
    }
    
    .follow-up-textarea {
      font-size: 16px;
      min-height: 50px;
      padding: 0.375rem;
    }
    
    .follow-up-actions {
      flex-direction: column;
      gap: 0.375rem;
    }
    
    .cancel-follow-up-btn,
    .submit-follow-up-btn {
      padding: 0.5rem;
      font-size: 0.75rem;
      justify-content: center;
    }
  }

  .tab-header {
    padding: 1.5rem 2rem;
    border-bottom: 1px solid #e5e7eb;
    background: white;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .tab-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    line-height: 1.4;
  }

  .tab-meta {
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .timestamp {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .tab-content {
    flex: 1;
    padding: 2rem;
    overflow-y: auto;
    background: #fafafa;
  }

  .content-text {
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.3; /* 1.5에서 1.3으로 더욱 줄임 */
    font-size: 1rem;
    color: #374151;
    white-space: pre-wrap;
    user-select: text; /* 텍스트 선택 가능하도록 명시 */
    cursor: text; /* 텍스트 커서 표시 */
  }

  /* 포맷팅된 컨텐츠 스타일 */
  .content-text :global(.content-h2) {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0.75rem 0 0.5rem 0; /* 더욱 줄임 */
    padding-bottom: 0.25rem; /* 0.5rem에서 줄임 */
    border-bottom: 2px solid #e5e7eb;
  }

  .content-text :global(.content-h3) {
    font-size: 1.25rem;
    font-weight: 600;
    color: #374151;
    margin: 0.75rem 0 0.25rem 0; /* 더욱 줄임 */
  }

  .content-text :global(.content-h4) {
    font-size: 1.125rem;
    font-weight: 600;
    color: #4b5563;
    margin: 0.5rem 0 0.125rem 0; /* 더욱 줄임 */
  }

  .content-text :global(.content-bold) {
    font-weight: 700;
    color: #1f2937;
  }

  .content-text :global(.content-italic) {
    font-style: italic;
    color: #6b7280;
  }

  .content-text :global(.content-code) {
    background: #f3f4f6;
    color: #dc2626;
    padding: 0.0625rem 0.25rem; /* 더욱 줄임 */
    border-radius: 0.25rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875rem;
  }

  .content-text :global(.content-code-block) {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.75rem; /* 1rem에서 줄임 */
    margin: 0.5rem 0; /* 0.75rem 0에서 더욱 줄임 */
    overflow-x: auto;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875rem;
    line-height: 1.3; /* 1.5에서 1.3으로 줄임 */
  }

  .content-text :global(.content-code-block code) {
    background: none;
    color: #374151;
    padding: 0;
    border-radius: 0;
    font-size: inherit;
  }

  .content-text :global(.content-list) {
    margin: 0.5rem 0; /* 더욱 줄임 */
    padding-left: 1.25rem; /* 1.5rem에서 줄임 */
  }

  .content-text :global(.content-ordered-list) {
    margin: 0.5rem 0; /* 더욱 줄임 */
    padding-left: 1.25rem; /* 1.5rem에서 줄임 */
  }

  .content-text :global(.content-list-item),
  .content-text :global(.content-ordered-item) {
    margin: 0.25rem 0; /* 더욱 줄임 */
    line-height: 1.3; /* 1.5에서 1.3으로 줄임 */
  }

  .content-text :global(.content-list-item) {
    list-style-type: disc;
  }

  .content-text :global(.content-ordered-item) {
    list-style-type: decimal;
  }

  .content-text :global(.content-highlight) {
    background: #fef3c7;
    color: #92400e;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-weight: 500;
  }

  .content-text :global(.content-strikethrough) {
    text-decoration: line-through;
    color: #6b7280;
    opacity: 0.8;
  }

  .content-text :global(.content-quote) {
    border-left: 4px solid #3b82f6;
    background: #f8fafc;
    padding: 1rem 1.5rem;
    margin: 1rem 0;
    border-radius: 0 0.5rem 0.5rem 0;
    font-style: italic;
    color: #4b5563;
    position: relative;
  }

  .content-text :global(.content-quote::before) {
    content: '"';
    font-size: 2rem;
    color: #3b82f6;
    position: absolute;
    top: 0.5rem;
    left: 0.75rem;
    opacity: 0.3;
  }

  .content-text :global(.content-divider) {
    border: none;
    height: 2px;
    background: linear-gradient(to right, transparent, #e5e7eb, transparent);
    margin: 2rem 0;
  }

  /* 대화 스타일 */
  .content-text :global(.conversation-separator) {
    display: flex;
    align-items: center;
    margin: 2rem 0;
    gap: 1rem;
  }

  .content-text :global(.separator-line) {
    flex: 1;
    height: 1px;
    background: #e5e7eb;
  }

  .content-text :global(.separator-text) {
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
    background: #f8fafc;
    padding: 0.5rem 1rem;
    border-radius: 1rem;
    border: 1px solid #e5e7eb;
  }

  .content-text :global(.conversation-question) {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 0.75rem;
    padding: 1rem;
    margin: 1rem 0;
  }

  .content-text :global(.question-label) {
    font-size: 0.75rem;
    font-weight: 600;
    color: #0369a1;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .content-text :global(.question-text) {
    color: #0c4a6e;
    font-weight: 500;
    line-height: 1.5;
  }

  .content-text :global(.conversation-answer) {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1rem;
    margin: 1rem 0;
  }

  .content-text :global(.answer-label) {
    font-size: 0.75rem;
    font-weight: 600;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .content-text :global(.answer-text) {
    color: #334155;
    line-height: 1.5;
  }

  .loading-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: #fafafa;
  }

  .loading-spinner-container {
    text-align: center;
    padding: 2rem;
    background: white;
    border-radius: 1rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    border: 1px solid #e5e7eb;
    max-width: 400px;
    width: 100%;
  }

  .loading-spinner {
    position: relative;
    width: 60px;
    height: 60px;
    margin: 0 auto 1.5rem;
  }

  .spinner-ring {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 2px solid transparent;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1.5s linear infinite;
  }

  .spinner-ring:nth-child(2) {
    width: 45px;
    height: 45px;
    top: 7.5px;
    left: 7.5px;
    border-top-color: #60a5fa;
    animation-duration: 1.2s;
    animation-direction: reverse;
  }

  .spinner-ring:nth-child(3) {
    width: 30px;
    height: 30px;
    top: 15px;
    left: 15px;
    border-top-color: #93c5fd;
    animation-duration: 0.9s;
  }

  .loading-title {
    margin: 0 0 1.5rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
  }

  .loading-dots {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    background: #3b82f6;
    border-radius: 50%;
    animation: bounce 1.4s ease-in-out infinite both;
  }

  .dot:nth-child(1) {
    animation-delay: -0.32s;
  }

  .dot:nth-child(2) {
    animation-delay: -0.16s;
  }

  .dot:nth-child(3) {
    animation-delay: 0s;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }

  .empty-icon {
    margin-bottom: 1.5rem;
    color: #d1d5db;
  }

  .empty-state h2 {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #374151;
  }

  .empty-state p {
    margin: 0.5rem 0;
    max-width: 400px;
  }

  .hint {
    font-size: 0.875rem;
    color: #9ca3af;
    font-style: italic;
  }

  /* 추가 질문 입력 영역 스타일 */
  .follow-up-input-container {
    position: fixed;
    bottom: 10px; /* 입력창 위에 더 가깝게 위치 */
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    max-width: 800px;
    background: white;
    border: 2px solid #3b82f6;
    border-radius: 1rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .selected-text-display {
    padding: 1rem 1.5rem;
    background: #f8fafc;
    border-bottom: 1px solid #e5e7eb;
    border-radius: 1rem 1rem 0 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .selected-text-label {
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
  }

  .selected-text-content {
    font-size: 0.875rem;
    color: #3b82f6;
    font-weight: 600;
    background: #eff6ff;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .follow-up-suffix {
    font-size: 0.875rem;
    color: #374151;
    font-weight: 500;
  }

  .follow-up-input-area {
    padding: 1.5rem;
  }

  .follow-up-textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-family: inherit;
    resize: vertical;
    min-height: 80px;
    margin-bottom: 1rem;
    transition: border-color 0.2s ease;
  }

  .follow-up-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .follow-up-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .cancel-follow-up-btn {
    padding: 0.75rem 1.5rem;
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cancel-follow-up-btn:hover:not(:disabled) {
    background: #e5e7eb;
  }

  .cancel-follow-up-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .submit-follow-up-btn {
    padding: 0.75rem 1.5rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .submit-follow-up-btn:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
  }

  .submit-follow-up-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }

  .follow-up-error {
    padding: 0 1.5rem 1.5rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #dc2626;
    font-size: 0.875rem;
  }



  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
