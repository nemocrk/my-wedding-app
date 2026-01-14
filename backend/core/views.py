from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.db.models import Sum, Count, Q
from django.contrib.sessions.models import Session
from django.db import transaction
from .models import (
    Invitation, GlobalConfig, Person, Accommodation, Room, 
    GuestInteraction, GuestHeatmap, WhatsAppTemplate,
    ConfigurableText
)
from .serializers import (
    InvitationSerializer, InvitationListSerializer, GlobalConfigSerializer, 
    AccommodationSerializer, PublicInvitationSerializer, WhatsAppTemplateSerializer,
    ConfigurableTextSerializer
)
import logging
import os
import copy

logger = logging.getLogger(__name__)

# ========================================
# PUBLIC API (Internet - Session Based)
# ========================================

class PublicConfigurableTextView(APIView):
    """
    Endpoint pubblico per recuperare i testi configurati.
    Supporta filtro lingua (?lang=en). Fallback a 'it' se non trovato.
    """
    def get(self, request):
        lang = request.query_params.get('lang', 'it')
        
        # Recupera tutti i testi
        texts = ConfigurableText.objects.all()
        
        # Costruisce dizionario con fallback logic:
        # Prima carica 'it' (default), poi sovrascrive con la lingua richiesta
        # Questo assicura che se manca una chiave in 'en', si veda quella 'it'
        
        data = {}
        
        # 1. Base Layer (Italiano/Default)
        base_texts = texts.filter(language='it')
        for t in base_texts:
            data[t.key] = t.content
            
        # 2. Override Layer (Requested Language)
        if lang != 'it':
            lang_texts = texts.filter(language=lang)
            for t in lang_texts:
                data[t.key] = t.content # Override
        
        return Response(data)

