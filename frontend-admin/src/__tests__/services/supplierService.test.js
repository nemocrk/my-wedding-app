import { describe, it, expect, vi } from 'vitest';
import { supplierService } from '../../services/supplierService';
import { api } from '../../services/api';

// Mock del modulo 'api' per isolare il service durante il test
vi.mock('../../services/api', () => ({
  api: {
    fetchSupplierTypes: vi.fn(),
    createSupplierType: vi.fn(),
    updateSupplierType: vi.fn(),
    deleteSupplierType: vi.fn(),
    fetchSuppliers: vi.fn(),
    createSupplier: vi.fn(),
    updateSupplier: vi.fn(),
    deleteSupplier: vi.fn(),
  },
}));

describe('supplierService', () => {
  it('getTypes should call api.fetchSupplierTypes', () => {
    supplierService.getTypes();
    expect(api.fetchSupplierTypes).toHaveBeenCalled();
  });

  it('createType should call api.createSupplierType with correct data', () => {
    const typeData = { name: 'New Type' };
    supplierService.createType(typeData);
    expect(api.createSupplierType).toHaveBeenCalledWith(typeData);
  });

  it('updateType should call api.updateSupplierType with correct id and data', () => {
    const typeId = '123';
    const typeData = { name: 'Updated Type' };
    supplierService.updateType(typeId, typeData);
    expect(api.updateSupplierType).toHaveBeenCalledWith(typeId, typeData);
  });

  it('deleteType should call api.deleteSupplierType with correct id', () => {
    const typeId = '123';
    supplierService.deleteType(typeId);
    expect(api.deleteSupplierType).toHaveBeenCalledWith(typeId);
  });

  it('getSuppliers should call api.fetchSuppliers with correct filters', () => {
    const filters = { type: 'catering' };
    supplierService.getSuppliers(filters);
    expect(api.fetchSuppliers).toHaveBeenCalledWith(filters);
  });

  it('createSupplier should call api.createSupplier with correct data', () => {
    const supplierData = { name: 'Awesome Supplier', type: '1' };
    supplierService.createSupplier(supplierData);
    expect(api.createSupplier).toHaveBeenCalledWith(supplierData);
  });

  it('updateSupplier should call api.updateSupplier with correct id and data', () => {
    const supplierId = 'abc';
    const supplierData = { name: 'Even Better Supplier' };
    supplierService.updateSupplier(supplierId, supplierData);
    expect(api.updateSupplier).toHaveBeenCalledWith(supplierId, supplierData);
  });

  it('deleteSupplier should call api.deleteSupplier with correct id', () => {
    const supplierId = 'abc';
    supplierService.deleteSupplier(supplierId);
    expect(api.deleteSupplier).toHaveBeenCalledWith(supplierId);
  });
});
