import pytest
from decimal import Decimal
from django.contrib.contenttypes.models import ContentType
from core.models import (
    PaymentPlatform, PaymentEvent,
    Supplier, SupplierType,
    Accommodation, Room,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def platform(db):
    return PaymentPlatform.objects.create(name='Bonifico')


@pytest.fixture
def supplier_type(db):
    return SupplierType.objects.create(name='Fotografo')


@pytest.fixture
def supplier(db, supplier_type):
    return Supplier.objects.create(
        name='Studio Rossi',
        type=supplier_type,
        cost=Decimal('2000.00'),
        currency='EUR',
    )


@pytest.fixture
def accommodation(db):
    return Accommodation.objects.create(name='Hotel Belvedere')


@pytest.fixture
def room(db, accommodation):
    return Room.objects.create(
        accommodation=accommodation,
        room_number='101',
        capacity_adults=2,
        capacity_children=1,
        price=Decimal('600.00'),
    )


# ---------------------------------------------------------------------------
# Model tests — PaymentPlatform
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_payment_platform_creation(platform):
    assert PaymentPlatform.objects.count() == 1
    assert str(platform) == 'Bonifico'


@pytest.mark.django_db
def test_payment_platform_name_unique(platform):
    """name deve essere UNIQUE — il secondo insert deve sollevare IntegrityError."""
    with pytest.raises(Exception):
        PaymentPlatform.objects.create(name='Bonifico')


# ---------------------------------------------------------------------------
# Model tests — PaymentEvent
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_payment_event_on_supplier(platform, supplier):
    ct = ContentType.objects.get_for_model(Supplier)
    event = PaymentEvent.objects.create(
        content_type=ct,
        object_id=supplier.pk,
        platform=platform,
        label='Acconto',
        amount=Decimal('500.00'),
        currency='EUR',
        payment_date='2026-07-01',
        status=PaymentEvent.Status.PLANNED,
    )
    assert event.payable == supplier
    assert str(event) == 'Acconto — 500.00 EUR (Pianificato)'


@pytest.mark.django_db
def test_payment_event_on_room(platform, room):
    ct = ContentType.objects.get_for_model(Room)
    event = PaymentEvent.objects.create(
        content_type=ct,
        object_id=room.pk,
        platform=platform,
        label='Caparra',
        amount=Decimal('200.00'),
        currency='EUR',
        payment_date='2026-06-15',
        status=PaymentEvent.Status.PAID,
    )
    assert event.payable == room
    assert event.status == PaymentEvent.Status.PAID


@pytest.mark.django_db
def test_cancelled_event_excluded_from_aggregates(platform, supplier):
    """Gli eventi CANCELLED non devono comparire in nessun calcolo."""
    ct = ContentType.objects.get_for_model(Supplier)
    PaymentEvent.objects.create(
        content_type=ct, object_id=supplier.pk,
        platform=platform, label='Annullato',
        amount=Decimal('999.00'), currency='EUR',
        payment_date='2026-08-01',
        status=PaymentEvent.Status.CANCELLED,
    )
    paid_total = PaymentEvent.objects.filter(
        status=PaymentEvent.Status.PAID
    ).aggregate(t=__import__('django.db.models', fromlist=['Sum']).Sum('amount'))['t']
    planned_total = PaymentEvent.objects.filter(
        status=PaymentEvent.Status.PLANNED
    ).aggregate(t=__import__('django.db.models', fromlist=['Sum']).Sum('amount'))['t']
    assert paid_total is None
    assert planned_total is None


# ---------------------------------------------------------------------------
# API tests — PaymentPlatform endpoints
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_list_payment_platforms_empty(client):
    resp = client.get('/api/admin/payment-platforms/')
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.django_db
def test_create_payment_platform(client):
    resp = client.post(
        '/api/admin/payment-platforms/',
        data={'name': 'PayPal'},
        content_type='application/json',
    )
    assert resp.status_code == 201
    assert resp.json()['name'] == 'PayPal'


@pytest.mark.django_db
def test_delete_payment_platform(client, platform):
    resp = client.delete(f'/api/admin/payment-platforms/{platform.pk}/')
    assert resp.status_code == 204
    assert PaymentPlatform.objects.count() == 0


# ---------------------------------------------------------------------------
# API tests — PaymentEvent endpoints
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_create_payment_event_via_api(client, platform, supplier):
    ct = ContentType.objects.get_for_model(Supplier)
    payload = {
        'content_type': ct.pk,
        'object_id': supplier.pk,
        'platform': platform.pk,
        'label': 'Acconto',
        'amount': '500.00',
        'currency': 'EUR',
        'payment_date': '2026-07-01',
        'status': 'planned',
    }
    resp = client.post(
        '/api/admin/payment-events/',
        data=payload,
        content_type='application/json',
    )
    assert resp.status_code == 201
    assert resp.json()['label'] == 'Acconto'
    assert resp.json()['status'] == 'planned'


@pytest.mark.django_db
def test_filter_payment_events_by_entity(client, platform, supplier):
    ct = ContentType.objects.get_for_model(Supplier)
    PaymentEvent.objects.create(
        content_type=ct, object_id=supplier.pk,
        platform=platform, label='Saldo',
        amount=Decimal('1500.00'), currency='EUR',
        payment_date='2026-09-01',
        status=PaymentEvent.Status.PLANNED,
    )
    resp = client.get(
        f'/api/admin/payment-events/?content_type_id={ct.pk}&object_id={supplier.pk}'
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]['label'] == 'Saldo'


@pytest.mark.django_db
def test_update_event_status_to_paid(client, platform, supplier):
    ct = ContentType.objects.get_for_model(Supplier)
    event = PaymentEvent.objects.create(
        content_type=ct, object_id=supplier.pk,
        platform=platform, label='Rata 1',
        amount=Decimal('300.00'), currency='EUR',
        payment_date='2026-07-15',
        status=PaymentEvent.Status.PLANNED,
    )
    resp = client.patch(
        f'/api/admin/payment-events/{event.pk}/',
        data={'status': 'paid'},
        content_type='application/json',
    )
    assert resp.status_code == 200
    assert resp.json()['status'] == 'paid'


# ---------------------------------------------------------------------------
# API tests — PaymentSummaryView
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_payment_summary_empty(client):
    """Con DB vuoto: tutti i totali a zero, next_deadline None."""
    resp = client.get('/api/admin/payment-events/summary/')
    assert resp.status_code == 200
    data = resp.json()
    assert Decimal(data['total_paid']) == Decimal('0')
    assert Decimal(data['total_planned']) == Decimal('0')
    assert data['next_deadline'] is None


@pytest.mark.django_db
def test_payment_summary_with_events(client, platform, supplier):
    ct = ContentType.objects.get_for_model(Supplier)
    PaymentEvent.objects.create(
        content_type=ct, object_id=supplier.pk,
        platform=platform, label='Acconto',
        amount=Decimal('500.00'), currency='EUR',
        payment_date='2026-07-01',
        status=PaymentEvent.Status.PAID,
    )
    PaymentEvent.objects.create(
        content_type=ct, object_id=supplier.pk,
        platform=platform, label='Saldo',
        amount=Decimal('1500.00'), currency='EUR',
        payment_date='2026-09-15',
        status=PaymentEvent.Status.PLANNED,
    )
    resp = client.get('/api/admin/payment-events/summary/')
    assert resp.status_code == 200
    data = resp.json()
    assert Decimal(data['total_paid']) == Decimal('500.00')
    assert Decimal(data['total_planned']) == Decimal('1500.00')
    # total_contracts include supplier.cost (2000) + nessuna room
    assert Decimal(data['total_contracts']) == Decimal('2000.00')
    assert Decimal(data['total_remaining']) == Decimal('1500.00')  # 2000 - 500
    assert data['next_deadline'] is not None
    assert data['next_deadline']['label'] == 'Saldo - Studio Rossi'


@pytest.mark.django_db
def test_payment_summary_excludes_cancelled(client, platform, supplier):
    ct = ContentType.objects.get_for_model(Supplier)
    PaymentEvent.objects.create(
        content_type=ct, object_id=supplier.pk,
        platform=platform, label='Annullato',
        amount=Decimal('9999.00'), currency='EUR',
        payment_date='2026-07-01',
        status=PaymentEvent.Status.CANCELLED,
    )
    resp = client.get('/api/admin/payment-events/summary/')
    assert resp.status_code == 200
    data = resp.json()
    assert Decimal(data['total_paid']) == Decimal('0')
    assert Decimal(data['total_planned']) == Decimal('0')


# ---------------------------------------------------------------------------
# API tests — PayablesListView
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_payables_list_structure(client, supplier, room):
    resp = client.get('/api/admin/payment-events/payables/')
    assert resp.status_code == 200
    data = resp.json()
    # Deve contenere almeno la room e il supplier creati dalle fixture
    entity_types = [item['entity_type'] for item in data]
    assert 'room' in entity_types
    assert 'supplier' in entity_types


@pytest.mark.django_db
def test_payables_list_ordering(client, supplier, room):
    """Le camere devono precedere i fornitori nella lista."""
    resp = client.get('/api/admin/payment-events/payables/')
    assert resp.status_code == 200
    data = resp.json()
    room_indices = [i for i, d in enumerate(data) if d['entity_type'] == 'room']
    supplier_indices = [i for i, d in enumerate(data) if d['entity_type'] == 'supplier']
    if room_indices and supplier_indices:
        assert max(room_indices) < min(supplier_indices)


@pytest.mark.django_db
def test_payables_aggregates_match_events(client, platform, supplier):
    ct = ContentType.objects.get_for_model(Supplier)
    PaymentEvent.objects.create(
        content_type=ct, object_id=supplier.pk,
        platform=platform, label='Acconto',
        amount=Decimal('400.00'), currency='EUR',
        payment_date='2026-07-01',
        status=PaymentEvent.Status.PAID,
    )
    PaymentEvent.objects.create(
        content_type=ct, object_id=supplier.pk,
        platform=platform, label='Saldo',
        amount=Decimal('300.00'), currency='EUR',
        payment_date='2026-09-01',
        status=PaymentEvent.Status.PLANNED,
    )
    resp = client.get('/api/admin/payment-events/payables/')
    assert resp.status_code == 200
    supplier_item = next(d for d in resp.json() if d['entity_type'] == 'supplier')
    assert Decimal(supplier_item['total_paid']) == Decimal('400.00')
    assert Decimal(supplier_item['total_planned']) == Decimal('300.00')
    assert Decimal(supplier_item['total_remaining']) == Decimal('1600.00')  # 2000 - 400
    assert len(supplier_item['payment_events']) == 2
