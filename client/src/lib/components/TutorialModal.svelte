<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let isVisible = false;
  
  export function show() {
    isVisible = true;
    // 모달이 표시될 때 body 스크롤 방지
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }
  
  export function hide() {
    isVisible = false;
    // 모달이 숨겨질 때 body 스크롤 복원
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
    dispatch('close');
  }
  
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      hide();
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      hide();
    }
  }
  
  // 모달이 표시될 때 키보드 이벤트 리스너 추가
  $: if (isVisible && typeof document !== 'undefined') {
    document.addEventListener('keydown', handleKeydown);
  } else if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', handleKeydown);
  }
</script>

{#if isVisible}
  <div 
    class="modal-backdrop" 
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="modal-title" class="modal-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
          </svg>
          새로운 기능 안내
        </h2>
        <button 
          class="close-button"
          on:click={hide}
          aria-label="모달 닫기"
          title="닫기"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="tutorial-content">
          <div class="tutorial-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2-2z"></path>
              <path d="M8 21v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"></path>
              <path d="M3 7l9 6 9-6"></path>
            </svg>
          </div>
          
          <h3 class="tutorial-title">텍스트 선택으로 추가 질문하기</h3>
          
          <div class="tutorial-steps">
            <div class="step">
              <div class="step-number">1</div>
              <div class="step-content">
                <p>AI 답변에서 <strong>궁금한 부분의 텍스트를 드래그</strong>하여 선택하세요</p>
              </div>
            </div>
            
            <div class="step">
              <div class="step-number">2</div>
              <div class="step-content">
                <p>선택된 텍스트에 대한 <strong>추가 질문을 입력</strong>하세요</p>
              </div>
            </div>
            
            <div class="step">
              <div class="step-number">3</div>
              <div class="step-content">
                <p>질문을 전송하면 <strong>새로운 노드가 생성</strong>되어 대화 트리에 추가됩니다</p>
              </div>
            </div>
          </div>
          
          <div class="tutorial-tip">
            <div class="tip-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
            </div>
            <p class="tip-text">
              <strong>팁:</strong> 모바일에서는 텍스트를 길게 누르고 드래그하여 선택할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button 
          class="got-it-button"
          on:click={hide}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4"></path>
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
          알겠습니다
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1rem;
    animation: fadeIn 0.3s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  .modal-content {
    background: white;
    border-radius: 1rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    animation: slideUp 0.3s ease-out;
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 1.5rem 0 1.5rem;
  }
  
  .modal-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
  }
  
  .modal-title svg {
    color: #3b82f6;
  }
  
  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    background: #f3f4f6;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #6b7280;
  }
  
  .close-button:hover {
    background: #e5e7eb;
    color: #374151;
  }
  
  .modal-body {
    padding: 1.5rem;
  }
  
  .tutorial-content {
    text-align: center;
  }
  
  .tutorial-icon {
    margin-bottom: 1.5rem;
    color: #3b82f6;
  }
  
  .tutorial-title {
    margin: 0 0 1.5rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
  }
  
  .tutorial-steps {
    margin-bottom: 1.5rem;
  }
  
  .step {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
    text-align: left;
  }
  
  .step:last-child {
    margin-bottom: 0;
  }
  
  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: #3b82f6;
    color: white;
    border-radius: 50%;
    font-size: 0.875rem;
    font-weight: 600;
    flex-shrink: 0;
  }
  
  .step-content {
    flex: 1;
  }
  
  .step-content p {
    margin: 0;
    color: #374151;
    line-height: 1.5;
  }
  
  .step-content strong {
    color: #1f2937;
    font-weight: 600;
  }
  
  .tutorial-tip {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 0.75rem;
    text-align: left;
  }
  
  .tip-icon {
    color: #0369a1;
    flex-shrink: 0;
  }
  
  .tip-text {
    margin: 0;
    font-size: 0.875rem;
    color: #0c4a6e;
    line-height: 1.4;
  }
  
  .tip-text strong {
    color: #0369a1;
    font-weight: 600;
  }
  
  .modal-footer {
    padding: 0 1.5rem 1.5rem 1.5rem;
  }
  
  .got-it-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1.5rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.75rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .got-it-button:hover {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }
  
  .got-it-button:active {
    transform: translateY(0);
  }
  
  /* 모바일 최적화 */
  @media (max-width: 768px) {
    .modal-backdrop {
      padding: 0.5rem;
    }
    
    .modal-content {
      max-height: 95vh;
    }
    
    .modal-header {
      padding: 1rem 1rem 0 1rem;
    }
    
    .modal-title {
      font-size: 1.125rem;
    }
    
    .modal-body {
      padding: 1rem;
    }
    
    .tutorial-icon svg {
      width: 48px;
      height: 48px;
    }
    
    .tutorial-title {
      font-size: 1rem;
    }
    
    .step {
      gap: 0.75rem;
    }
    
    .step-number {
      width: 1.75rem;
      height: 1.75rem;
      font-size: 0.8rem;
    }
    
    .step-content p {
      font-size: 0.9rem;
    }
    
    .tutorial-tip {
      padding: 0.75rem;
      gap: 0.5rem;
    }
    
    .tip-text {
      font-size: 0.8rem;
    }
    
    .modal-footer {
      padding: 0 1rem 1rem 1rem;
    }
    
    .got-it-button {
      padding: 0.625rem 1.25rem;
      font-size: 0.9rem;
    }
  }
  
  @media (max-width: 480px) {
    .modal-backdrop {
      padding: 0.25rem;
    }
    
    .modal-header {
      padding: 0.75rem 0.75rem 0 0.75rem;
    }
    
    .modal-body {
      padding: 0.75rem;
    }
    
    .tutorial-icon svg {
      width: 40px;
      height: 40px;
    }
    
    .tutorial-title {
      font-size: 0.95rem;
    }
    
    .step-content p {
      font-size: 0.85rem;
    }
    
    .tutorial-tip {
      padding: 0.5rem;
    }
    
    .tip-text {
      font-size: 0.75rem;
    }
    
    .modal-footer {
      padding: 0 0.75rem 0.75rem 0.75rem;
    }
    
    .got-it-button {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
    }
  }
</style>
