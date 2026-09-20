import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3333",
  timeout: 60000, // 60s timeout for Render cold start
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      (error.code === "ECONNABORTED" || !error.response) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return await API(originalRequest);
      } catch (retryError) {
        return Promise.reject(retryError);
      }
    }

    if (error.response && error.response.status === 401) {
      if (localStorage.getItem("token")) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default API;
