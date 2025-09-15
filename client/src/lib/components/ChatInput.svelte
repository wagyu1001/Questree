<script lang="ts">
  import { browser } from '$app/environment';
  import { createNode, addNode, setLoading, conversationStore, getLoadingState, getActiveNode, appendToNode } from '../stores.js';
  
  let prompt = '';
  let error = '';
  let selectedFiles: File[] = [];
  let isDragOver = false;
  let fileInput: HTMLInputElement;
  
  $: loadingState = getLoadingState($conversationStore);
  $: isLoading = loadingState.isLoading;
  $: charCount = prompt.length;
  $: isOverLimit = charCount > MAX_PROMPT_LENGTH;
  $: hasFiles = selectedFiles.length > 0;
  
  // 입력 검증 상수
  const MAX_PROMPT_LENGTH = 2000; // 최대 2000자
  const MIN_PROMPT_LENGTH = 3; // 최소 3자
  const MAX_LINES = 20; // 최대 20줄
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_FILES = 5; // 최대 5개 파일
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  // 입력 검증 함수
  function validateInput(text: string): { isValid: boolean; error: string } {
    if (!text || text.trim().length < MIN_PROMPT_LENGTH) {
      return { isValid: false, error: `질문은 최소 ${MIN_PROMPT_LENGTH}자 이상 입력해주세요.` };
    }
    
    if (text.length > MAX_PROMPT_LENGTH) {
      return { isValid: false, error: `질문은 최대 ${MAX_PROMPT_LENGTH}자까지 입력 가능합니다.` };
    }
    
    const lines = text.split('\n');
    if (lines.length > MAX_LINES) {
      return { isValid: false, error: `질문은 최대 ${MAX_LINES}줄까지 입력 가능합니다.` };
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
      if (pattern.test(text)) {
        return { isValid: false, error: '안전하지 않은 내용이 포함되어 있습니다. 다시 입력해주세요.' };
      }
    }
    
    return { isValid: true, error: '' };
  }

  // 파일 검증 함수
  function validateFile(file: File): { isValid: boolean; error: string } {
    if (file.size > MAX_FILE_SIZE) {
      return { isValid: false, error: `파일 크기는 최대 ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB까지 가능합니다.` };
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { isValid: false, error: '이미지 파일만 업로드 가능합니다. (JPEG, PNG, GIF, WebP)' };
    }
    
    return { isValid: true, error: '' };
  }

  // 파일 선택 처리
  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      const files = Array.from(target.files);
      addFiles(files);
    }
  }

  // 파일 추가
  function addFiles(files: File[]) {
    const newFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (selectedFiles.length + newFiles.length >= MAX_FILES) {
        errors.push(`최대 ${MAX_FILES}개 파일까지 업로드 가능합니다.`);
        break;
      }

      const validation = validateFile(file);
      if (validation.isValid) {
        newFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }

    if (errors.length > 0) {
      error = errors.join('\n');
    } else {
      error = '';
    }

    selectedFiles = [...selectedFiles, ...newFiles];
  }

  // 파일 제거
  function removeFile(index: number) {
    selectedFiles = selectedFiles.filter((_, i) => i !== index);
    error = '';
  }

  // 드래그 앤 드롭 이벤트 핸들러
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
    
    if (event.dataTransfer?.files) {
      const files = Array.from(event.dataTransfer.files);
      addFiles(files);
    }
  }

  // 파일 선택 버튼 클릭
  function openFileDialog() {
    fileInput?.click();
  }

  // 파일을 Base64로 변환
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit() {
    if (!browser || (!prompt.trim() && selectedFiles.length === 0) || isLoading) return;
    
    // 텍스트가 있는 경우 입력 검증
    if (prompt.trim()) {
      const validation = validateInput(prompt.trim());
      if (!validation.isValid) {
        error = validation.error;
        return;
      }
    }
    
    setLoading(true, 'AI가 답변을 생성하고 있습니다...');
    error = '';
    
    // 로딩 메시지 업데이트를 위한 타이머들
    const loadingMessages = [
      'AI가 답변을 생성하고 있습니다...',
      '이미지를 분석하고 있습니다...',
      '최적의 답변을 준비하고 있습니다...',
      '거의 완료되었습니다...'
    ];
    
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setLoading(true, loadingMessages[messageIndex]);
    }, 2000);
    
    try {
      // 이미지 파일들을 Base64로 변환
      const imageData = await Promise.all(
        selectedFiles.map(async (file) => ({
          name: file.name,
          type: file.type,
          data: await fileToBase64(file)
        }))
      );
      
      const requestBody = {
        prompt: prompt.trim(),
        images: imageData
      };
      
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '서버 오류가 발생했습니다.');
      }
      
      const data = await response.json();
      
      // 현재 활성 노드 확인
      const activeNode = getActiveNode($conversationStore);
      
      if (activeNode) {
        // 기존 노드가 있으면 답변을 추가
        const questionText = prompt.trim() || `이미지 ${selectedFiles.length}개`;
        appendToNode(activeNode.id, data.answer, questionText);
      } else {
        // 기존 노드가 없으면 새 노드 생성
        const nodeTitle = prompt.trim() 
          ? (prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt)
          : `이미지 ${selectedFiles.length}개`;
        
        const newNode = createNode(
          nodeTitle,
          data.answer,
          null, // 루트 노드
          prompt.trim() || `이미지 ${selectedFiles.length}개` // 질문 텍스트
        );
        
        addNode(newNode);
      }
      
      prompt = ''; // 입력 필드 초기화
      selectedFiles = []; // 파일 초기화
      
    } catch (err) {
      console.error('API 호출 오류:', err);
      error = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    } finally {
      clearInterval(messageInterval);
      setLoading(false);
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }
</script>

