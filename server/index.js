import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';


dotenv.config();

// ES 모듈에서 __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 보안 헤더 설정
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS 설정
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://questree.onrender.com'] 
    : ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 요청 크기 제한
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 정적 파일 서빙 (프로덕션 환경에서 클라이언트 빌드 파일 제공)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// Rate limiting 설정
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100 요청
  message: { error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 10, // 최대 10 요청
  message: { error: 'API 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/ask', apiLimiter);
app.use('/api/', generalLimiter);

// Gemini AI 클라이언트 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 언어 감지 함수 (한국어, 영어만 지원)
function detectLanguage(text) {
  if (!text || text.trim().length === 0) return 'ko';
  
  // 한국어 패턴 (한글 문자)
  const koreanPattern = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
  
  // 영어 패턴 (라틴 문자)
  const englishPattern = /[a-zA-Z]/;
  
  const hasKorean = koreanPattern.test(text);
  const hasEnglish = englishPattern.test(text);
  
  // 한국어가 포함되어 있으면 한국어로 판단
  if (hasKorean) return 'ko';
  
  // 영어가 포함되어 있으면 영어로 판단
  if (hasEnglish) return 'en';
  
  // 기본값은 한국어
  return 'ko';
}

// 언어별 프롬프트 생성 함수
function generatePrompt(prompt, selectedText, images, language = 'ko') {
  const isImageQuery = images && images.length > 0;
  const lengthLimit = language === 'en' ? 1000 : 700;

  if (language === 'en') {
    if (selectedText) {
      return `Please answer the following question about "${selectedText}" in a clear and helpful manner. Keep your response within ${lengthLimit} characters.\n\nQuestion: ${prompt}`;
    } else if (isImageQuery) {
      return `Please analyze this image and provide a clear explanation. Keep your response within ${lengthLimit} characters.`;
    } else {
      return `Please answer the following question in a clear and helpful manner. Keep your response within ${lengthLimit} characters.\n\nQuestion: ${prompt}`;
    }
  } else {
    // 한국어
    if (selectedText) {
      return `${selectedText}에 관한 다음 질문에 대해 명확하고 도움이 되는 답변을 해주세요. 답변은 ${lengthLimit}자 이내로 작성해주세요.\n\n질문: ${prompt}`;
    } else if (isImageQuery) {
      return `이 이미지를 분석하고 명확한 설명을 제공해주세요. 답변은 ${lengthLimit}자 이내로 작성해주세요.`;
    } else {
      return `다음 질문에 대해 명확하고 도움이 되는 답변을 해주세요. 답변은 ${lengthLimit}자 이내로 작성해주세요.\n\n질문: ${prompt}`;
    }
  }
}

// 입력 검증 미들웨어
const validateInput = (req, res, next) => {
  const { prompt, images } = req.body;
  
  // 텍스트나 이미지 중 하나는 있어야 함
  if ((!prompt || prompt.trim().length === 0) && (!images || images.length === 0)) {
    return res.status(400).json({ error: '질문 텍스트나 이미지 중 하나는 입력해주세요.' });
  }
  
  // 텍스트가 있는 경우 검증
  if (prompt && typeof prompt !== 'string') {
    return res.status(400).json({ error: '유효한 프롬프트가 필요합니다.' });
  }
  
  // 텍스트가 있는 경우 길이 검증
  if (prompt && prompt.trim().length > 0) {
    if (prompt.length < 3) {
      return res.status(400).json({ error: '프롬프트는 최소 3자 이상이어야 합니다.' });
    }
    
    if (prompt.length > 2000) {
      return res.status(400).json({ error: '프롬프트는 최대 2,000자까지 입력 가능합니다.' });
    }
    
    // 줄 수 검증
    const lines = prompt.split('\n');
    if (lines.length > 20) {
      return res.status(400).json({ error: '프롬프트는 최대 20줄까지 입력 가능합니다.' });
    }
  }
  
  // 텍스트가 있는 경우 악의적인 패턴 검사
  if (prompt && prompt.trim().length > 0) {
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^>]*>/gi,
      /<object\b[^>]*>/gi,
      /<embed\b[^>]*>/gi,
      /<link\b[^>]*>/gi,
      /<meta\b[^>]*>/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /<form\b[^>]*>/gi,
      /<input\b[^>]*>/gi,
      /<button\b[^>]*>/gi,
      /<select\b[^>]*>/gi,
      /<textarea\b[^>]*>/gi
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(prompt)) {
        console.warn('Potentially malicious input detected:', { 
          ip: req.ip, 
          userAgent: req.get('User-Agent'),
          pattern: pattern.toString(),
          prompt: prompt.substring(0, 100) + '...'
        });
        return res.status(400).json({ error: '안전하지 않은 내용이 포함되어 있습니다.' });
      }
    }
    
    // HTML 태그 제거
    const sanitizedPrompt = prompt
      .replace(/<[^>]*>/g, '') // 모든 HTML 태그 제거
      .replace(/&[^;]+;/g, '') // HTML 엔티티 제거
      .trim();
    
    if (sanitizedPrompt.length < 3) {
      return res.status(400).json({ error: '유효한 텍스트를 입력해주세요.' });
    }
    
    req.body.prompt = sanitizedPrompt;
  }
  next();
};

