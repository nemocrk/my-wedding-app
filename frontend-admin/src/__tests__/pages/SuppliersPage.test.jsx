import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../contexts/ToastContext';
import SuppliersPage from '../../pages/SuppliersPage';
import { supplierService } from '../../services/supplierService';

// Mock the supplierService
vi.mock('../../services/supplierService');
vi.mock('react-i18next', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useTranslation: () => ({
            t: (key) => key,
        }),
    };
});

const AllTheProviders = ({ children }) => (
    <ToastProvider>{children}</ToastProvider>
);

describe('SuppliersPage', () => {
    beforeEach(() => {
        const types = [{ id: 1, name: 'Catering' }];
        const suppliers = [
            { id: 1, name: 'Good Food', type: { id: 1, name: 'Catering' }, cost: 5000, currency: 'EUR', contact: { phone: '123' }, notes: 'notes' },
        ];
        supplierService.getTypes.mockResolvedValue({ results: types });
        supplierService.getSuppliers.mockResolvedValue({ results: suppliers });
        supplierService.createSupplier.mockResolvedValue({});
        supplierService.updateSupplier.mockResolvedValue({});
        supplierService.deleteSupplier.mockResolvedValue({});
    });

    it('should render loading state initially', () => {
        render(
            <AllTheProviders>
                <SuppliersPage />
            </AllTheProviders>
        );
        expect(screen.getByText('common.loading')).toBeInTheDocument();
    });

    it('should fetch and display suppliers', async () => {
        render(
            <AllTheProviders>
                <SuppliersPage />
            </AllTheProviders>
        );

        await waitFor(() => {
            expect(within(document.querySelector('.lg\\:block')).getByText('Good Food')).toBeInTheDocument();
            expect(within(document.querySelector('.lg\\:block')).getByText('Catering')).toBeInTheDocument();
        });
    });

    it('should open create modal', async () => {
        render(
            <AllTheProviders>
                <SuppliersPage />
            </AllTheProviders>
        );
        fireEvent.click(screen.getByText('common.new'));
        await screen.findByText('common.create');
    });

    it('should open edit modal', async () => {
        render(
            <AllTheProviders>
                <SuppliersPage />
            </AllTheProviders>
        );
        await screen.findAllByText('Good Food');
        const goodFoodRow = await within(document.querySelector('.lg\\:block')).findByText('Good Food');
        const row = goodFoodRow.closest('tr');
        fireEvent.click(within(row).getAllByRole('button')[0]);
        await screen.findByText('common.edit');
    });
    it('Mobile - should open edit modal', async () => {
        render(
            <AllTheProviders>
                <SuppliersPage />
            </AllTheProviders>
        );
        await screen.findAllByText('Good Food');
        const goodFoodRow = await within(document.querySelector('.lg\\:hidden')).findByText('Good Food');
        const row = goodFoodRow.closest('div').parentElement.parentElement;
        fireEvent.click(within(row).getAllByRole('button')[0]);
        await screen.findByText('common.edit');
    });

    it('should create a new supplier', async () => {
        render(
            <AllTheProviders>
                <SuppliersPage />
            </AllTheProviders>
        );
        fireEvent.click(screen.getByText('common.new'));
        await screen.findByText('common.create');
        fireEvent.click(within((await screen.findByText('common.create')).closest('div')).getByRole('button'));
        fireEvent.click(screen.getByText('common.new'));
        await screen.findByText('common.create');

        fireEvent.change(screen.getByLabelText('common.name'), { target: { value: 'Music Band' } });
        fireEvent.change(screen.getByLabelText('admin.suppliers.table.type'), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText('admin.suppliers.table.cost'), { target: { value: '1000' } });
        fireEvent.change(screen.getByLabelText('common.notes'), { target: { value: 'Nota' } });


        fireEvent.click(screen.getByText('common.save'));

        await waitFor(() => {
            expect(supplierService.createSupplier).toHaveBeenCalledWith({
                name: 'Music Band',
                type_id: '1',
                cost: 1000,
                currency: 'EUR',
                contact: {},
                notes: 'Nota',
            });
        });
    });

    it('should update a supplier', async () => {
        render(
            <AllTheProviders>
                <SuppliersPage />
            </AllTheProviders>
        );
        await screen.findAllByText('Good Food');
        const goodFoodRow = await within(document.querySelector('.lg\\:block')).findByText('Good Food');
        const row = goodFoodRow.closest('tr');
        fireEvent.click(within(row).getAllByRole('button')[0]);

        await screen.findByText('common.edit');
        fireEvent.click(within((await screen.findByText('common.edit')).closest('div')).getByRole('button'));
        fireEvent.click(within(row).getAllByRole('button')[0]);
        await screen.findByText('common.edit');

        fireEvent.change(screen.getByLabelText('common.name'), { target: { value: 'Super Good Food' } });
        fireEvent.click(screen.getByText('common.save'));

        await waitFor(() => {
            expect(supplierService.updateSupplier).toHaveBeenCalledWith(1, {
                name: 'Super Good Food',
                type_id: 1,
                cost: 5000,
                currency: 'EUR',
                contact: { phone: '123' },
                notes: 'notes',
            });
        });
    });
    it('Mobile - should update a supplier', async () => {
        render(
            <AllTheProviders>
                <SuppliersPage />
            </AllTheProviders>
        );
        await screen.findAllByText('Good Food');
        const goodFoodRow = await within(document.querySelector('.lg\\:hidden')).findByText('Good Food');
        const row = goodFoodRow.closest('div').parentElement.parentElement;
        fireEvent.click(within(row).getAllByRole('button')[0]);

        await screen.findByText('common.edit');
        fireEvent.click(within((await screen.findByText('common.edit')).closest('div')).getByRole('button'));
        fireEvent.click(within(row).getAllByRole('button')[0]);
        await screen.findByText('common.edit');

        fireEvent.change(screen.getByLabelText('common.name'), { target: { value: 'Super Good Food' } });
        fireEvent.click(screen.getByText('common.save'));

        await waitFor(() => {
            expect(supplierService.updateSupplier).toHaveBeenCalledWith(1, {
                name: 'Super Good Food',
                type_id: 1,
                cost: 5000,
                currency: 'EUR',
                contact: { phone: '123' },
                notes: 'notes',
            });
        });
    });

    it('should delete a supplier', async () => {
        render(
            <AllTheProviders>
                <SuppliersPage />
            </AllTheProviders>
        );
        await screen.findAllByText('Good Food');
        const goodFoodRow = await within(document.querySelector('.lg\\:block')).findByText('Good Food');
        const row = goodFoodRow.closest('tr');
        fireEvent.click(within(row).getAllByRole('button')[1]);

        await screen.findByText('common.confirm_delete');
        fireEvent.click(within((await screen.getAllByText('common.delete')[0]).closest('div').parentNode).getAllByRole('button')[0]);
        fireEvent.click(within(row).getAllByRole('button')[1]);

        await screen.findByText('common.confirm_delete');
        fireEvent.click(screen.getByRole('button', { name: 'common.delete' }));

        await waitFor(() => {
            expect(supplierService.deleteSupplier).toHaveBeenCalledWith(1);
        });
    });
    it('should delete a supplier', async () => {
        render(
            <AllTheProviders>
                <SuppliersPage />
            </AllTheProviders>
        );
        await screen.findAllByText('Good Food');
        const goodFoodRow = await within(document.querySelector('.lg\\:hidden')).findByText('Good Food');
        const row = goodFoodRow.closest('div').parentElement.parentElement;
        fireEvent.click(within(row).getAllByRole('button')[1]);

        await screen.findByText('common.confirm_delete');
        fireEvent.click(within((await screen.getAllByText('common.delete')[0]).closest('div').parentNode).getAllByRole('button')[0]);
        fireEvent.click(within(row).getAllByRole('button')[1]);

        await screen.findByText('common.confirm_delete');
        fireEvent.click(screen.getByRole('button', { name: 'common.delete' }));

        await waitFor(() => {
            expect(supplierService.deleteSupplier).toHaveBeenCalledWith(1);
        });
    });
});
