import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../contexts/ToastContext';
import SupplierTypesPage from '../../pages/SupplierTypesPage';
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

describe('SupplierTypesPage', () => {
    beforeEach(() => {
        supplierService.getTypes.mockResolvedValue({
            results: [
                { id: 1, name: 'Catering', description: 'Food and beverage services' },
                { id: 2, name: 'Venue', description: 'Location for the event' },
            ],
        });
        supplierService.createType.mockResolvedValue({});
        supplierService.updateType.mockResolvedValue({});
        supplierService.deleteType.mockResolvedValue({});
    });

    it('should render loading state initially', () => {
        supplierService.getTypes.mockResolvedValueOnce({ results: [] });
        render(
            <AllTheProviders>
                <SupplierTypesPage />
            </AllTheProviders>
        );
        expect(screen.getByText('common.loading')).toBeInTheDocument();
    });

    it('should fetch and display supplier types', async () => {
        render(
            <AllTheProviders>
                <SupplierTypesPage />
            </AllTheProviders>
        );

        await waitFor(() => {
            expect(within(document.querySelector('.lg\\:block')).getByText('Catering')).toBeInTheDocument();
            expect(within(document.querySelector('.lg\\:block')).getByText('Venue')).toBeInTheDocument();
        });
    });

    it('should open create modal', async () => {
        render(
            <AllTheProviders>
                <SupplierTypesPage />
            </AllTheProviders>
        );
        fireEvent.click(screen.getByText('common.new'));
        await screen.findByText('common.create');
    });

    it('should open edit modal', async () => {
        render(
            <AllTheProviders>
                <SupplierTypesPage />
            </AllTheProviders>
        );
        await screen.findAllByText('Catering')
        const cateringRow = await within(document.querySelector('.lg\\:block')).findByText('Catering');
        const row = cateringRow.closest('tr');
        fireEvent.click(within(row).getAllByRole('button')[0]);
        await screen.findByText('common.edit');
    });

    it('should create a new type', async () => {
        render(
            <AllTheProviders>
                <SupplierTypesPage />
            </AllTheProviders>
        );
        fireEvent.click(screen.getByText('common.new'));
        await screen.findByText('common.create');
        fireEvent.change(screen.getByLabelText('common.name'), { target: { value: 'Music' } });
        fireEvent.click(screen.getByText('common.save'));

        await waitFor(() => {
            expect(supplierService.createType).toHaveBeenCalledWith({ name: 'Music', description: '' });
        });
    });

    it('should update a type', async () => {
        render(
            <AllTheProviders>
                <SupplierTypesPage />
            </AllTheProviders>
        );
        await screen.findAllByText('Catering');
        const cateringRow = await within(document.querySelector('.lg\\:block')).findByText('Catering');
        const row = cateringRow.closest('tr');
        fireEvent.click(within(row).getAllByRole('button')[0]);

        await screen.findByText('common.edit');

        fireEvent.change(screen.getByLabelText('common.name'), { target: { value: 'Super Catering' } });
        fireEvent.click(screen.getByText('common.save'));

        await waitFor(() => {
            expect(supplierService.updateType).toHaveBeenCalledWith(1, { name: 'Super Catering', description: 'Food and beverage services' });
        });
    });

    it('should delete a type', async () => {
        render(
            <AllTheProviders>
                <SupplierTypesPage />
            </AllTheProviders>
        );
        await screen.findAllByText('Catering');
        const cateringRow = await within(document.querySelector('.lg\\:block')).findByText('Catering');
        const row = cateringRow.closest('tr');
        fireEvent.click(within(row).getAllByRole('button')[1]);
        await screen.findByText('common.confirm_delete');
        fireEvent.click(screen.getByRole('button', { name: 'common.delete' }));

        await waitFor(() => {
            expect(supplierService.deleteType).toHaveBeenCalledWith(1);
        });
    });

    it('Mobile - should open edit modal', async () => {
        render(
            <AllTheProviders>
                <SupplierTypesPage />
            </AllTheProviders>
        );
        await screen.findAllByText('Catering')
        const cateringRow = await within(document.querySelector('.lg\\:hidden')).findByText('Catering');
        const row = cateringRow.closest('div').parentElement.parentElement;
        fireEvent.click(within(row).getAllByRole('button')[0]);
        await screen.findByText('common.edit');
    });

    it('Mobile - should update a type', async () => {
        render(
            <AllTheProviders>
                <SupplierTypesPage />
            </AllTheProviders>
        );
        await screen.findAllByText('Catering');
        const cateringRow = await within(document.querySelector('.lg\\:hidden')).findByText('Catering');
        const row = cateringRow.closest('div').parentElement.parentElement;
        fireEvent.click(within(row).getAllByRole('button')[0]);

        await screen.findByText('common.edit');

        fireEvent.change(screen.getByLabelText('common.name'), { target: { value: 'Super Catering' } });
        fireEvent.click(screen.getByText('common.save'));

        await waitFor(() => {
            expect(supplierService.updateType).toHaveBeenCalledWith(1, { name: 'Super Catering', description: 'Food and beverage services' });
        });
    });

    it('Mobile - should delete a type', async () => {
        render(
            <AllTheProviders>
                <SupplierTypesPage />
            </AllTheProviders>
        );
        await screen.findAllByText('Catering');
        const cateringRow = await within(document.querySelector('.lg\\:hidden')).findByText('Catering');
        const row = cateringRow.closest('div').parentElement.parentElement;
        fireEvent.click(within(row).getAllByRole('button')[1]);
        await screen.findByText('common.confirm_delete');
        fireEvent.click(screen.getByRole('button', { name: 'common.delete' }));

        await waitFor(() => {
            expect(supplierService.deleteType).toHaveBeenCalledWith(1);
        });
    });
});
