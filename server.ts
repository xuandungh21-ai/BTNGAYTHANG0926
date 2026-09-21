import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

function getGeminiAI() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function extractWithGemini(ai: GoogleGenAI, contents: any, schema: any) {
  // Try modern standard models: primary is gemini-3.8-flash, with fallback options
  const candidateModels = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errStr = String(err?.message || err);
        const isUnavailable =
          errStr.includes("503") ||
          errStr.includes("high demand") ||
          errStr.includes("UNAVAILABLE") ||
          err?.status === "UNAVAILABLE" ||
          err?.code === 503;

        if (isUnavailable) {
          console.warn(`[Gemini] Model ${model} attempt ${attempt + 1} experienced 503/high demand. Backing off...`);
          await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1500));
          continue;
        }

        // For non-transient errors (like invalid key), rethrow immediately
        throw err;
      }
    }
  }

  throw lastError;
}

app.post("/api/extract-pdf", async (req, res) => {
  try {
    const { base64Data, mimeType } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: "Missing base64Data in request body." });
    }

    const ai = getGeminiAI();

    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          hoSoSo: {
            type: Type.STRING,
            description: "Số hồ sơ hoặc Mã hồ sơ tìm thấy trong văn bản. (Ví dụ: HS-001, 123/QD-UBND...)",
          },
          ngayBatDau: {
            type: Type.STRING,
            description: "Ngày bắt đầu hiệu lực hoặc ngày ký. Trả về định dạng DD/MM/YYYY.",
          },
          ngayKetThuc: {
            type: Type.STRING,
            description: "Ngày kết thúc hoặc hết hạn. Trả về định dạng DD/MM/YYYY. Nếu không có, để trống.",
          },
          soTrang: {
            type: Type.INTEGER,
            description: "Tổng số trang của tài liệu được ghi trong văn bản (ví dụ: 'số lượng trang: 05') hoặc ước lượng.",
          },
        },
        required: ["hoSoSo", "ngayBatDau", "soTrang"],
      },
    };

    const contents = {
      parts: [
        {
          inlineData: {
            mimeType: mimeType || "application/pdf",
            data: base64Data,
          },
        },
        {
          text: `Bạn là một trợ lý ảo chuyên bóc tách dữ liệu từ văn bản hành chính Việt Nam.
Nhiệm vụ của bạn là phải đọc và phân tích TOÀN BỘ tất cả các trang của file PDF đính kèm (không bỏ sót bất kỳ trang nào từ trang đầu tiên đến trang cuối cùng).

Vì file PDF này có thể chứa một hoặc nhiều hồ sơ, quyết định, hoặc văn bản hành chính khác nhau nằm rải rác trên các trang khác nhau (mỗi hồ sơ có thể kéo dài một hoặc nhiều trang, hoặc mỗi trang chứa một hồ sơ riêng biệt), bạn hãy bóc tách đầy đủ thông tin của TẤT CẢ các hồ sơ/văn bản hành chính tìm thấy trên tất cả các trang của file PDF đính kèm.

Yêu cầu chi tiết cho từng hồ sơ/văn bản tìm thấy:
1. "hoSoSo": Tìm số hiệu hồ sơ, số quyết định, hoặc số văn bản xuất hiện trong hồ sơ đó. (Ví dụ: HS-001, 123/QĐ-UBND...). Hãy đảm bảo lấy chính xác tất cả các số hồ sơ từ các trang khác nhau.
2. "ngayBatDau": Tìm ngày văn bản có hiệu lực hoặc ngày ký của hồ sơ đó. Định dạng chuẩn DD/MM/YYYY.
3. "ngayKetThuc": Tìm ngày văn bản hết hiệu lực hoặc ngày kết thúc của hồ sơ đó. Định dạng chuẩn DD/MM/YYYY. Nếu chỉ có một ngày hoặc không tìm thấy ngày kết thúc cụ thể, hãy để trống trường này hoặc dùng chính ngày bắt đầu nếu văn bản có tính chất có hiệu lực trong ngày.
4. "soTrang": Tìm thông tin về số lượng trang thực tế của hồ sơ/văn bản cụ thể đó (thường ghi ở phần nơi nhận hoặc header/footer, hoặc tự bạn ước lượng/đếm xem hồ sơ đó kéo dài bao nhiêu trang). Định dạng trả về phải là một số nguyên đại diện cho số trang.

Hãy trả về kết quả dưới dạng mảng JSON chứa tất cả các phần tử đã bóc tách được từ toàn bộ các trang của file PDF đính kèm. Tuyệt đối không được gộp chung hay chỉ bóc tách trang đầu tiên.`,
        },
      ],
    };

    const response = await extractWithGemini(ai, contents, schema);

    const textResponse = response.text;
    if (!textResponse) {
      return res.status(500).json({ error: "EMPTY_RESPONSE" });
    }

    const data = JSON.parse(textResponse);
    return res.json({ data });
  } catch (error: any) {
    console.error("Server Gemini extraction error:", error);
    let errorMessage = error?.message || "An error occurred during processing.";
    let errorCode = "UNKNOWN_ERROR";
    let statusCode = 500;

    // Check if error contains structured ApiError JSON
    if (typeof errorMessage === "string") {
      try {
        const jsonMatch = errorMessage.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (
            parsed?.error?.code === 503 ||
            parsed?.error?.status === "UNAVAILABLE" ||
            parsed?.error?.message?.includes("high demand")
          ) {
            errorCode = "SERVICE_UNAVAILABLE";
            statusCode = 503;
            errorMessage = "Máy chủ AI hiện đang chịu tải cao tạm thời. Vui lòng thử lại sau giây lát.";
          } else if (parsed?.error?.code === 429 || parsed?.error?.status === "RESOURCE_EXHAUSTED") {
            errorCode = "QUOTA_EXHAUSTED";
            statusCode = 429;
            errorMessage = "Đã đạt giới hạn hạn mức (quota) API.";
          } else if (parsed?.error?.message) {
            errorMessage = parsed.error.message;
          }
        }
      } catch {
        // Ignore JSON parse error and fallback to string checks
      }
    }

    const lowerMsg = String(errorMessage).toLowerCase();
    if (lowerMsg.includes("503") || lowerMsg.includes("high demand") || lowerMsg.includes("unavailable")) {
      errorCode = "SERVICE_UNAVAILABLE";
      statusCode = 503;
      errorMessage = "Máy chủ AI hiện đang chịu tải cao tạm thời. Vui lòng thử lại sau giây lát.";
    } else if (lowerMsg.includes("429") || lowerMsg.includes("quota") || lowerMsg.includes("resource_exhausted")) {
      errorCode = "QUOTA_EXHAUSTED";
      statusCode = 429;
    } else if (lowerMsg.includes("api_key") || lowerMsg.includes("403") || lowerMsg.includes("permission")) {
      errorCode = "API_KEY_ERROR";
      statusCode = 403;
    }

    return res.status(statusCode).json({
      error: errorCode,
      message: errorMessage,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
