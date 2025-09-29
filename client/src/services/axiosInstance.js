import axios from "axios";

const axiosInstance = axios.create({
    baseURL: "http://localhost:8080"
});

axiosInstance.interceptors.response.use(
    response => {
        if (response?.data?.success) {
            return response.data;
        } else {
            throw new Error(response.data.message || "Server end error!");
        }
    },
    error => {
        console.error("axiosInstance error ", error);
        throw error;
    }
);

export default axiosInstance;
