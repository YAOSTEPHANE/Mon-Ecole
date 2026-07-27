import api from './client';

export const adminAccountingApi = {
  getSuppliers: async () => (await api.get('/admin/suppliers')).data,
  createSupplier: async (data: Record<string, unknown>) => (await api.post('/admin/suppliers', data)).data,
  updateSupplier: async (id: string, data: Record<string, unknown>) =>
    (await api.put(`/admin/suppliers/${id}`, data)).data,
  deleteSupplier: async (id: string) => (await api.delete(`/admin/suppliers/${id}`)).data,

  getSchoolExpenses: async (params?: { academicYear?: string; from?: string; to?: string; category?: string }) =>
    (await api.get('/admin/school-expenses', { params })).data,
  createSchoolExpense: async (data: Record<string, unknown>) =>
    (await api.post('/admin/school-expenses', data)).data,
  updateSchoolExpense: async (id: string, data: Record<string, unknown>) =>
    (await api.put(`/admin/school-expenses/${id}`, data)).data,
  deleteSchoolExpense: async (id: string) => (await api.delete(`/admin/school-expenses/${id}`)).data,

  getPettyCashMovements: async (params?: { from?: string; to?: string }) =>
    (await api.get('/admin/petty-cash-movements', { params })).data,
  createPettyCashMovement: async (data: Record<string, unknown>) =>
    (await api.post('/admin/petty-cash-movements', data)).data,
  deletePettyCashMovement: async (id: string) => (await api.delete(`/admin/petty-cash-movements/${id}`)).data,
  getPettyCashBalance: async () => (await api.get('/admin/petty-cash-balance')).data,

  getBudgetLines: async (params?: { academicYear?: string }) =>
    (await api.get('/admin/budget-lines', { params })).data,
  createBudgetLine: async (data: Record<string, unknown>) => (await api.post('/admin/budget-lines', data)).data,
  updateBudgetLine: async (id: string, data: Record<string, unknown>) =>
    (await api.put(`/admin/budget-lines/${id}`, data)).data,
  deleteBudgetLine: async (id: string) => (await api.delete(`/admin/budget-lines/${id}`)).data,

  getAccountingSummary: async (params?: { academicYear?: string; from?: string; to?: string }) =>
    (await api.get('/admin/accounting/summary', { params })).data,
  getAccountingJournal: async (params?: { academicYear?: string; from?: string; to?: string }) =>
    (await api.get('/admin/accounting/journal', { params })).data,
  getAccountingLedger: async (params?: { academicYear?: string; from?: string; to?: string }) =>
    (await api.get('/admin/accounting/ledger', { params })).data,

  getCashRegisters: async () => (await api.get('/admin/cash-registers')).data,
  createCashRegister: async (data: Record<string, unknown>) => (await api.post('/admin/cash-registers', data)).data,
  updateCashRegister: async (id: string, data: Record<string, unknown>) =>
    (await api.put(`/admin/cash-registers/${id}`, data)).data,
  deleteCashRegister: async (id: string) => (await api.delete(`/admin/cash-registers/${id}`)).data,
  getCashOverview: async (params?: { from?: string; to?: string; registerId?: string }) =>
    (await api.get('/admin/accounting/cash/overview', { params })).data,
};
