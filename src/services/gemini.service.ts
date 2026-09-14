import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export interface FoodAnalysisResult {
  name: string;
  vietnameseName: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
  };
  confidence: number;
  ingredients: Array<{
    name: string;
    portion: string;
    calories: number;
  }>;
  portionSize: number;
  portionUnit: string;
  healthScore: number;
  nutritionAdvice: string;
}

export async function analyzeFoodImageServer(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  notes?: string
): Promise<FoodAnalysisResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trên server.');
  }

  // Clean base64 string
  let cleanBase64 = imageBase64;
  if (cleanBase64.includes(',')) {
    cleanBase64 = cleanBase64.split(',')[1];
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  
  // Try models in fallback order
  const modelCandidates = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  let lastError: Error | null = null;

  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const prompt = `Bạn là một chuyên gia dinh dưỡng và thị giác máy tính AI hàng đầu. Hãy nhận diện và phân tích chính xác món ăn / thức uống trong hình ảnh này.
${notes ? `Ghi chú thêm từ người dùng: "${notes}"` : ''}

YÊU CẦU: Trả về kết quả CHỈ bằng một JSON Object duy nhất, không dùng markdown code fence (không \`\`\`json), tuân thủ định dạng sau:
{
  "name": "Tên món ăn (tiếng Việt hoặc quốc tế)",
  "vietnameseName": "Tên món ăn chuẩn tiếng Việt (ví dụ: Phở Bò Tái Nạm, Cơm Tấm Sườn Bì Chả, Salad Ức Gà)",
  "macros": {
    "calories": 450,
    "protein": 28.5,
    "carbs": 52.0,
    "fat": 14.0,
    "fiber": 4.5,
    "sodium": 650
  },
  "confidence": 95,
  "ingredients": [
    { "name": "Ức gà áp chảo", "portion": "150g", "calories": 240 },
    { "name": "Xà lách & rau bina", "portion": "80g", "calories": 30 },
    { "name": "Sốt mè rang", "portion": "2 muỗng", "calories": 90 }
  ],
  "portionSize": 350,
  "portionUnit": "1 đĩa vừa (~350g)",
  "healthScore": 88,
  "nutritionAdvice": "Món ăn giàu đạm, lượng tinh bột vừa phải rất thích hợp cho mục tiêu tăng cơ giảm mỡ."
}`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType || 'image/jpeg',
          },
        },
      ]);

      const responseText = result.response.text();
      const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned) as FoodAnalysisResult;
      
      return parsed;
    } catch (err: any) {
      console.warn(`Model ${modelName} failed, trying next...`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể phân tích hình ảnh món ăn.');
}
