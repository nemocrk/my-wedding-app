import { api } from './api';

export const supplierService = {
    getTypes: () => api.fetchSupplierTypes(),
    createType: (data) => api.createSupplierType(data),
    updateType: (id, data) => api.updateSupplierType(id, data),
    deleteType: (id) => api.deleteSupplierType(id),

    getSuppliers: (filters) => api.fetchSuppliers(filters),
    createSupplier: (data) => api.createSupplier(data),
    updateSupplier: (id, data) => api.updateSupplier(id, data),
    deleteSupplier: (id) => api.deleteSupplier(id),
};
