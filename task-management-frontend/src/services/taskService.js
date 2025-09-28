import api from './api';

export const taskService = {
  getTasks: async (page = 1, limit = 10, filters = {}) => {
    const params = { page, limit, ...filters };
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  getMyTasks: async (page = 1, limit = 10, filters = {}) => {
    const params = { page, limit, ...filters };
    const response = await api.get('/tasks/my-tasks', { params });
    return response.data;
  },

  getTask: async (id) => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  createTask: async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  updateTask: async (id, taskData) => {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  },

  deleteTask: async (id) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },

  updateTaskStatus: async (id, status) => {
    const response = await api.patch(`/tasks/${id}/status`, { status });
    return response.data;
  },

  updateTaskPriority: async (id, priority) => {
    const response = await api.patch(`/tasks/${id}/priority`, { priority });
    return response.data;
  }
};