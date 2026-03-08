import axios from "axios";

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
    headers: {
        "Content-Type": "application/json",
    },
});

// ── Request: attach JWT token ─────────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// ── Response: unwrap backend envelope ────────────────────────────────────────
// Backend wraps every JSON response as:
//   { status: <http_code>, data: <payload>, error_message: <string|null> }
// We unwrap it so all service callers receive the inner `data` directly.
apiClient.interceptors.response.use(
    (response) => {
        const body = response.data;
        if (
            body &&
            typeof body === "object" &&
            "status" in body &&
            "data" in body &&
            "error_message" in body
        ) {
            // Unwrap: replace response.data with the inner payload
            response.data = body.data;
        }
        return response;
    },
    (error) => {
        // Unwrap error_message from the envelope if present
        if (error.response?.data) {
            const body = error.response.data;
            if (body?.error_message) {
                error.message = body.error_message;
                error.response.data = { detail: body.error_message };
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;

