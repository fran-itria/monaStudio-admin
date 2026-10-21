/// <reference types="vite/client" />
import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL_LOCAL,
    withCredentials: false,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isLoginRequest = error.config?.url?.includes("/auth/login");
        if (error.response && error.response.status === 401 && !isLoginRequest) {
            localStorage.removeItem("accessToken");
            window.location.href = "/";
        }
        if (error.response && error.response.status === 500) {
        }
        return Promise.reject(error);
    },
);

export default api;
