import axios from 'axios';
import { getToken } from '../utils/storage';

// Use your laptop IPv4 from `ipconfig` — phone must be on the same Wi-Fi
export const BASE_URL = 'http://10.191.140.220:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach token to every request
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const loginAPI = (data) => api.post('/auth/login', data);

// Employee
export const getMyProjectsAPI = () => api.get('/projects/my-projects');
export const getTodayAttendanceAPI = () => api.get('/attendance/today');
export const getMyHistoryAPI = () => api.get('/attendance/my-history');
export const checkInAPI = (data) => api.post('/attendance/checkin', data);
export const checkOutAPI = (data) => api.post('/attendance/checkout', data);

// Developer
export const getAllEmployeesAPI = () => api.get('/employees/');
export const createEmployeeAPI = (data) => api.post('/employees/', data);
export const updateEmployeeAPI = (id, data) => api.put(`/employees/${id}`, data);
export const deleteEmployeeAPI = (id) => api.delete(`/employees/${id}`);
export const getAllProjectsAPI = () => api.get('/projects/');
export const createProjectAPI = (data) => api.post('/projects/', data);
export const updateProjectAPI = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProjectAPI = (id) => api.delete(`/projects/${id}`);
export const assignProjectAPI = (data) => api.post('/projects/assign', data);
export const removeAssignmentAPI = (employeeId, projectId) => 
  api.delete(`/projects/assign/${employeeId}/${projectId}`);

// Admin
export const getAdminAttendanceAPI = (params) => api.get('/admin/attendance', { params });
export const get30DayReportAPI = () => api.get('/admin/attendance/30days');
export const getOverviewAPI = () => api.get('/admin/overview');
export const getHolidaysAPI = () => api.get('/admin/holidays');
export const addHolidayAPI = (data) => api.post('/admin/holidays', data);
export const deleteHolidayAPI = (id) => api.delete(`/admin/holidays/${id}`);