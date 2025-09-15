<script lang="ts">
  import { languageStore, setLanguage } from '../stores/languageStore.js';
  import type { Language } from '../utils/i18n.js';
  
  let isOpen = false;
  
  function toggleDropdown() {
    isOpen = !isOpen;
  }
  
  function selectLanguage(language: Language) {
    setLanguage(language);
    isOpen = false;
  }
</script>

<div class="language-selector">
  <button 
    class="language-button"
    on:click={toggleDropdown}
    aria-label="언어 선택"
    title="언어 변경"
  >
    <div class="language-icon">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    </div>
    <div class="language-info">
      <span class="language-flag">{$languageStore === 'ko' ? '🇰🇷' : '🇺🇸'}</span>
      <span class="language-name">{$languageStore === 'ko' ? '한국어' : 'English'}</span>
    </div>
    <div class="dropdown-arrow {isOpen ? 'open' : ''}">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6,9 12,15 18,9"></polyline>
      </svg>
    </div>
  </button>
  
  {#if isOpen}
    <div class="language-dropdown">
      <button 
        class="language-option {$languageStore === 'ko' ? 'active' : ''}" 
        on:click={() => selectLanguage('ko')}
      >
        🇰🇷 한국어
      </button>
      
      <button 
        class="language-option {$languageStore === 'en' ? 'active' : ''}" 
        on:click={() => selectLanguage('en')}
      >
        🇺🇸 English
      </button>
    </div>
  {/if}
</div>

<style>
  .language-selector {
    position: relative;
    display: inline-block;
  }
  
  .language-button {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
    border: 2px solid #e2e8f0;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.875rem;
    color: #374151;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    min-width: 140px;
  }
  
  .language-button:hover {
    background: linear-gradient(135deg, #f1f5f9 0%, #f8fafc 100%);
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    transform: translateY(-1px);
  }
  
  .language-button:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .language-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    color: #3b82f6;
    flex-shrink: 0;
  }
  
  .language-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
  }
  
  .language-flag {
    font-size: 1.125rem;
    line-height: 1;
  }
  
  .language-name {
    font-weight: 600;
    color: #1f2937;
    font-size: 0.875rem;
  }
  
  .dropdown-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    color: #6b7280;
    transition: transform 0.3s ease;
    flex-shrink: 0;
  }
  
  .dropdown-arrow.open {
    transform: rotate(180deg);
  }
  
  .language-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.5rem;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 0.75rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    z-index: 1000;
    min-width: 160px;
    overflow: hidden;
    animation: slideDown 0.2s ease-out;
  }
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .language-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.875rem 1rem;
    background: white;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }
  
  .language-option:hover {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    color: #1f2937;
  }
  
  .language-option.active {
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    color: #1d4ed8;
    font-weight: 600;
  }
  
  .language-option:first-child {
    border-radius: 0.75rem 0.75rem 0 0;
  }
  
  .language-option:last-child {
    border-radius: 0 0 0.75rem 0.75rem;
  }
  
  /* 모바일 반응형 */
  @media (max-width: 768px) {
    .language-button {
      padding: 0.625rem 0.75rem;
      font-size: 0.8rem;
      min-width: 120px;
      gap: 0.5rem;
    }
    
    .language-icon {
      width: 16px;
      height: 16px;
    }
    
    .language-info {
      gap: 0.375rem;
    }
    
    .language-flag {
      font-size: 1rem;
    }
    
    .language-name {
      font-size: 0.8rem;
    }
    
    .dropdown-arrow {
      width: 14px;
      height: 14px;
    }
    
    .language-dropdown {
      min-width: 140px;
      margin-top: 0.375rem;
    }
    
    .language-option {
      padding: 0.75rem 0.875rem;
      font-size: 0.8rem;
      gap: 0.625rem;
    }
  }
  
  @media (max-width: 480px) {
    .language-button {
      padding: 0.5rem 0.625rem;
      min-width: 100px;
      gap: 0.375rem;
    }
    
    .language-icon {
      width: 14px;
      height: 14px;
    }
    
    .language-flag {
      font-size: 0.875rem;
    }
    
    .language-name {
      font-size: 0.75rem;
    }
    
    .dropdown-arrow {
      width: 12px;
      height: 12px;
    }
    
    .language-dropdown {
      min-width: 120px;
    }
    
    .language-option {
      padding: 0.625rem 0.75rem;
      font-size: 0.75rem;
      gap: 0.5rem;
    }
  }
</style>