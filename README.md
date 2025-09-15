# Questree - 인터랙티브 학습 맵

AI와의 대화를 트리 구조로 시각화하는 인터랙티브 학습 도구입니다. Google Gemini API를 사용하여 질문에 답변하고, 대화의 흐름을 수평 트리 구조로 시각화합니다.

## 주요 기능

- 🤖 **AI 채팅**: Google Gemini API를 통한 자연어 대화
- 🌳 **트리 시각화**: 대화 흐름을 수평 트리 구조로 표시
- 📝 **텍스트 선택 질문**: 답변에서 텍스트를 선택하여 추가 질문 가능
- 🎯 **탭 기반 네비게이션**: 각 질문과 답변을 별도 탭으로 관리
- 📱 **반응형 디자인**: 모바일과 데스크톱에서 모두 사용 가능

## 기술 스택

- **Frontend**: SvelteKit + TypeScript
- **Backend**: Node.js + Express
- **AI API**: Google Gemini API
- **스타일링**: CSS (Tailwind CSS 없이 순수 CSS)

## 설치 및 실행

### 1. 의존성 설치

```bash
# 루트 디렉토리에서
npm install

# 클라이언트 디렉토리에서
cd client
npm install
```

### 2. 환경 변수 설정

루트 디렉토리에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

Google Gemini API 키는 [Google AI Studio](https://makersuite.google.com/app/apikey)에서 발급받을 수 있습니다.

**개발 모드 vs 프로덕션 모드:**
- **개발 모드** (`NODE_ENV !== 'production'`): Gemini API를 호출하지 않고 샘플 응답을 반환합니다. 크레딧을 절약할 수 있습니다.
- **프로덕션 모드** (`NODE_ENV=production`): 실제 Gemini API를 호출하여 AI 응답을 제공합니다.

### 3. 개발 서버 실행

```bash
# 루트 디렉토리에서 (백엔드와 프론트엔드를 동시에 실행)
npm run dev

# 또는 개별적으로 실행
npm run server  # 백엔드만
npm run client  # 프론트엔드만
```

### 4. 브라우저에서 확인

- 프론트엔드: http://localhost:5173
- 백엔드 API: http://localhost:3000

## 사용 방법

1. **질문하기**: 하단의 입력창에 질문을 입력하고 전송합니다.
2. **답변 확인**: AI의 답변이 메인 화면에 표시됩니다.
3. **추가 질문**: 답변에서 궁금한 부분을 선택하면 "추가 질문" 버튼이 나타납니다.
4. **트리 탐색**: 우측 상단의 트리 뷰에서 대화 흐름을 확인하고 다른 질문으로 이동할 수 있습니다.

## 프로젝트 구조

```
questree/
├── server/                 # Express.js 백엔드
│   └── index.js           # 메인 서버 파일
├── client/                # SvelteKit 프론트엔드
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/ # UI 컴포넌트들
│   │   │   │   ├── ChatInput.svelte
│   │   │   │   ├── TabView.svelte
│   │   │   │   └── TreeView.svelte
│   │   │   └── stores.ts  # 상태 관리
│   │   └── routes/
│   │       └── +page.svelte # 메인 페이지
│   └── package.json
├── package.json           # 루트 패키지 설정
└── README.md
```

## API 엔드포인트

### POST /api/ask
AI에게 질문을 보내고 답변을 받습니다.

**요청:**
```json
{
  "prompt": "질문 내용"
}
```

**응답:**
```json
{
  "answer": "AI의 답변",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "mode": "development" // 또는 "production"
}
```

### GET /api/health
서버 상태를 확인합니다.

**응답:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "message": "Questree 서버가 정상적으로 작동 중입니다."
}
```

## Render 배포

### 1. Render 계정 생성 및 연결
1. [Render.com](https://render.com)에서 계정을 생성합니다.
2. GitHub 저장소를 Render에 연결합니다.

### 2. 환경 변수 설정
Render 대시보드에서 다음 환경 변수를 설정합니다:
- `GEMINI_API_KEY`: Google Gemini API 키
- `NODE_ENV`: `production`
- `PORT`: Render가 자동으로 설정

### 3. 배포 설정
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/api/health`

### 4. 배포 완료
배포가 완료되면 Render에서 제공하는 URL로 애플리케이션에 접근할 수 있습니다.

## 개발 정보

- **개발 모드**: `npm run dev`로 백엔드와 프론트엔드를 동시에 실행 (Gemini API 호출 없음)
- **프로덕션 빌드**: `npm run build`로 클라이언트 빌드
- **프로덕션 실행**: `NODE_ENV=production npm start`로 서버 실행 (실제 Gemini API 호출)

## 라이선스

MIT License

## 기여하기

1. 이 저장소를 포크합니다.
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다.

## 문제 해결

### API 키 오류
- `.env` 파일에 올바른 Gemini API 키가 설정되어 있는지 확인하세요.
- API 키가 유효하고 활성화되어 있는지 확인하세요.

### CORS 오류
- 백엔드 서버가 실행 중인지 확인하세요.
- 프론트엔드와 백엔드의 포트가 올바른지 확인하세요.

### 빌드 오류
- Node.js 버전이 18 이상인지 확인하세요.
- `npm install`을 다시 실행해보세요.
