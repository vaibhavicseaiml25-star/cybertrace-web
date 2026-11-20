import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  headers: { "Content-Type": "application/json" },
});

export function errorMessage(error) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || JSON.stringify(item)).join(" ");
  }
  return error?.message || "The request could not be completed.";
}

export const getHealth = () => api.get("/health").then((response) => response.data);
export const getStats = () => api.get("/dashboard/stats").then((response) => response.data);
export const getIncidents = () => api.get("/incidents").then((response) => response.data);
export const updateIncident = (id, payload) =>
  api.patch(`/incidents/${id}`, payload).then((response) => response.data);
export const getGraph = () => api.get("/graph").then((response) => response.data);
export const traverseGraph = (payload) =>
  api.post("/graph/traverse", payload).then((response) => response.data);
