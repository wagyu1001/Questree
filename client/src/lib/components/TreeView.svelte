<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { conversationStore, setActiveTab, calculateTreePositions, getRootNode } from '../stores.js';
  import type { TreeNode } from '../stores.js';
  import { translationsStore, formatText } from '../stores/languageStore.js';
  
  let treeContainer: HTMLElement;
  let nodes: TreeNode[] = [];
  let rootNode: TreeNode | null = null;
  let activeTabId: string | null = null;

  // 아코디언 토글 기능
  let isCollapsed = false;

  // 줌/팬 기능 관련 변수들
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let isPanning = false;
  let lastPanX = 0;
  let lastPanY = 0;
  let svgElement: SVGSVGElement;
  
  // 터치 이벤트 관련 변수들
  let isTouching = false;
  let lastTouchX = 0;
  let lastTouchY = 0;
  let touchStartDistance = 0;
  let touchStartScale = 1;

  // 스토어 구독
  $: {
    const state = $conversationStore;
    const newNodes = Object.values(state.nodes);
    nodes = newNodes;
    rootNode = getRootNode(state);
    activeTabId = state.activeTabId;
    
    if (nodes.length > 0) {
      calculateTreePositions();
      if (browser) {
        setTimeout(() => {
          resizeTreeView();
          updateTransform();
          checkNodeChanges();
        }, 50);
      }
    }
  }

  // 간선 업데이트 관련
  let connectionKey = 0;
  let lastNodeCount = 0;
  let lastNodePositions = '';

  function handleNodeClick(nodeId: string) {
    setActiveTab(nodeId);
  }

  // 아코디언 토글 함수
  function toggleAccordion() {
    isCollapsed = !isCollapsed;
  }

  // 줌 기능
  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.95 : 1.05;
    const newScale = Math.max(0.1, Math.min(5, scale * delta));
    const rect = svgElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const scaleDiff = newScale - scale;
    translateX -= (x - translateX) * scaleDiff / scale;
    translateY -= (y - translateY) * scaleDiff / scale;
    scale = newScale;
    updateTransform();
  }

  // 팬 기능 (마우스)
  function handleMouseDown(event: MouseEvent) {
    if (event.button === 0) {
      isPanning = true;
      lastPanX = event.clientX;
      lastPanY = event.clientY;
      treeContainer.style.cursor = 'grabbing';
    }
  }
  function handleMouseMove(event: MouseEvent) {
    if (isPanning) {
      const deltaX = event.clientX - lastPanX;
      const deltaY = event.clientY - lastPanY;
      translateX += deltaX * 0.7;
      translateY += deltaY * 0.7;
      lastPanX = event.clientX;
      lastPanY = event.clientY;
      updateTransform();
    }
  }
  function handleMouseUp() {
    isPanning = false;
    treeContainer.style.cursor = 'grab';
  }

  // 터치 이벤트 핸들러
  function handleTouchStart(event: TouchEvent) {
    event.preventDefault();
    const touches = event.touches;
    
    if (touches.length === 1) {
      // 단일 터치 - 팬
      isTouching = true;
      lastTouchX = touches[0].clientX;
      lastTouchY = touches[0].clientY;
    } else if (touches.length === 2) {
      // 두 손가락 터치 - 줌
      isTouching = true;
      const touch1 = touches[0];
      const touch2 = touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      touchStartDistance = distance;
      touchStartScale = scale;
    }
  }

  function handleTouchMove(event: TouchEvent) {
    event.preventDefault();
    const touches = event.touches;
    
    if (touches.length === 1 && isTouching) {
      // 단일 터치 - 팬
      const deltaX = touches[0].clientX - lastTouchX;
      const deltaY = touches[0].clientY - lastTouchY;
      translateX += deltaX * 0.7;
      translateY += deltaY * 0.7;
      lastTouchX = touches[0].clientX;
      lastTouchY = touches[0].clientY;
      updateTransform();
    } else if (touches.length === 2 && isTouching) {
      // 두 손가락 터치 - 줌
      const touch1 = touches[0];
      const touch2 = touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      if (touchStartDistance > 0) {
        const scaleRatio = distance / touchStartDistance;
        const newScale = Math.max(0.1, Math.min(5, touchStartScale * scaleRatio));
        scale = newScale;
        updateTransform();
      }
    }
  }

  function handleTouchEnd(event: TouchEvent) {
    event.preventDefault();
    isTouching = false;
    touchStartDistance = 0;
    touchStartScale = 1;
  }

  // transform 적용
  function updateTransform() {
    if (svgElement) {
      svgElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }
  }

  function resetZoom() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
  }
  function zoomIn() {
    const newScale = Math.min(5, scale * 1.2);
    const scaleDiff = newScale - scale;
    const centerX = treeContainer.clientWidth / 2;
    const centerY = treeContainer.clientHeight / 2;
    translateX -= (centerX - translateX) * scaleDiff / scale;
    translateY -= (centerY - translateY) * scaleDiff / scale;
    scale = newScale;
    updateTransform();
  }
  
  function zoomOut() {
    const newScale = Math.max(0.1, scale * 0.8);
    const scaleDiff = newScale - scale;
    const centerX = treeContainer.clientWidth / 2;
    const centerY = treeContainer.clientHeight / 2;
    translateX -= (centerX - translateX) * scaleDiff / scale;
    translateY -= (centerY - translateY) * scaleDiff / scale;
    scale = newScale;
    updateTransform();
  }

  // 간선 다시 그리기
  function forceRedrawConnections() {
    connectionKey += 1;
  }

  function checkNodeChanges() {
    const currentCount = nodes.length;
    const currentPositions = nodes.map(n => `${n.id}:${n.position.x},${n.position.y}`).join('|');
    if (currentCount !== lastNodeCount || currentPositions !== lastNodePositions) {
      lastNodeCount = currentCount;
      lastNodePositions = currentPositions;
      forceRedrawConnections();
    }
  }

  function generatePath(from: TreeNode, to: TreeNode): string {
    const startX = from.position.x + 30;
    const startY = from.position.y;
    const endX = to.position.x - 30;
    const endY = to.position.y;
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }

  function generateAllPaths(): string[] {
    const paths: string[] = [];
    if (nodes.length <= 1) return paths;
    nodes.forEach(node => {
      if (node.parentId) {
        const parent = nodes.find(n => n.id === node.parentId);
        if (parent) {
          paths.push(generatePath(parent, node));
        }
      }
    });
    return paths;
  }

  let _paths: string[] = [];
  $: if (connectionKey) {
    _paths = generateAllPaths();
  }

  // 트리 뷰 크기 조정
  function resizeTreeView() {
    if (!treeContainer || nodes.length === 0) return;
    const padding = 80;
    const minX = Math.min(...nodes.map(n => n.position.x)) - padding;
    const maxX = Math.max(...nodes.map(n => n.position.x)) + padding;
    const minY = Math.min(...nodes.map(n => n.position.y)) - padding;
    const maxY = Math.max(...nodes.map(n => n.position.y)) + padding;
    const width = maxX - minX;
    const height = maxY - minY;

    const svg = treeContainer.querySelector('.tree-svg') as SVGSVGElement;
    if (svg) {
      svgElement = svg;
      svg.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
      svg.style.width = '100%';
      svg.style.height = '100%';
    }
  }

  onMount(() => {
    if (browser) {
      const initTreeView = () => {
        if (treeContainer) {
          resizeTreeView();
          scale = 1;
          translateX = 0;
          translateY = 0;
          updateTransform();
          treeContainer.addEventListener('wheel', handleWheel, { passive: false });
          treeContainer.addEventListener('mousedown', handleMouseDown);
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
          // 터치 이벤트는 HTML에서 직접 바인딩하므로 여기서는 추가하지 않음
        } else {
          setTimeout(initTreeView, 0);
        }
      };
      initTreeView();
    }
    return () => {
      if (treeContainer) {
        treeContainer.removeEventListener('wheel', handleWheel);
        treeContainer.removeEventListener('mousedown', handleMouseDown);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  });

  $: if (browser && nodes.length > 0) {
    const hasValidPositions = nodes.every(n => n.position && n.position.x !== undefined && n.position.y !== undefined);
    if (hasValidPositions) {
      setTimeout(() => {
        resizeTreeView();
        updateTransform();
        checkNodeChanges();
      }, 150);
    }
  }
</script>

{#if browser}
  {#if rootNode}
    <div class="tree-view">
      <div class="tree-header">
        <div class="header-left" on:click={toggleAccordion} on:keydown={(e) => e.key === 'Enter' && toggleAccordion()} role="button" tabindex="0" aria-label="트리 뷰 접기/펼치기">
          <button class="accordion-toggle" class:collapsed={isCollapsed} aria-label="아코디언 토글">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6,9 12,15 18,9"></polyline>
            </svg>
          </button>
          <h3>{$translationsStore.conversationTree}</h3>
        </div>
        <div class="tree-controls" role="group" aria-label="{$translationsStore.conversationTree} 컨트롤">
          <div class="zoom-controls">
            <button class="zoom-btn" on:click={zoomOut}>-</button>
            <span class="zoom-level">{Math.round(scale * 100)}%</span>
            <button class="zoom-btn" on:click={zoomIn}>+</button>
            <button class="zoom-btn reset" on:click={resetZoom}>⌂</button>
          </div>
          <div class="tree-info">{formatText($translationsStore.nodes, { count: nodes.length })}</div>
        </div>
      </div>
      <div class="tree-content" class:collapsed={isCollapsed}>
        <div 
          class="tree-container" 
          bind:this={treeContainer}
          on:touchstart={handleTouchStart}
          on:touchmove={handleTouchMove}
          on:touchend={handleTouchEnd}
        >
          <svg class="tree-svg" preserveAspectRatio="xMidYMid meet">
            {#each _paths as path}
              <path d={path} stroke="#3b82f6" stroke-width="3" fill="none" class="connection-line"
                stroke-linecap="round" stroke-dasharray="5,5" />
            {/each}
            {#each nodes as node (node.id)}
              <g class="node-group" transform="translate({node.position.x}, {node.position.y})">
                <circle r="25" class="node-circle" class:active={activeTabId === node.id}
                  on:click={() => handleNodeClick(node.id)} 
                  on:keydown={(e) => e.key === 'Enter' && handleNodeClick(node.id)}
                  on:mousedown|preventDefault
                  on:dragstart|preventDefault
                  on:touchstart|preventDefault
                  role="button"
                  tabindex="0"
                  aria-label="노드 {node.question} 클릭" />
                <text x="0" y="6" text-anchor="middle" class="node-icon">{node.level === 0 ? '🏠' : '💬'}</text>
                <text x="0" y="45" text-anchor="middle" class="node-title">
                  {#each node.question.split(' ').slice(0, 3) as word, i}
                    <tspan x="0" dy="{i * 8}">{word}</tspan>
                  {/each}
                  {#if node.question.split(' ').length > 3}
                    <tspan x="0" dy="8">...</tspan>
                  {/if}
                </text>
              </g>
            {/each}
          </svg>
        </div>
      </div>
    </div>
  {:else}
    <div class="tree-view empty">
      <div class="tree-header">
        <div class="header-left" on:click={toggleAccordion} on:keydown={(e) => e.key === 'Enter' && toggleAccordion()} role="button" tabindex="0" aria-label="트리 뷰 접기/펼치기">
          <button class="accordion-toggle" class:collapsed={isCollapsed} aria-label="아코디언 토글">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6,9 12,15 18,9"></polyline>
            </svg>
          </button>
          <h3>{$translationsStore.conversationTree}</h3>
        </div>
      </div>
      <div class="tree-content" class:collapsed={isCollapsed}>
        <div class="empty-tree">
          <p>{$translationsStore.emptyTree}<br>{$translationsStore.emptyTreeDesc}</p>
        </div>
      </div>
    </div>
  {/if}
{:else}
  <div class="tree-view empty">
    <div class="tree-header">
      <div class="header-left" on:click={toggleAccordion} on:keydown={(e) => e.key === 'Enter' && toggleAccordion()} role="button" tabindex="0" aria-label="트리 뷰 접기/펼치기">
        <button class="accordion-toggle" class:collapsed={isCollapsed} aria-label="아코디언 토글">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </button>
        <h3>{$translationsStore.conversationTree}</h3>
      </div>
    </div>
    <div class="tree-content" class:collapsed={isCollapsed}>
      <div class="empty-tree">
        <p>{$translationsStore.loading}</p>
      </div>
    </div>
  </div>
{/if}

<style>
  .tree-view {
    position: fixed;
    top: 120px;
    right: 1rem;
    width: 350px;
    max-height: calc(100vh - 200px);
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 100;
    overflow: hidden;
  }
  .tree-container {
    position: relative;
    width: 100%;
    height: 250px;
    overflow: hidden;
    background: #fafafa;
    border-radius: 0.5rem;
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    touch-action: none; /* 터치 스크롤 방지 */
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }

  .tree-container:active {
    cursor: grabbing;
  }
  .tree-svg {
    position: relative;
    width: 100%;
    height: 100%;
    transform-origin: 0 0;
    transition: transform 0.1s ease-out;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }
  .node-group {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }

  .node-circle {
    fill: #f3f4f6;
    stroke: #d1d5db;
    stroke-width: 2;
    transition: all 0.2s ease;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    r: 25;
  }
  .node-circle.active {
    fill: #3b82f6;
    stroke: #2563eb;
    stroke-width: 3;
  }
  .node-circle:hover {
    fill: #e5e7eb;
    stroke: #9ca3af;
  }
  .node-circle:active {
    transform: scale(0.95);
  }
  .node-icon {
    font-size: 16px;
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }
  .node-title {
    font-size: 10px;
    fill: #6b7280;
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    text-anchor: middle;
    dominant-baseline: middle;
    word-wrap: break-word;
    max-width: 80px;
  }
  .connection-line {
    transition: all 0.2s ease;
  }


  .connection-line:hover {
    stroke-width: 4;
    stroke-opacity: 1;
    filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3));
  }


  .empty-tree {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 160px;
    color: #9ca3af;
    text-align: center;
    padding: 1rem;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }


  .empty-tree p {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.4;
  }


  /* 반응형 디자인 */
  @media (max-width: 1024px) {
    .tree-view {
      position: relative;
      top: auto;
      right: auto;
      width: 100%;
      margin: 1rem;
      max-height: 250px;
      height: auto;
    }
    
    .tree-view.empty {
      width: 100%;
      max-height: 180px;
    }
    
    .tree-header {
      padding: 0.75rem;
    }
    
    .tree-header h3 {
      font-size: 0.9rem;
    }
    
    .tree-controls {
      gap: 0.5rem;
    }
    
    .zoom-controls {
      padding: 0.125rem;
    }
    
    .zoom-btn {
      width: 20px;
      height: 20px;
      font-size: 12px;
    }
    
    .zoom-level {
      font-size: 10px;
      min-width: 28px;
    }
    
    .tree-info {
      font-size: 0.7rem;
      padding: 0.125rem 0.375rem;
    }
  }

  .tree-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s ease;
  }

  .tree-header:hover {
    background: #f3f4f6;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.375rem;
    transition: background-color 0.2s ease;
  }

  .header-left:hover {
    background: rgba(59, 130, 246, 0.1);
  }

  .accordion-toggle {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
    color: #6b7280;
  }

  .accordion-toggle:hover {
    background: #e5e7eb;
    color: #374151;
  }

  .accordion-toggle svg {
    transition: transform 0.3s ease;
  }

  .accordion-toggle.collapsed svg {
    transform: rotate(-90deg);
  }

  .tree-content {
    overflow: hidden;
    transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
    max-height: 300px;
    opacity: 1;
    user-select: none; /* 트리 콘텐츠에서 텍스트 선택 비활성화 */
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }

  .tree-content.collapsed {
    max-height: 0;
    opacity: 0;
  }

  .tree-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    padding: 0.25rem;
  }

  .zoom-btn {
    width: 24px;
    height: 24px;
    border: none;
    background: #f3f4f6;
    border-radius: 0.25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }

  .zoom-btn:active {
    transform: scale(0.95);
    background: #e5e7eb;
  }

  .zoom-btn:hover {
    background: #e5e7eb;
    color: #1f2937;
  }

  .zoom-btn.reset {
    font-size: 12px;
  }

  .zoom-level {
    font-size: 11px;
    color: #6b7280;
    min-width: 32px;
    text-align: center;
    font-weight: 500;
  }

  .tree-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
  }

  .tree-info {
    font-size: 0.75rem;
    color: #6b7280;
    background: #e5e7eb;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
  }

  @media (max-width: 768px) {
    .tree-view {
      margin: 0.5rem;
      max-height: 200px;
    }
    
    .tree-view.empty {
      max-height: 140px;
    }
    
    .tree-header {
      padding: 0.5rem;
    }
    
    .tree-header h3 {
      font-size: 0.875rem;
    }
    
    .tree-container {
      height: 150px;
    }
    
    .tree-controls {
      flex-direction: column;
      gap: 0.25rem;
      align-items: flex-end;
    }
    
    .zoom-controls {
      order: 2;
    }
    
    .tree-info {
      order: 1;
      font-size: 0.65rem;
      padding: 0.125rem 0.25rem;
    }
    
    .node-title {
      font-size: 9px;
    }
    
    .node-icon {
      font-size: 14px;
    }
  }

  @media (max-width: 480px) {
    .tree-view {
      margin: 0.25rem;
      max-height: 180px;
    }
    
    .tree-view.empty {
      max-height: 120px;
    }
    
    .tree-header {
      padding: 0.375rem;
    }
    
    .tree-header h3 {
      font-size: 0.8rem;
    }
    
    .tree-container {
      height: 120px;
    }
    
    .zoom-btn {
      width: 18px;
      height: 18px;
      font-size: 11px;
    }
    
    .zoom-level {
      font-size: 9px;
      min-width: 24px;
    }
    
    .tree-info {
      font-size: 0.6rem;
      padding: 0.125rem 0.25rem;
    }
    
    .node-title {
      font-size: 8px;
    }
    
    .node-icon {
      font-size: 12px;
    }
    
    .empty-tree p {
      font-size: 0.8rem;
    }
  }
</style>
