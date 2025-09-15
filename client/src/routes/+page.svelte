<script lang="ts">
  import ChatInput from '../lib/components/ChatInput.svelte';
  import TabView from '../lib/components/TabView.svelte';
  import TreeView from '../lib/components/TreeView.svelte';
  import LanguageSelector from '../lib/components/LanguageSelector.svelte';
  import { translationsStore } from '../lib/stores/languageStore.js';
</script>

<svelte:head>
  <title>{$translationsStore.title} - Interactive Learning Map</title>
  <meta name="description" content="{$translationsStore.subtitle}" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
</svelte:head>

<main class="app">
  <header class="app-header">
    <div class="header-content">
      <div class="logo">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          <path d="M13 8H7"></path>
          <path d="M17 12H7"></path>
        </svg>
        <h1>{$translationsStore.title}</h1>
      </div>
      <div class="header-subtitle">
        {$translationsStore.subtitle}
      </div>
      <div class="header-controls">
        <LanguageSelector />
      </div>
    </div>
  </header>

  <div class="app-body">
    <div class="content-area">
      <TabView />
    </div>
    
    <div class="sidebar">
      <TreeView />
    </div>
  </div>

  <div class="input-area">
    <ChatInput />
  </div>
</main>


<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    background: #fafafa;
  }

  :global(*) {
    box-sizing: border-box;
  }

  /* 모바일 터치 최적화 */
  :global(*) {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  :global(input, textarea, [contenteditable]) {
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
    user-select: text;
  }

  :global(.content-text, .content-text *) {
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
    user-select: text;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #fafafa;
  }

  .app-header {
    background: white;
    border-bottom: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    z-index: 100;
  }

  .header-content {
    margin: 0 auto;
    padding: 1rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between; /* 양쪽 정렬 */
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .header-subtitle {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
    flex: 1;
    margin-left: 1rem;
  }
  
  .header-controls {
    display: flex;
    align-items: center;
  }

  .logo svg {
    color: #3b82f6;
  }

  .logo h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
    letter-spacing: -0.025em;
  }


  .app-body {
    flex: 1;
    display: flex;
    position: relative;
    overflow: visible; /* 트리 뷰가 잘리지 않도록 변경 */
  }

  .content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0; /* flexbox overflow 방지 */
  }

  .sidebar {
    position: relative;
    z-index: 10;
  }

  .input-area {
    position: relative;
    z-index: 200;
  }

  /* 반응형 디자인 */
  @media (max-width: 1024px) {
    .app-body {
      flex-direction: column;
    }
    
    .sidebar {
      order: -1;
      position: relative;
    }
    
    .header-content {
      padding: 1rem;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    
    .header-subtitle {
      margin-left: 0;
      margin-top: 0;
      font-size: 0.875rem;
      order: 2;
    }
    
    .header-controls {
      order: 3;
      align-self: flex-end;
    }
  }

  @media (max-width: 768px) {
    .header-content {
      padding: 0.75rem 1rem;
    }
    
    .logo h1 {
      font-size: 1.25rem;
    }
    
    .header-subtitle {
      font-size: 0.8rem;
      line-height: 1.3;
    }
  }

  @media (max-width: 480px) {
    .header-content {
      padding: 0.5rem 0.75rem;
    }
    
    .logo {
      gap: 0.5rem;
    }
    
    .logo svg {
      width: 24px;
      height: 24px;
    }
    
    .logo h1 {
      font-size: 1.125rem;
    }
    
    .header-subtitle {
      font-size: 0.75rem;
    }
  }

  /* 로딩 애니메이션 */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .app {
    animation: fadeIn 0.3s ease-out;
  }

  /* 스크롤바 스타일링 */
  :global(::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
  }

  :global(::-webkit-scrollbar-track) {
    background: #f1f5f9;
  }

  :global(::-webkit-scrollbar-thumb) {
    background: #cbd5e1;
    border-radius: 4px;
  }

  :global(::-webkit-scrollbar-thumb:hover) {
    background: #94a3b8;
  }

  /* 선택 텍스트 스타일링 */
  :global(::selection) {
    background: rgba(59, 130, 246, 0.2);
  }

  :global(::-moz-selection) {
    background: rgba(59, 130, 246, 0.2);
  }
</style>