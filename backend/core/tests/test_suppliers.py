import pytest
from django.db.models import Sum
from core.models import SupplierType, Supplier


@pytest.mark.django_db
def test_supplier_model_creation():
    st = SupplierType.objects.create(name="Catering", description="Food & Drinks")
    st2 = SupplierType.objects.create(name="DJ", description="Music")
    Supplier.objects.create(name="Rossi Catering", type=st, cost=1200.50, currency='EUR')
    Supplier.objects.create(name="Bianchi Catering", type=st, cost=350.00, currency='EUR')
    Supplier.objects.create(name="Music House", type=st2, cost=350.00, currency='EUR')

    assert SupplierType.objects.count() == 2
    assert Supplier.objects.count() == 3
    agg = Supplier.objects.aggregate(total=Sum('cost'))
    total_cost = float(agg.get('total') or 0.0)
    assert total_cost == pytest.approx(1900.5)


@pytest.mark.django_db
def test_dashboard_includes_suppliers(client, global_config):
    # create supplier type and suppliers
    st = SupplierType.objects.create(name="Catering", description="Food & Drinks")
    st2 = SupplierType.objects.create(name="DJ", description="Music")
    Supplier.objects.create(name="Rossi Catering", type=st, cost=1200.50, currency='EUR')
    Supplier.objects.create(name="Bianchi Catering", type=st, cost=350.00, currency='EUR')
    Supplier.objects.create(name="Music House", type=st2, cost=350.00, currency='EUR')

    url = '/api/admin/dashboard/stats/'
    resp = client.get(url)
    assert resp.status_code == 200
    data = resp.json()
    assert 'suppliers' in data
    assert data['suppliers']['total'] == pytest.approx(700.0)
    assert isinstance(data['suppliers']['items'], list)