{#if browser}
  <div class="chat-input-container">
    <!-- 드래그 앤 드롭 영역 -->
    <div 
      class="drop-zone" 
      class:drag-over={isDragOver}
      on:dragover={handleDragOver}
      on:dragleave={handleDragLeave}
      on:drop={handleDrop}
      role="button"
      tabindex="0"
      aria-label="이미지 파일을 드래그 앤 드롭하거나 클릭하여 파일을 선택하세요"
    >
      <div class="input-wrapper">
        <textarea
          bind:value={prompt}
          on:keydown={handleKeydown}
          placeholder="질문을 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
          disabled={isLoading}
          rows="3"
        ></textarea>
        
        <div class="button-group">
          <button 
            type="button"
            on:click={openFileDialog}
            disabled={isLoading}
            class="file-button"
            title="이미지 파일 첨부"
            aria-label="이미지 파일 첨부"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21,15 16,10 5,21"></polyline>
            </svg>
          </button>
          
          <button 
            on:click={handleSubmit}
            disabled={(!prompt.trim() && !hasFiles) || isLoading}
            class="send-button"
          >
            {#if isLoading}
              <div class="spinner"></div>
              처리 중...
            {:else}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9"></polygon>
              </svg>
              전송
            {/if}
          </button>
        </div>
      </div>
      
      <!-- 숨겨진 파일 입력 -->
      <input
        bind:this={fileInput}
        type="file"
        multiple
        accept="image/*"
        on:change={handleFileSelect}
        style="display: none;"
      />
    </div>
    
    <!-- 선택된 파일 미리보기 -->
    {#if hasFiles}
      <div class="file-preview">
        <div class="file-preview-header">
          <span class="file-count">선택된 파일: {selectedFiles.length}개</span>
          <button 
            type="button"
            on:click={() => selectedFiles = []}
            class="clear-files-btn"
            title="모든 파일 제거"
            aria-label="모든 파일 제거"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="file-list">
          {#each selectedFiles as file, index}
            <div class="file-item">
              <div class="file-info">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                </svg>
                <span class="file-name">{file.name}</span>
                <span class="file-size">({Math.round(file.size / 1024)}KB)</span>
              </div>
              <button 
                type="button"
                on:click={() => removeFile(index)}
                class="remove-file-btn"
                title="파일 제거"
                aria-label="파일 제거"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    <!-- 문자 수 표시 -->
    <div class="char-counter" class:over-limit={isOverLimit}>
      {charCount}/{MAX_PROMPT_LENGTH}
    </div>
    
    {#if error}
      <div class="error-message">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        {error}
      </div>
    {/if}
  </div>
{:else}
  <div class="chat-input-container">
    <div class="input-wrapper">
      <textarea
        placeholder="로딩 중..."
        disabled
        rows="3"
      ></textarea>
      
      <button 
        disabled
        class="send-button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22,2 15,22 11,13 2,9"></polygon>
        </svg>
        로딩 중...
      </button>
    </div>
  </div>
{/if}

<style>
  .chat-input-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    border-top: 1px solid #e5e7eb;
    padding: 1rem;
    box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 100;
  }

  .drop-zone {
    position: relative;
    max-width: 800px;
    margin: 0 auto;
    transition: all 0.2s ease;
  }

  .drop-zone.drag-over {
    background: rgba(59, 130, 246, 0.05);
    border: 2px dashed #3b82f6;
    border-radius: 0.75rem;
  }

  .input-wrapper {
    display: flex;
    gap: 0.75rem;
    align-items: flex-end;
  }

  .button-group {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
  }

  textarea {
    flex: 1;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-family: inherit;
    resize: vertical;
    min-height: 3rem;
    max-height: 8rem;
    transition: border-color 0.2s ease;
  }

  textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  textarea:disabled {
    background-color: #f9fafb;
    cursor: not-allowed;
  }

  .send-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .send-button:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .send-button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .file-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem;
    background: #f3f4f6;
    color: #6b7280;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 48px;
    height: 48px;
  }

  .file-button:hover:not(:disabled) {
    background: #e5e7eb;
    color: #374151;
    border-color: #d1d5db;
  }

  .file-button:disabled {
    background: #f9fafb;
    color: #9ca3af;
    cursor: not-allowed;
  }

  .file-preview {
    margin-top: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }

  .file-preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .file-count {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .clear-files-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    background: #f3f4f6;
    color: #6b7280;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .clear-files-btn:hover {
    background: #e5e7eb;
    color: #374151;
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .file-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    transition: all 0.2s ease;
  }

  .file-item:hover {
    border-color: #d1d5db;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  .file-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  .file-size {
    font-size: 0.75rem;
    color: #6b7280;
    white-space: nowrap;
  }

  .remove-file-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .remove-file-btn:hover {
    background: #fee2e2;
    color: #b91c1c;
    border-color: #fca5a5;
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

  .char-counter {
    text-align: right;
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: #6b7280;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }

  .char-counter.over-limit {
    color: #dc2626;
    font-weight: 600;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.5rem;
    color: #dc2626;
    font-size: 0.875rem;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }

  @media (max-width: 768px) {
    .input-wrapper {
      flex-direction: column;
      align-items: stretch;
    }
    
    .button-group {
      justify-content: center;
    }
    
    .send-button {
      justify-content: center;
    }
    
    .file-preview {
      margin-top: 0.75rem;
      padding: 0.75rem;
    }
    
    .file-name {
      max-width: 150px;
    }
  }
</style>
