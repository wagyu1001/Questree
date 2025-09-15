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

// Gemini AI 클라이언트 초기화 (프로덕션에서만)
let genAI = null;
if (process.env.NODE_ENV === 'production') {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// Google Cloud Billing 클라이언트 초기화 (프로덕션에서만)
let billingClient = null;
if (process.env.NODE_ENV === 'production') {
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

  billingClient = new CloudBillingClient({ auth });
}

// 🔍 Billing 상태 확인 함수 (프로덕션에서만)
async function checkCredits(billingAccountId) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔧 개발 모드: Billing 체크를 건너뜁니다.');
    return true; // 개발 환경에서는 항상 true 반환
  }
  
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

// 개발용 샘플 응답 데이터
const getSampleResponse = (prompt, selectedText, images, language = 'ko') => {
  const isImageQuery = images && images.length > 0;
  const hasSelectedText = selectedText && selectedText.trim().length > 0;
  
  if (language === 'en') {
    if (hasSelectedText) {
      return `This is a comprehensive sample response for development mode. You asked about "${selectedText}" and your question was: "${prompt}".

In a real production environment, this would be answered by Google's Gemini AI, which would provide detailed, contextual information based on the selected text and your specific question. The AI would analyze the context, provide relevant explanations, and potentially offer additional insights or related information.

The Gemini AI would examine the selected text carefully, understanding its meaning, context, and implications. It would then craft a response that directly addresses your question while providing comprehensive background information that helps you understand the topic more deeply.

For development purposes, this sample response demonstrates how the application would handle text selection and follow-up questions. The actual Gemini AI response would be much more detailed and tailored to your specific query, potentially including:

- Detailed explanations of key concepts
- Step-by-step breakdowns of complex topics
- Real-world examples and applications
- Related topics and connections
- Additional resources for further learning
- Visual aids or diagrams when helpful

This development mode helps you test the application's functionality without consuming API credits or making actual calls to external services. You can verify that text selection works properly, follow-up questions are generated correctly, and the tree visualization displays the conversation flow as expected.

The sample response also helps you understand how the UI will look and feel with longer, more detailed content, ensuring that the layout and styling work well with substantial text blocks.`;
    } else if (isImageQuery) {
      return `This is a comprehensive sample response for development mode. You uploaded an image for analysis.

In a real production environment, this would be analyzed by Google's Gemini AI, which would examine the image content, identify objects, text, or patterns, and provide detailed descriptions or answers to your questions about the image.

The AI would be able to recognize various elements in the image, understand context, and provide meaningful insights based on what it sees. This could include object detection, text recognition, scene understanding, or answering specific questions about the image content.

For development purposes, this sample response demonstrates how the application would handle image uploads and analysis requests without consuming API credits or making actual calls to external services.

The actual Gemini AI response would include:
- Detailed description of what's visible in the image
- Identification of objects, people, text, or other elements
- Analysis of the image's context and meaning
- Answers to specific questions about the image
- Suggestions for further exploration or learning
- Related information that might be helpful

This development mode allows you to test the image upload functionality, verify that images are processed correctly, and ensure that the UI handles image analysis responses appropriately. You can also test how the application handles different image formats and sizes.

The sample response helps you understand how image analysis results will be displayed in the interface, ensuring that the layout works well with both text and visual content.`;
    } else {
      return `This is a comprehensive sample response for development mode. Your question was: "${prompt}".

In a real production environment, this would be answered by Google's Gemini AI, which would provide detailed, helpful, and contextually appropriate responses to your question. The AI would analyze your question, understand the intent, and provide comprehensive information that directly addresses what you're asking.

The response would be tailored to your specific question, potentially including examples, explanations, step-by-step guidance, or additional relevant information that could be helpful for your learning or understanding.

This development mode allows you to test the application's functionality, user interface, and overall user experience without consuming API credits or making actual calls to external AI services.

The actual Gemini AI response would typically include:
- A direct answer to your question
- Detailed explanations of key concepts
- Step-by-step instructions if applicable
- Real-world examples and use cases
- Related topics and connections
- Additional resources for further learning
- Visual aids or diagrams when helpful
- Common pitfalls or things to watch out for

This comprehensive approach ensures that you get not just an answer, but a complete learning experience that helps you understand the topic deeply and apply the knowledge effectively.

The development mode sample response demonstrates how the application handles longer, more detailed content, ensuring that the UI layout, text formatting, and user experience work well with substantial responses.`;
    }
  } else {
    if (hasSelectedText) {
      return `개발 모드 샘플 응답입니다. "${selectedText}"에 대해 질문하셨고, 질문 내용은 "${prompt}"입니다.

실제 프로덕션 환경에서는 Google의 Gemini AI가 선택하신 텍스트와 질문을 분석하여 상세하고 맥락에 맞는 답변을 제공할 것입니다. AI는 텍스트의 의미를 파악하고, 질문의 의도를 이해하여 관련성 높은 정보를 제공합니다.

Gemini AI는 선택된 텍스트를 면밀히 검토하여 그 의미, 맥락, 그리고 함의를 이해할 것입니다. 그런 다음 질문에 직접적으로 답변하면서 주제를 더 깊이 이해할 수 있도록 도와주는 포괄적인 배경 정보를 제공할 것입니다.

개발 모드에서는 API 크레딧을 소모하지 않고도 애플리케이션의 기능을 테스트할 수 있습니다. 텍스트 선택, 추가 질문, 트리 구조 시각화 등의 기능이 모두 정상적으로 작동하는지 확인할 수 있습니다.

실제 Gemini AI 응답은 다음과 같은 내용을 포함할 것입니다:
- 핵심 개념에 대한 상세한 설명
- 복잡한 주제의 단계별 분석
- 실제 사례와 응용 예시
- 관련 주제와 연결점
- 추가 학습을 위한 자료
- 도움이 될 때 시각적 보조 자료나 다이어그램

이 샘플 응답은 또한 더 긴 상세한 내용으로 UI가 어떻게 보이고 느껴질지 이해하는 데 도움이 됩니다. 상당한 텍스트 블록과 함께 레이아웃과 스타일링이 잘 작동하는지 확인할 수 있습니다.

개발 과정에서 이 모드를 사용하면 실제 API 호출 없이도 모든 기능을 철저히 테스트할 수 있어, 개발 비용을 절약하면서도 완벽한 사용자 경험을 보장할 수 있습니다.`;
    } else if (isImageQuery) {
      return `개발 모드 샘플 응답입니다. 이미지 분석을 요청하셨습니다.

실제 프로덕션 환경에서는 Google의 Gemini AI가 업로드하신 이미지를 분석하여 상세한 설명을 제공할 것입니다. AI는 이미지의 내용을 인식하고, 객체나 텍스트를 식별하며, 질문에 대한 구체적인 답변을 제공합니다.

이미지 분석 기능은 시각적 학습에 매우 유용하며, 복잡한 다이어그램, 차트, 사진 등을 이해하는 데 도움을 줄 수 있습니다. AI는 이미지의 맥락을 파악하고 관련 정보를 종합하여 의미 있는 인사이트를 제공합니다.

개발 모드에서는 실제 API 호출 없이도 이미지 업로드와 처리 기능을 테스트할 수 있어, 개발 과정에서 크레딧을 절약할 수 있습니다.

실제 Gemini AI 응답은 다음과 같은 내용을 포함할 것입니다:
- 이미지에서 보이는 것에 대한 상세한 설명
- 객체, 사람, 텍스트 또는 기타 요소의 식별
- 이미지의 맥락과 의미 분석
- 이미지에 대한 구체적인 질문에 대한 답변
- 추가 탐색이나 학습을 위한 제안
- 도움이 될 수 있는 관련 정보

이 개발 모드를 통해 이미지 업로드 기능을 테스트하고, 이미지가 올바르게 처리되는지 확인하며, UI가 이미지 분석 응답을 적절히 처리하는지 검증할 수 있습니다.

또한 다양한 이미지 형식과 크기를 애플리케이션이 어떻게 처리하는지 테스트할 수 있으며, 이미지 분석 결과가 인터페이스에서 어떻게 표시될지 이해하는 데 도움이 됩니다.`;
    } else {
      return `개발 모드 샘플 응답입니다. 질문 내용은 "${prompt}"입니다.

실제 프로덕션 환경에서는 Google의 Gemini AI가 질문을 분석하여 상세하고 도움이 되는 답변을 제공할 것입니다. AI는 질문의 의도를 파악하고, 관련 정보를 종합하여 명확하고 이해하기 쉬운 설명을 제공합니다.

답변은 질문의 성격에 따라 다르게 구성될 수 있습니다. 개념 설명, 단계별 가이드, 예시 제공, 추가 학습 자료 제안 등 다양한 형태로 도움을 줄 수 있습니다.

개발 모드에서는 API 크레딧을 사용하지 않고도 애플리케이션의 모든 기능을 테스트할 수 있습니다. 질문 입력, 답변 표시, 텍스트 선택, 추가 질문 생성, 트리 구조 시각화 등의 기능이 모두 정상적으로 작동하는지 확인할 수 있습니다.

실제 Gemini AI 응답은 일반적으로 다음과 같은 내용을 포함할 것입니다:
- 질문에 대한 직접적인 답변
- 핵심 개념에 대한 상세한 설명
- 해당하는 경우 단계별 지침
- 실제 사례와 사용 예시
- 관련 주제와 연결점
- 추가 학습을 위한 자료
- 도움이 될 때 시각적 보조 자료나 다이어그램
- 주의해야 할 일반적인 함정이나 주의사항

이러한 포괄적인 접근 방식은 단순한 답변뿐만 아니라 주제를 깊이 이해하고 지식을 효과적으로 적용할 수 있도록 도와주는 완전한 학습 경험을 제공합니다.

개발 모드 샘플 응답은 애플리케이션이 더 길고 상세한 내용을 어떻게 처리하는지 보여주어, 상당한 응답과 함께 UI 레이아웃, 텍스트 포맷팅, 사용자 경험이 잘 작동하는지 확인할 수 있습니다.

이를 통해 개발 과정에서 실제 API 호출 없이도 모든 기능을 철저히 테스트할 수 있어, 개발 비용을 절약하면서도 완벽한 사용자 경험을 보장할 수 있습니다.`;
    }
  }
};

// 메인 API 엔드포인트
app.post('/api/ask', validateInput, async (req, res) => {
  try {
    const { prompt, images, selectedText } = req.body;
    const detectedLanguage = detectLanguage(prompt || '');
    
    // 개발 환경에서는 샘플 응답 반환
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔧 개발 모드: Gemini API 호출을 건너뛰고 샘플 응답을 반환합니다.');
      const sampleAnswer = getSampleResponse(prompt, selectedText, images, detectedLanguage);
      
      return res.status(200).json({ 
        answer: sampleAnswer,
        timestamp: new Date().toISOString(),
        mode: 'development'
      });
    }

    // 프로덕션 환경에서만 Gemini API 호출
    const billingAccountId = process.env.BILLING_ACCOUNT_ID;
    const hasCredit = await checkCredits(billingAccountId);

    if (!hasCredit) {
      return res.status(402).json({ 
        error: '무료 크레딧이 모두 소진되었거나 결제 계정이 비활성화되었습니다. Gemini 호출이 차단됩니다.' 
      });
    }
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'Gemini API 키가 설정되지 않았습니다. 서버 관리자에게 문의하세요.' 
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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
      timestamp: new Date().toISOString(),
      mode: 'production'
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
