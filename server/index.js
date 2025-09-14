import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAuth } from 'google-auth-library';
import { CloudBillingClient } from '@google-cloud/billing';

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
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: { error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 10, 
  message: { error: 'API 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/ask', apiLimiter);
app.use('/api/', generalLimiter);

// Gemini AI 클라이언트 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Google Cloud Billing 클라이언트 초기화
if (!process.env.GOOGLE_CREDENTIALS_B64) {
  throw new Error('환경 변수 GOOGLE_CREDENTIALS_B64가 필요합니다.');
}

const serviceAccount = JSON.parse(
  Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf8')
);

const auth = new GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

const billingClient = new CloudBillingClient({ auth });

// 🔍 Billing 상태 확인 함수
async function checkCredits(billingAccountId) {
  try {
    const [info] = await billingClient.getBillingAccount({
      name: `billingAccounts/${billingAccountId}`
    });

    // info.open === true → billing 계정이 열려 있음
    return info.open;
  } catch (err) {
    console.error('Billing API 오류:', err);
    return false;
  }
}

// 언어 감지 함수
function detectLanguage(text) {
  if (!text || text.trim().length === 0) return 'ko';
  const koreanPattern = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
  const englishPattern = /[a-zA-Z]/;
  const hasKorean = koreanPattern.test(text);
  const hasEnglish = englishPattern.test(text);
  if (hasKorean) return 'ko';
  if (hasEnglish) return 'en';
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
  if ((!prompt || prompt.trim().length === 0) && (!images || images.length === 0)) {
    return res.status(400).json({ error: '질문 텍스트나 이미지 중 하나는 입력해주세요.' });
  }
  if (prompt && typeof prompt !== 'string') {
    return res.status(400).json({ error: '유효한 프롬프트가 필요합니다.' });
  }
  if (prompt && prompt.trim().length > 0) {
    if (prompt.length < 3) {
      return res.status(400).json({ error: '프롬프트는 최소 3자 이상이어야 합니다.' });
    }
    if (prompt.length > 2000) {
      return res.status(400).json({ error: '프롬프트는 최대 2,000자까지 입력 가능합니다.' });
    }
    const lines = prompt.split('\n');
    if (lines.length > 20) {
      return res.status(400).json({ error: '프롬프트는 최대 20줄까지 입력 가능합니다.' });
    }
  }
  next();
};

// 메인 API 엔드포인트
app.post('/api/ask', validateInput, async (req, res) => {
  try {
    const billingAccountId = process.env.BILLING_ACCOUNT_ID;
    const hasCredit = await checkCredits(billingAccountId);

    if (!hasCredit) {
      return res.status(402).json({ 
        error: '무료 크레딧이 모두 소진되었거나 결제 계정이 비활성화되었습니다. Gemini 호출이 차단됩니다.' 
      });
    }

    const { prompt, images, selectedText } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'Gemini API 키가 설정되지 않았습니다. 서버 관리자에게 문의하세요.' 
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const detectedLanguage = detectLanguage(prompt || '');
    const fullPrompt = generatePrompt(prompt, selectedText, images, detectedLanguage);

    let content;
    if (images && images.length > 0) {
      const imageParts = images.map(img => ({
        inlineData: {
          data: img.data.split(',')[1],
          mimeType: img.type
        }
      }));
      content = [fullPrompt, ...imageParts];
    } else {
      content = fullPrompt;
    }

    const result = await model.generateContent(content);
    const response = await result.response;
    const answer = response.text();
    
    res.status(200).json({ 
      answer: answer,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Gemini API 호출 오류:', error);
    if (error.message.includes('API_KEY')) {
      res.status(500).json({ error: 'API 키가 유효하지 않습니다.' });
    } else if (error.message.includes('QUOTA')) {
      res.status(429).json({ error: 'API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' });
    } else {
      res.status(500).json({ error: 'AI 응답을 생성하는 중 오류가 발생했습니다.' });
    }
  }
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

app.listen(PORT, () => {
  console.log(`🚀 Questree 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