// 메인 API 엔드포인트
app.post('/api/ask', validateInput, async (req, res) => {
  try {
    const { prompt, images, selectedText } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'Gemini API 키가 설정되지 않았습니다. 서버 관리자에게 문의하세요.' 
      });
    }

    // Gemini 모델 초기화
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // 언어 감지 및 프롬프트 생성
    const detectedLanguage = detectLanguage(prompt || '');
    const fullPrompt = generatePrompt(prompt, selectedText, images, detectedLanguage);
    
    // 이미지가 있는 경우 처리
    let content;
    if (images && images.length > 0) {
      const imageParts = images.map(img => ({
        inlineData: {
          data: img.data.split(',')[1], // Base64 데이터 부분만 추출
          mimeType: img.type
        }
      }));
      content = [fullPrompt, ...imageParts];
    } else {
      content = fullPrompt;
    }
    
    // Gemini API 호출
    const result = await model.generateContent(content);
    const response = await result.response;
    const answer = response.text();
    
    res.status(200).json({ 
      answer: answer,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Gemini API 호출 오류:', error);
    
    // 에러 타입에 따른 적절한 응답
    if (error.message.includes('API_KEY')) {
      res.status(500).json({ error: 'API 키가 유효하지 않습니다.' });
    } else if (error.message.includes('QUOTA')) {
      res.status(429).json({ error: 'API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' });
    } else {
      res.status(500).json({ error: 'AI 응답을 생성하는 중 오류가 발생했습니다.' });
    }
  }
});

// 추가 보안 헤더
app.use((req, res, next) => {
  // X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');
  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Referrer-Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions-Policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // 요청 로깅 (보안 모니터링)
  if (req.method === 'POST' && req.path === '/api/ask') {
    console.log(`API Request: ${req.method} ${req.path} from ${req.ip} at ${new Date().toISOString()}`);
  }
  
  next();
});

// 헬스 체크 엔드포인트
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Questree 서버가 정상적으로 작동 중입니다.',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 404 핸들러 (API 라우트가 아닌 경우)
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: '요청한 API 엔드포인트를 찾을 수 없습니다.' });
});

// SPA 라우팅을 위한 catch-all 핸들러 (프로덕션 환경)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// 에러 핸들러
app.use((error, req, res, next) => {
  console.error('서버 오류:', error);
  res.status(500).json({ 
    error: '서버 내부 오류가 발생했습니다.',
    message: process.env.NODE_ENV === 'development' ? error.message : '서버 오류'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Questree 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📡 API 엔드포인트: http://localhost:${PORT}/api/ask`);
  console.log(`🏥 헬스 체크: http://localhost:${PORT}/api/health`);
});
