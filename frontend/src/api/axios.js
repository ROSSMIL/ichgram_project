import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3333",
  timeout: 60000,
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
    const status = error.response?.status;

    if (status === 401) {
      if (localStorage.getItem("token")) {
        localStorage.removeItem("token");
        localStorage.removeItem("guest_device_id");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    if (status === 404 && originalRequest.url?.includes("/api/users/profile")) {
      localStorage.removeItem("token");
      localStorage.removeItem("guest_device_id");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    if (
      (error.code === "ECONNABORTED" ||
        !error.response ||
        error.code === "ERR_NETWORK") &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return await API(originalRequest);
      } catch (retryError) {
        if (
          !retryError.response ||
          [502, 503, 504].includes(retryError.response.status)
        ) {
          window.dispatchEvent(new CustomEvent("globalServerMaintenance"));
        }
        return Promise.reject(retryError);
      }
    }

    if (status && [502, 503, 504].includes(status)) {
      window.dispatchEvent(new CustomEvent("globalServerMaintenance"));
    }

    return Promise.reject(error);
  },
);

export default API;