class PublicInvitationAuthView(APIView):
    def post(self, request):
        code = request.data.get('code')
        token = request.data.get('token')
        config, _ = GlobalConfig.objects.get_or_create(pk=1)
        if not code or not token:
            return Response({'valid': False, 'message': 'Parametri mancanti'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            invitation = Invitation.objects.get(code=code)
            if not invitation.verify_token(token, config.invitation_link_secret):
                return Response({'valid': False, 'message': config.unauthorized_message}, status=status.HTTP_403_FORBIDDEN)
            if not invitation.status in [Invitation.Status.SENT, Invitation.Status.READ, Invitation.Status.CONFIRMED, Invitation.Status.DECLINED ]:
                return Response({'valid': False, 'message': config.unauthorized_message}, status=status.HTTP_403_FORBIDDEN)
            request.session['invitation_code'] = code
            request.session['invitation_token'] = token
            request.session['invitation_id'] = invitation.id
            request.session.save()
            serializer = PublicInvitationSerializer(invitation, context={'config': config})
            return Response({'valid': True, 'invitation': serializer.data})
        except Invitation.DoesNotExist:
            return Response({'valid': False, 'message': config.unauthorized_message}, status=status.HTTP_404_NOT_FOUND)

class PublicInvitationView(APIView):
    def get(self, request):
        invitation_id = request.session.get('invitation_id')
        stored_code = request.session.get('invitation_code')
        stored_token = request.session.get('invitation_token')
        if not all([invitation_id, stored_code, stored_token]):
            return Response({'valid': False, 'message': 'Sessione non valida'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            invitation = Invitation.objects.get(id=invitation_id, code=stored_code)
            config, _ = GlobalConfig.objects.get_or_create(pk=1)
            if not invitation.verify_token(stored_token, config.invitation_link_secret):
                request.session.flush()
                return Response({'valid': False, 'message': config.unauthorized_message}, status=status.HTTP_403_FORBIDDEN)
            serializer = PublicInvitationSerializer(invitation, context={'config': config})
            return Response({'valid': True, 'invitation': serializer.data})
        except Invitation.DoesNotExist:
            request.session.flush()
            config, _ = GlobalConfig.objects.get_or_create(pk=1)
            return Response({'valid': False, 'message': config.unauthorized_message}, status=status.HTTP_404_NOT_FOUND)

class PublicRSVPView(APIView):
    """
    Enhanced RSVP Endpoint supporting Multi-Step Wizard payload:
    - phone_number: str (tracks old/new)
    - guest_updates: dict {guest_index: {first_name, last_name}}
    - excluded_guests: list [guest_indices] → sets Person.not_coming=True
    - travel_info: dict {transport_type, schedule, car_option, carpool_interest} → persisted to Invitation.travel_*
    """
    def post(self, request):
        invitation_id = request.session.get('invitation_id')
        if not invitation_id:
            return Response({'success': False, 'message': 'Sessione scaduta'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            with transaction.atomic():
                invitation = Invitation.objects.select_for_update().get(id=invitation_id)
                
                # Metadata logging container
                metadata = {
                    'payload_received': request.data.copy()
                }
                
                # 1. Validate Status
                new_status = request.data.get('status')
                if new_status not in ['confirmed', 'declined']:
                    return Response({'success': False, 'message': 'Stato non valido'}, status=status.HTTP_400_BAD_REQUEST)
                
                # 2. Update Phone Number (Track Changes)
                phone_number = request.data.get('phone_number')
                if phone_number:
                    old_phone = invitation.phone_number
                    if old_phone != phone_number:
                        invitation.phone_number = phone_number
                        metadata['phone_number_old'] = old_phone
                        metadata['phone_number_new'] = phone_number
                        metadata['phone_number_changed'] = True
                        logger.info(f"Phone updated for {invitation.code}: {old_phone} → {phone_number}")
                    else:
                        metadata['phone_number_changed'] = False
                
                # 3. Apply Guest Updates (Edit Names)
                guest_updates = request.data.get('guest_updates', {})
                if guest_updates:
                    guests = list(invitation.guests.all())
                    updated_guests = []
                    for idx_str, updates in guest_updates.items():
                        try:
                            idx = int(idx_str)
                            if 0 <= idx < len(guests):
                                guest = guests[idx]
                                old_name = f"{guest.first_name} {guest.last_name or ''}".strip()
                                if 'first_name' in updates:
                                    guest.first_name = updates['first_name']
                                if 'last_name' in updates:
                                    guest.last_name = updates['last_name']
                                guest.save()
                                new_name = f"{guest.first_name} {guest.last_name or ''}".strip()
                                updated_guests.append({'idx': idx, 'old': old_name, 'new': new_name})
                                logger.info(f"Guest name updated: {old_name} → {new_name}")
                        except (ValueError, IndexError) as e:
                            logger.warning(f"Invalid guest update index {idx_str}: {e}")
                    metadata['updated_guests'] = updated_guests
                
                # 4. Handle Excluded Guests (Hard Flag: not_coming=True)
                excluded_guests = request.data.get('excluded_guests', [])
                if excluded_guests:
                    guests = list(invitation.guests.all())
                    excluded_ids = []
                    for idx in excluded_guests:
                        try:
                            if 0 <= idx < len(guests):
                                guest = guests[idx]
                                # Set not_coming flag
                                guest.not_coming = True
                                # Clear room assignment for consistency
                                guest.assigned_room = None
                                guest.save()
                                excluded_ids.append(guest.id)
                                logger.info(f"Guest excluded (not_coming=True): {guest.first_name} {guest.last_name or ''}")
                        except IndexError as e:
                            logger.warning(f"Invalid excluded guest index {idx}: {e}")
                    metadata['excluded_guests_ids'] = excluded_ids
                
                # 5. Persist Travel Info to Invitation Fields
                travel_info = request.data.get('travel_info')
                if travel_info:
                    invitation.travel_transport_type = travel_info.get('transport_type')  # 'traghetto' or 'aereo'
                    invitation.travel_schedule = travel_info.get('schedule')  # free-text
                    invitation.travel_car_with = travel_info.get('car_option')  # bool nullable
                    invitation.travel_carpool_interest = travel_info.get('carpool_interest')  # bool nullable
                    
                    metadata['travel_info'] = {
                        'transport': invitation.travel_transport_type,
                        'has_schedule': bool(invitation.travel_schedule),
                        'car_with': invitation.travel_car_with,
                        'carpool_interest': invitation.travel_carpool_interest
                    }
                    logger.info(f"Travel info saved for {invitation.code}: {metadata['travel_info']}")
                
                # 6. Update RSVP Status & Logistics
                invitation.status = new_status
                if new_status == 'confirmed':
                    invitation.accommodation_requested = request.data.get('accommodation_requested', False)
                    # transfer_requested deprecated but kept for backward compatibility
                    invitation.transfer_requested = request.data.get('transfer_requested', False)
                else:
                    # If declined, reset logistics
                    invitation.accommodation_requested = False
                    invitation.transfer_requested = False
                
                invitation.save()
                
                # 7. Log Interaction with Enhanced Metadata
                _log_interaction(request, invitation, 'rsvp_submit', metadata=metadata)
                
                return Response({
                    'success': True, 
                    'message': 'Risposta registrata con successo!'
                })
                
        except Invitation.DoesNotExist:
            return Response({'success': False, 'message': 'Invito non trovato'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error processing RSVP: {e}", exc_info=True)
            return Response({'success': False, 'message': 'Errore interno. Riprova.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def _log_interaction(request, invitation, event_type, metadata=None):
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')
    device_type = 'desktop'
    if 'mobile' in user_agent.lower(): device_type = 'mobile'
    elif 'tablet' in user_agent.lower(): device_type = 'tablet'
    geo_country = None
    geo_city = None
    if metadata and 'geo' in metadata:
        geo_data = metadata['geo']
        geo_country = geo_data.get('country_name') or geo_data.get('country')
        geo_city = geo_data.get('city')
    GuestInteraction.objects.create(
        invitation=invitation,
        event_type=event_type,
        ip_address=ip,
        user_agent=user_agent,
        device_type=device_type,
        geo_country=geo_country,
        geo_city=geo_city,
        metadata=metadata or {}
    )

def _auto_mark_as_read_if_first_visit(invitation):
    """
    Auto-trigger status transition sent -> read on first analytics interaction.
    Called internally when logging 'visit' events.
    """
    if invitation.status == Invitation.Status.SENT:
        logger.info(f"📬 Auto-marking invitation {invitation.code} as READ (first visit detected)")
        invitation.status = Invitation.Status.READ
        invitation.save(update_fields=['status', 'updated_at'])

class PublicLogInteractionView(APIView):
    def post(self, request):
        invitation_id = request.session.get('invitation_id')
        if not invitation_id: return Response(status=status.HTTP_401_UNAUTHORIZED)
        event_type = request.data.get('event_type')
        metadata = request.data.get('metadata', {})
        if event_type:
            try:
                invitation = Invitation.objects.get(pk=invitation_id)
                
                # Auto-trigger mark_as_read on first visit
                _auto_mark_as_read_if_first_visit(invitation)
                
                _log_interaction(request, invitation, event_type, metadata)
                return Response({"logged": True})
            except Invitation.DoesNotExist:
                return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_400_BAD_REQUEST)

class PublicLogHeatmapView(APIView):
    def post(self, request):
        invitation_id = request.session.get('invitation_id')
        if not invitation_id: return Response(status=status.HTTP_401_UNAUTHORIZED)
        mouse_data = request.data.get('mouse_data', [])
        screen_w = request.data.get('screen_width', 0)
        screen_h = request.data.get('screen_height', 0)
        session_id = request.data.get('session_id', 'unknown')
        if mouse_data:
            try:
                invitation = Invitation.objects.get(pk=invitation_id)
                _auto_mark_as_read_if_first_visit(invitation)
                GuestHeatmap.objects.create(
                    invitation_id=invitation_id,
                    session_id=session_id,
                    mouse_data=mouse_data,
                    screen_width=screen_w,
                    screen_height=screen_h
                )
                return Response({"logged": True})
            except Invitation.DoesNotExist:
                return Response(status=status.HTTP_404_NOT_FOUND)
        return Response({"logged": False}, status=status.HTTP_400_BAD_REQUEST)


# ========================================
# ADMIN API (Intranet Only)
# ========================================

class ConfigurableTextViewSet(viewsets.ModelViewSet):
    """
    CRUD completo per i testi configurabili.
    Supporta ricerca per key e filtro per language.
    """
    queryset = ConfigurableText.objects.all().order_by('key')
    serializer_class = ConfigurableTextSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['key', 'content']
    lookup_field = 'key' 
    lookup_value_regex = '[^/]+' 

    def get_queryset(self):
        qs = super().get_queryset()
        lang = self.request.query_params.get('lang')
        if lang:
            qs = qs.filter(language=lang)
        return qs

    def retrieve(self, request, key=None, *args, **kwargs):
        """
        Custom retrieve that tries to find the text by key AND language.
        If not found for specific language but found for key (in other langs), it returns 404 cleanly
        or could arguably return the default one.
        But for Admin editing, we want to create specific instances.
        
        Usage: GET /api/admin/texts/my.key/?lang=en
        """
        lang = request.query_params.get('lang', 'it')
        try:
            instance = ConfigurableText.objects.get(key=key, language=lang)
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except ConfigurableText.DoesNotExist:
            return Response({'error': 'Not Found', 'key': key, 'language': lang}, status=status.HTTP_404_NOT_FOUND)

    def update(self, request, *args, **kwargs):
        """
        Create or Update logic hidden behind PUT/PATCH on the 'key'.
        If the record for key+lang doesn't exist, we create it.
        """
        key = kwargs.get('key')
        lang = request.query_params.get('lang', 'it')
        partial = kwargs.pop('partial', False)
        
        instance, created = ConfigurableText.objects.get_or_create(
            key=key, 
            language=lang,
            defaults={'content': request.data.get('content', '')}
        )
        
        if not created:
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)
        else:
            # If created, we might need to update it if the content passed was different from default empty
            if 'content' in request.data:
                serializer = self.get_serializer(instance, data=request.data, partial=partial)
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)
            else:
                serializer = self.get_serializer(instance)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)

class InvitationViewSet(viewsets.ModelViewSet):
    """CRUD completo inviti (solo admin)"""
    queryset = Invitation.objects.all().order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return InvitationListSerializer
        return InvitationSerializer

    @action(detail=False, methods=['get'])
    def search(self, request):
        code = request.query_params.get('code', None)
        if not code:
            return Response({'error': 'Code parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            invitation = Invitation.objects.get(code=code)
            serializer = InvitationSerializer(invitation)
            return Response(serializer.data)
        except Invitation.DoesNotExist:
            return Response({'error': 'Invitation not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['get'])
    def generate_link(self, request, pk=None):
        invitation = self.get_object()
        config, _ = GlobalConfig.objects.get_or_create(pk=1)
        token = invitation.generate_verification_token(config.invitation_link_secret)
        frontend_url = os.environ.get('FRONTEND_PUBLIC_URL', 'http://localhost')
        public_url = f"{frontend_url}?code={invitation.code}&token={token}"
        return Response({'code': invitation.code, 'token': token, 'url': public_url})

    @action(detail=True, methods=['post'], url_path='mark-as-sent')
    def mark_as_sent(self, request, pk=None):
        """Mark invitation as manually sent"""
        invitation = self.get_object()
        invitation.status = Invitation.Status.SENT
        invitation.save()
        return Response({'status': 'sent', 'message': f'Invito {invitation.name} segnato come Inviato'})

    @action(detail=True, methods=['post'], url_path='mark-as-read')
    def mark_as_read(self, request, pk=None):
        """
        Mark invitation as read (sent -> read transition).
        Idempotent: safe to call multiple times.
        Usually triggered automatically by analytics, but can be called manually.
        """
        invitation = self.get_object()
        
        # Idempotency check: only transition if currently 'sent'
        if invitation.status == Invitation.Status.SENT:
            invitation.status = Invitation.Status.READ
            invitation.save(update_fields=['status', 'updated_at'])
            logger.info(f"📬 Manual mark_as_read: {invitation.code} -> READ")
            return Response({
                'status': 'read', 
                'message': f'Invito {invitation.name} segnato come Letto',
                'transition': 'sent -> read'
            })
        else:
            # Already read or in different state
            return Response({
                'status': invitation.status,
                'message': f'Invito già in stato {invitation.get_status_display()}',
                'transition': 'none'
            })

    @action(detail=True, methods=['get'])
    def heatmaps(self, request, pk=None):
        invitation = self.get_object()
        heatmaps = GuestHeatmap.objects.filter(invitation=invitation).order_by('-timestamp')
        data = [{'id': h.id, 'session_id': h.session_id, 'timestamp': h.timestamp, 'mouse_data': h.mouse_data, 'screen_width': h.screen_width, 'screen_height': h.screen_height} for h in heatmaps]
        return Response(data)

    @action(detail=True, methods=['get'])
    def interactions(self, request, pk=None):
        invitation = self.get_object()
        interactions = GuestInteraction.objects.filter(invitation=invitation).order_by('timestamp')
        heatmaps = GuestHeatmap.objects.filter(invitation=invitation)
        sessions_map = {}
        for hm in heatmaps:
            sid = hm.session_id
            if sid not in sessions_map:
                sessions_map[sid] = {'session_id': sid, 'start_time': hm.timestamp, 'heatmap': {'id': hm.id, 'mouse_data': hm.mouse_data, 'screen_width': hm.screen_width, 'screen_height': hm.screen_height}, 'events': [], 'device_info': 'Unknown'}
            else:
                sessions_map[sid]['heatmap']['mouse_data'].extend(hm.mouse_data)
        for evt in interactions:
            meta = evt.metadata or {}
            sid = meta.get('session_id')
            if not sid: sid = f"unknown_{evt.ip_address}"
            if sid not in sessions_map:
                sessions_map[sid] = {'session_id': sid, 'start_time': evt.timestamp, 'heatmap': None, 'events': [], 'device_info': f"{evt.device_type} ({evt.geo_country or '?'})"}
            if sessions_map[sid]['device_info'] == 'Unknown' or sessions_map[sid]['device_info'].startswith('Unknown'):
                 sessions_map[sid]['device_info'] = f"{evt.device_type} ({evt.geo_country or '?'})"
            sessions_map[sid]['events'].append({'type': evt.event_type, 'timestamp': evt.timestamp, 'details': meta})
        sorted_sessions = sorted(sessions_map.values(), key=lambda x: x['start_time'], reverse=True)
        return Response(sorted_sessions)

class GlobalConfigViewSet(viewsets.ViewSet):
    def list(self, request):
        config, created = GlobalConfig.objects.get_or_create(pk=1)
        serializer = GlobalConfigSerializer(config)
        return Response(serializer.data)

    def create(self, request):
        config, created = GlobalConfig.objects.get_or_create(pk=1)
        serializer = GlobalConfigSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class WhatsAppTemplateViewSet(viewsets.ModelViewSet):
    """CRUD for WhatsApp Templates"""
    queryset = WhatsAppTemplate.objects.all().order_by('-created_at')
    serializer_class = WhatsAppTemplateSerializer

class AccommodationViewSet(viewsets.ModelViewSet):
    """CRUD completo per Alloggi (solo admin)"""
    queryset = Accommodation.objects.all()
    serializer_class = AccommodationSerializer

    @action(detail=False, methods=['get'], url_path='unassigned-invitations')
    def unassigned_invitations(self, request):
        """Fetch confirmed invitations requesting accommodation with unassigned guests (excluding not_coming)"""
        unassigned = Invitation.objects.filter(
            status=Invitation.Status.CONFIRMED,
            accommodation_requested=True,
            guests__assigned_room__isnull=True,
            guests__not_coming=False  # Exclude deselected guests
        ).distinct().prefetch_related('guests')
        data = []
        for inv in unassigned:
            # Count only guests who are coming
            adults = inv.guests.filter(is_child=False, not_coming=False).count()
            children = inv.guests.filter(is_child=True, not_coming=False).count()
            data.append({'id': inv.id, 'name': inv.name, 'code': inv.code, 'adults_count': adults, 'children_count': children, 'total_guests': adults + children})
        return Response(data)

    @action(detail=False, methods=['post'], url_path='auto-assign')
    def auto_assign(self, request):
        strategy_code = request.data.get('strategy', 'SIMULATION')
        is_simulation = strategy_code == 'SIMULATION'
        
        strategies = {
            'STANDARD': {
                'name': 'Standard (Default)',
                'description': 'Processa prima i gruppi affini, stanze ordinate per capienza decrescente.',
                'invitation_sort': lambda i: i.id,
                'room_sort': lambda r: -r.total_capacity(),
                'group_affinity': True
            },
            'SPACE_OPTIMIZER': {
                'name': 'Space Optimizer (Tetris)',
                'description': 'Priorità ai gruppi numerosi su stanze "Best Fit" (piccole ma sufficienti).',
                'invitation_sort': lambda i: -(i.guests.filter(not_coming=False).count()),
                'room_sort': lambda r: r.total_capacity(),
                'group_affinity': True
            },
            'CHILDREN_FIRST': {
                'name': 'Children First',
                'description': 'Priorità alle famiglie con bambini per occupare slot specifici.',
                'invitation_sort': lambda i: -(i.guests.filter(is_child=True, not_coming=False).count()),
                'room_sort': lambda r: -(r.capacity_children),
                'group_affinity': True
            },
            'PERFECT_MATCH': {
                'name': 'Perfect Match Only',
                'description': 'Cerca di riempire le stanze al 100% della capienza.',
                'invitation_sort': lambda i: -(i.guests.filter(not_coming=False).count()),
                'room_sort': lambda r: r.total_capacity(),
                'group_affinity': False,
                'perfect_match_only': True
            },
            'SMALLEST_FIRST': {
                'name': 'Smallest First',
                'description': 'Riempimento dal basso (coppie e singoli prima).',
                'invitation_sort': lambda i: i.guests.filter(not_coming=False).count(),
                'room_sort': lambda r: r.total_capacity(),
                'group_affinity': False
            },
            'AFFINITY_CLUSTER': {
                'name': 'Affinity Cluster',
                'description': 'Massimizza la coesione dei gruppi affini trattandoli come blocchi unici.',
                'invitation_sort': lambda i: -(i.guests.filter(not_coming=False).count() + sum(a.guests.filter(not_coming=False).count() for a in i.affinities.all())),
                'room_sort': lambda r: -r.total_capacity(),
                'group_affinity': True,
                'force_cluster': True
            }
        }

        def run_strategy(strategy_key, strategy_params, dry_run=True):
            sid = transaction.savepoint()
            
            try:
                if request.data.get('reset_previous', False):
                    Person.objects.filter(assigned_room__isnull=False).update(assigned_room=None)
                    Invitation.objects.filter(accommodation__isnull=False).update(accommodation=None)

                invitations = list(Invitation.objects.filter(
                    status=Invitation.Status.CONFIRMED,
                    accommodation_requested=True,
                    guests__assigned_room__isnull=True,
                    guests__not_coming=False  # Exclude not_coming guests
                ).distinct().prefetch_related('guests', 'affinities', 'non_affinities'))

                accommodations = list(Accommodation.objects.prefetch_related(
                    'rooms__assigned_guests__invitation',
                    'assigned_invitations__non_affinities'
                ).all())
                
                assigned_count = 0
                wasted_beds = 0
                assignment_log = []

                def get_room_owner(room):
                    owner_ids = list(Person.objects.filter(assigned_room=room, not_coming=False).values_list('invitation_id', flat=True).distinct())
                    if not owner_ids: return None
                    if len(owner_ids) > 1: return -1
                    return owner_ids[0]

                def is_accommodation_compatible(acc, inv):
                    non_affine_ids = set(inv.non_affinities.values_list('id', flat=True))
                    existing_inv_ids = set(Person.objects.filter(
                        assigned_room__accommodation=acc,
                        not_coming=False
                    ).values_list('invitation_id', flat=True))
                    
                    if non_affine_ids.intersection(existing_inv_ids):
                        return False
                    return True

                def can_fit(room, person, inv_id):
                    owner = get_room_owner(room)
                    if owner == -1: return False
                    if owner is not None and owner != inv_id: return False
                    
                    slots = room.available_slots()
                    if person.is_child:
                        return (slots['child_slots_free'] > 0) or (slots['adult_slots_free'] > 0)
                    else:
                        return slots['adult_slots_free'] > 0

                def assign_invitation(inv, acc):
                    nonlocal assigned_count, wasted_beds
                    
                    if strategy_params.get('perfect_match_only', False):
                        if acc.available_capacity() < inv.guests.filter(not_coming=False).count(): return False

                    if not is_accommodation_compatible(acc, inv): return False

                    persons = list(inv.guests.filter(assigned_room__isnull=True, not_coming=False))
                    if not persons: return True

                    rooms = list(acc.rooms.all())
                    rooms.sort(key=strategy_params['room_sort'])

                    temp_assignments = []
                    sid_inv = transaction.savepoint()
                    
                    all_assigned = True
                    for p in persons:
                        assigned = False
                        for r in rooms:
                            if can_fit(r, p, inv.id):
                                p.assigned_room = r
                                p.save()
                                temp_assignments.append((p, r))
                                assigned = True
                                break
                        if not assigned:
                            all_assigned = False
                            break
                    
                    if all_assigned:
                        transaction.savepoint_commit(sid_inv)
                        inv.accommodation = acc
                        inv.save()
                        assigned_count += len(temp_assignments)
                        for p, r in temp_assignments:
                            assignment_log.append({
                                'person': str(p),
                                'room': str(r),
                                'invitation': inv.name
                            })
                        return True
                    else:
                        transaction.savepoint_rollback(sid_inv)
                        return False

                invitations.sort(key=strategy_params['invitation_sort'])
                processed_ids = set()

                for inv in invitations:
                    if inv.id in processed_ids: continue
                    
                    group = [inv]
                    if strategy_params.get('group_affinity', True):
                        affinities = list(inv.affinities.filter(
                            status=Invitation.Status.CONFIRMED,
                            accommodation_requested=True
                        ).exclude(id__in=processed_ids))
                        group.extend(affinities)
                    
                    assigned_group = False
                    accommodations.sort(key=lambda a: a.available_capacity(), reverse=True)

                    for acc in accommodations:
                        sid_group = transaction.savepoint()
                        group_success = True
                        
                        for g_inv in group:
                            if not assign_invitation(g_inv, acc):
                                group_success = False
                                break
                        
                        if group_success:
                            transaction.savepoint_commit(sid_group)
                            for g_inv in group: processed_ids.add(g_inv.id)
                            assigned_group = True
                            break
                        else:
                            transaction.savepoint_rollback(sid_group)
                    
                    if not assigned_group and not strategy_params.get('force_cluster', False):
                         for g_inv in group:
                            if g_inv.id in processed_ids: continue
                            for acc in accommodations:
                                if assign_invitation(g_inv, acc):
                                    processed_ids.add(g_inv.id)
                                    break

                unassigned_count = Person.objects.filter(
                    invitation__status=Invitation.Status.CONFIRMED,
                    invitation__accommodation_requested=True,
                    assigned_room__isnull=True,
                    not_coming=False
                ).count()

                occupied_rooms = Room.objects.filter(assigned_guests__isnull=False, assigned_guests__not_coming=False).distinct()
                for r in occupied_rooms:
                    slots = r.available_slots()
                    wasted_beds += slots['total_free']

                results = {
                    'strategy_code': strategy_key,
                    'strategy_name': strategy_params['name'],
                    'assigned_guests': assigned_count,
                    'unassigned_guests': unassigned_count,
                    'wasted_beds': wasted_beds,
                    'assignment_log': assignment_log
                }

            except Exception as e:
                logger.error(f"Strategy {strategy_key} failed: {e}", exc_info=True)
                results = {'error': str(e)}
            
            finally:
                if dry_run:
                    transaction.savepoint_rollback(sid)
                else:
                    transaction.savepoint_commit(sid)
            
            return results

        if is_simulation:
            simulation_results = []
            for key, params in strategies.items():
                logger.info(f"🧪 Simulating Strategy: {key}")
                res = run_strategy(key, params, dry_run=True)
                simulation_results.append(res)
            
            simulation_results.sort(key=lambda x: (-x.get('assigned_guests', 0), x.get('wasted_beds', 9999)))
            
            return Response({
                'mode': 'SIMULATION',
                'results': simulation_results,
                'best_strategy': simulation_results[0]['strategy_code'] if simulation_results else None
            })
        
        else:
            if strategy_code not in strategies:
                return Response({'error': 'Invalid Strategy'}, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"🚀 Executing Strategy: {strategy_code}")
            result = run_strategy(strategy_code, strategies[strategy_code], dry_run=False)
            return Response({
                'mode': 'EXECUTION',
                'result': result
            })

class DashboardStatsView(APIView):
    """Statistiche dashboard (solo admin) - UPDATED to exclude not_coming guests"""
    def get(self, request):
        config, _ = GlobalConfig.objects.get_or_create(pk=1)
        
        confirmed_invitations = Invitation.objects.filter(status=Invitation.Status.CONFIRMED)
        pending_invitations = Invitation.objects.filter(status__in=[Invitation.Status.SENT, Invitation.Status.READ])
        declined_invitations = Invitation.objects.filter(status=Invitation.Status.DECLINED)
        
        # CRITICAL: Exclude not_coming guests from all counts
        adults_confirmed = Person.objects.filter(invitation__in=confirmed_invitations, is_child=False, not_coming=False).count()
        children_confirmed = Person.objects.filter(invitation__in=confirmed_invitations, is_child=True, not_coming=False).count()
        
        adults_pending = Person.objects.filter(invitation__in=pending_invitations, is_child=False, not_coming=False).count()
        children_pending = Person.objects.filter(invitation__in=pending_invitations, is_child=True, not_coming=False).count()
        
        adults_declined = Person.objects.filter(invitation__in=declined_invitations, is_child=False, not_coming=False).count()
        children_declined = Person.objects.filter(invitation__in=declined_invitations, is_child=True, not_coming=False).count()

        stats_guests = {
            'adults_confirmed': adults_confirmed,
            'children_confirmed': children_confirmed,
            'adults_pending': adults_pending,
            'children_pending': children_pending,
            'adults_declined': adults_declined,
            'children_declined': children_declined,
        }

        acc_confirmed_adults = 0
        acc_confirmed_children = 0
        trans_confirmed = 0

        for inv in confirmed_invitations:
            inv_adults = inv.guests.filter(is_child=False, not_coming=False).count()
            inv_children = inv.guests.filter(is_child=True, not_coming=False).count()
            
            if inv.accommodation_requested:
                acc_confirmed_adults += inv_adults
                acc_confirmed_children += inv_children
            
            if inv.transfer_requested:
                trans_confirmed += (inv_adults + inv_children)

        def calculate_cost(adults, children, acc_adults, acc_children, transfers):
            total = 0
            total += float(adults) * float(config.price_adult_meal)
            total += float(children) * float(config.price_child_meal)
            total += float(acc_adults) * float(config.price_accommodation_adult)
            total += float(acc_children) * float(config.price_accommodation_child)
            total += float(transfers) * float(config.price_transfer)
            return total

        cost_confirmed = calculate_cost(
            adults_confirmed, children_confirmed,
            acc_confirmed_adults, acc_confirmed_children,
            trans_confirmed
        )

        est_acc_adults = acc_confirmed_adults
        est_acc_children = acc_confirmed_children
        est_trans = trans_confirmed

        for inv in pending_invitations:
            inv_adults = inv.guests.filter(is_child=False, not_coming=False).count()
            inv_children = inv.guests.filter(is_child=True, not_coming=False).count()
            
            if inv.accommodation_offered:
                est_acc_adults += inv_adults
                est_acc_children += inv_children
            
            if inv.transfer_offered:
                est_trans += (inv_adults + inv_children)

        cost_total_estimated = calculate_cost(
            adults_confirmed + adults_pending,
            children_confirmed + children_pending,
            est_acc_adults,
            est_acc_children,
            est_trans
        )

        return Response({
            'guests': stats_guests,
            'logistics': {
                'accommodation': {
                    'confirmed_adults': acc_confirmed_adults,
                    'confirmed_children': acc_confirmed_children,
                    'total_confirmed': acc_confirmed_adults + acc_confirmed_children
                },
                'transfer': {
                    'confirmed': trans_confirmed
                }
            },
            'financials': {
                'confirmed': cost_confirmed,
                'estimated_total': cost_total_estimated,
                'currency': '€'
            }
        })
