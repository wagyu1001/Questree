import { writable } from 'svelte/store';

// 노드 타입 정의
export interface TreeNode {
  id: string;
  parentId: string | null;
  title: string;
  content: string;
  question: string; // 사용자의 질문 텍스트
  timestamp: string;
  children: string[]; // 자식 노드들의 ID 배열
  level: number; // 트리에서의 깊이 레벨
  position: { x: number; y: number }; // 트리 뷰에서의 위치
}

// 대화 상태 타입 정의
export interface ConversationState {
  nodes: Record<string, TreeNode>;
  activeTabId: string | null;
  rootNodeId: string | null;
  nextNodeId: number;
  isLoading: boolean;
  loadingMessage: string;
}

// 초기 상태
const initialState: ConversationState = {
  nodes: {},
  activeTabId: null,
  rootNodeId: null,
  nextNodeId: 1,
  isLoading: false,
  loadingMessage: ''
};

// 대화 상태 스토어
export const conversationStore = writable<ConversationState>(initialState);

// 노드 생성 함수
export function createNode(
  title: string, 
  content: string, 
  parentId: string | null = null,
  question: string = title // 질문 텍스트 (기본값은 title)
): TreeNode {
  const id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    parentId,
    title: title.length > 50 ? title.substring(0, 50) + '...' : title,
    content,
    question: question.length > 50 ? question.substring(0, 50) + '...' : question,
    timestamp: new Date().toISOString(),
    children: [],
    level: parentId ? 1 : 0, // 나중에 계산으로 업데이트됨
    position: { x: 0, y: 0 } // 나중에 계산으로 업데이트됨
  };
}

// 노드 추가 함수
export function addNode(node: TreeNode) {
  conversationStore.update(state => {
    const newState = { ...state };
    
    // 새 노드 추가
    newState.nodes[node.id] = node;
    
    // 부모 노드가 있다면 부모의 children 배열에 추가
    if (node.parentId && newState.nodes[node.parentId]) {
      newState.nodes[node.parentId].children.push(node.id);
      
      // 레벨 계산 (부모 레벨 + 1)
      node.level = newState.nodes[node.parentId].level + 1;
    } else {
      // 루트 노드인 경우
      newState.rootNodeId = node.id;
      node.level = 0;
    }
    
    // 활성 탭을 새 노드로 설정
    newState.activeTabId = node.id;
    
    return newState;
  });
}

// 활성 탭 변경 함수
export function setActiveTab(nodeId: string) {
  conversationStore.update(state => {
    if (state.nodes[nodeId]) {
      return { ...state, activeTabId: nodeId };
    }
    return state;
  });
}


// 트리 위치 계산 함수
export function calculateTreePositions() {
  conversationStore.update(state => {
    const newState = { ...state };
    const nodes = newState.nodes;
    
    if (!newState.rootNodeId) return newState;
    
    // 각 레벨별로 노드들을 그룹화
    const levelGroups: Record<number, TreeNode[]> = {};
    
    Object.values(nodes).forEach(node => {
      if (!levelGroups[node.level]) {
        levelGroups[node.level] = [];
      }
      levelGroups[node.level].push(node);
    });
    
    // 각 레벨의 노드들을 수평으로 배치 (parent 오른쪽에 child)
    Object.keys(levelGroups).forEach(levelStr => {
      const level = parseInt(levelStr);
      const levelNodes = levelGroups[level];
      
      levelNodes.forEach((node, index) => {
        const verticalSpacing = 100; // 같은 레벨 내 노드 간 수직 간격 (150 → 100)
        const horizontalSpacing = 200; // 레벨 간 수평 간격 (300 → 200)
        const startY = -((levelNodes.length - 1) * verticalSpacing) / 2;
        
        node.position = {
          x: level * horizontalSpacing + 50, // 오른쪽으로 이동
          y: startY + (index * verticalSpacing) + 100 // 중앙 정렬
        };
      });
    });
    
    return newState;
  });
}

// 현재 활성 노드 가져오기
export function getActiveNode(state: ConversationState): TreeNode | null {
  if (!state.activeTabId) return null;
  return state.nodes[state.activeTabId] || null;
}

// 루트 노드 가져오기
export function getRootNode(state: ConversationState): TreeNode | null {
  if (!state.rootNodeId) return null;
  return state.nodes[state.rootNodeId] || null;
}

// 특정 노드의 모든 자식 노드들 가져오기 (재귀적)
export function getAllChildren(nodeId: string, state: ConversationState): TreeNode[] {
  const node = state.nodes[nodeId];
  if (!node) return [];
  
  const children: TreeNode[] = [];
  
  const collectChildren = (id: string) => {
    const childNode = state.nodes[id];
    if (childNode) {
      children.push(childNode);
      childNode.children.forEach(collectChildren);
    }
  };
  
  node.children.forEach(collectChildren);
  return children;
}

// 로딩 상태 설정 함수
export function setLoading(isLoading: boolean, message: string = '') {
  conversationStore.update(state => ({
    ...state,
    isLoading,
    loadingMessage: message
  }));
}

// 로딩 상태 가져오기 함수
export function getLoadingState(state: ConversationState): { isLoading: boolean; loadingMessage: string } {
  return {
    isLoading: state.isLoading,
    loadingMessage: state.loadingMessage
  };
}

// 기존 노드에 답변 추가 함수
export function appendToNode(nodeId: string, newAnswer: string, newQuestion: string) {
  conversationStore.update(state => {
    const newState = { ...state };
    const node = newState.nodes[nodeId];
    
    if (!node) return state;
    
    // 기존 답변에 새로운 답변을 추가
    const separator = '\n\n---\n\n';
    const updatedContent = node.content + separator + `**질문:** ${newQuestion}\n\n**답변:** ${newAnswer}`;
    
    // 노드 업데이트
    newState.nodes[nodeId] = {
      ...node,
      content: updatedContent,
      timestamp: new Date().toISOString() // 타임스탬프 업데이트
    };
    
    return newState;
  });
}
