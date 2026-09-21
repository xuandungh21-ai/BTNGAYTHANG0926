import { ExtractedData } from "../types";

/**
 * Converts a File object to a Base64 string suitable for sending to the backend API.
 */
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:application/pdf;base64,")
      const base64Content = base64String.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = () => reject(new Error("FAILED_TO_READ_FILE"));
    reader.readAsDataURL(file);
  });
};

export const extractPdfData = async (file: File): Promise<ExtractedData[]> => {
  try {
    const base64Data = await fileToGenerativePart(file);

    const response = await fetch("/api/extract-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        base64Data,
        mimeType: file.type || "application/pdf",
      }),
    });

    if (!response.ok) {
      const errRes = await response.json().catch(() => ({}));
      const errMsg = errRes.error || errRes.message || `HTTP ${response.status} - ${response.statusText}`;
      throw new Error(errMsg);
    }

    const result = await response.json();
    if (!result.data) {
      throw new Error("EMPTY_RESPONSE");
    }

    return result.data as ExtractedData[];

  } catch (error: any) {
    console.error("Error extraction PDF:", error);
    
    let message = "";
    if (typeof error === "string") {
        message = error;
    } else if (error instanceof Error) {
        message = error.message;
    } else if (typeof error === "object" && error !== null) {
        if (error.error && error.error.message) {
            message = error.error.message;
        } else if (error.message) {
            message = error.message;
        } else {
            message = JSON.stringify(error);
        }
    }

    // Normalized error checking
    const normalizedMessage = message.toLowerCase();

    if (
      normalizedMessage.includes("service_unavailable") ||
      normalizedMessage.includes("503") ||
      normalizedMessage.includes("high demand") ||
      normalizedMessage.includes("unavailable")
    ) {
      throw new Error("SERVICE_UNAVAILABLE");
    }

    if (normalizedMessage.includes("429") || 
        normalizedMessage.includes("quota") || 
        normalizedMessage.includes("resource_exhausted") ||
        normalizedMessage.includes("exhausted")) {
        throw new Error("QUOTA_EXHAUSTED");
    }

    if (normalizedMessage.includes("failed_to_read_file")) throw new Error("FAILED_TO_READ_FILE");
    if (normalizedMessage.includes("empty_response")) throw new Error("EMPTY_RESPONSE");
    if (normalizedMessage.includes("invalid_json_format")) throw new Error("INVALID_JSON_FORMAT");
    
    if (normalizedMessage.includes('403') || normalizedMessage.includes('api_key') || normalizedMessage.includes('permission')) {
        throw new Error("API_KEY_ERROR");
    }
    
    if (normalizedMessage.includes('400') || normalizedMessage.includes('invalid_argument')) {
        throw new Error("BAD_REQUEST");
    }

    if (normalizedMessage.includes("xhr error") || 
        normalizedMessage.includes("error code: 6") || 
        normalizedMessage.includes("rpc failed") || 
        normalizedMessage.includes("networkerror") || 
        normalizedMessage.includes("failed to fetch")) {
        throw new Error("NETWORK_ERROR");
    }

    throw new Error(message || "UNKNOWN_ERROR");
  }
};
