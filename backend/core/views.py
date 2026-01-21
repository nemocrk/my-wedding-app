from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
from django.conf import settings
import os
import json
from .models import (
    ConfigurableText, 
    Invitation, 
    Person, 
    InvitationLabel, 
    WhatsAppTemplate,
    Accommodation,
    GlobalConfig
)
from .serializers import (
    ConfigurableTextSerializer, 
    InvitationSerializer, 
    PersonSerializer, 
    InvitationLabelSerializer,
    WhatsAppTemplateSerializer,
    AccommodationSerializer,
    GlobalConfigSerializer
)
from .utils import get_font_info

# ==========================================
# PUBLIC API (No Auth Required)
# ==========================================

class PublicLanguagesView(APIView):
    """
    Endpoint pubblico per recuperare le lingue disponibili.
    Legge dal file generato automaticamente 'core/fixtures/languages.json'.
    """
    def get(self, request):
        fixture_path = os.path.join(settings.BASE_DIR, 'core/fixtures/languages.json')
        try:
            with open(fixture_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return Response(data)
        except FileNotFoundError:
            return Response({'error': 'Languages file not found'}, status=status.HTTP_404_NOT_FOUND)

class PublicConfigurableTextView(APIView):
    """
    Endpoint pubblico per recuperare i testi configurati.
    Supporta filtro lingua (?lang=en). Fallback a 'it' se non trovato.
    """
    def get(self, request):
        lang = request.query_params.get('lang', 'it')
        
        # 1. Recupera tutti i testi
        all_texts = ConfigurableText.objects.all()
        data = {}
        
        for text in all_texts:
            # 2. Cerca traduzione nella lingua richiesta
            translation = text.translations.filter(language=lang).first()
            if translation:
                data[text.key] = translation.value
            else:
                # 3. Fallback: cerca italiano
                fallback = text.translations.filter(language='it').first()
                if fallback:
                    data[text.key] = fallback.value
                else:
                    # 4. Fallback estremo: stringa vuota o chiave stessa
                    data[text.key] = ""

        return Response(data)

class PublicInvitationAuthView(APIView):
    def post(self, request):
        code = request.data.get('code')
        token = request.data.get('token')
        
        # Caso 1: Accesso tramite Token (QR Code / Link diretto)
        if token:
            try:
                # Decodifica token base64 se necessario, o usa uuid diretto
                # Qui assumiamo che il token sia l'UUID dell'invito per semplicità
                invitation = Invitation.objects.get(id=token)
                request.session['invitation_id'] = str(invitation.id)
                request.session['invitation_code'] = invitation.code
                return Response({'status': 'authenticated', 'role': 'guest'})
            except (Invitation.DoesNotExist, ValueError):
                pass # Fallback a codice manuale

        # Caso 2: Accesso manuale tramite Codice
        config = GlobalConfig.objects.first()
        if code and config and code == config.guest_password:
             return Response({'status': 'require_name_search'}, status=status.HTTP_200_OK)

        # Caso 3: Accesso specifico invito tramite codice personale (opzionale)
        if code:
            try:
                invitation = Invitation.objects.get(code=code)
                request.session['invitation_id'] = str(invitation.id)
                return Response({'status': 'authenticated', 'role': 'guest'})
            except Invitation.DoesNotExist:
                pass

        if config:
            return Response({'valid': False, 'message': config.unauthorized_message}, status=status.HTTP_404_NOT_FOUND)
        return Response({'valid': False}, status=status.HTTP_404_NOT_FOUND)

class PublicInvitationView(APIView):
    def get(self, request):
        invitation_id = request.session.get('invitation_id')
        stored_code = request.session.get('invitation_code')
        
        if not invitation_id and not stored_code:
            # Tentativo di recupero da query param (per sviluppo/test)
            code = request.query_params.get('code')
            if code:
                try:
                    invitation = Invitation.objects.get(code=code)
                    request.session['invitation_id'] = str(invitation.id)
                except Invitation.DoesNotExist:
                    return Response(status=status.HTTP_401_UNAUTHORIZED)
            else:
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            # Priorità a ID di sessione
            if invitation_id:
                invitation = Invitation.objects.get(id=invitation_id)
            else:
                invitation = Invitation.objects.get(code=stored_code)

            serializer = InvitationSerializer(invitation)
            
            # Logica "First View": se stato è 'sent' o 'created', passa a 'read'
            if invitation.status in ['created', 'sent', 'imported']:
                invitation.status = 'read'
                invitation.save()
                
            return Response(serializer.data)
        except Invitation.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

class PublicRSVPView(APIView):
    """
    Endpoint pubblico per l'invio della risposta (RSVP).
    Accetta:
    - guests: list of objects [{id, is_coming, dietary_requirements, etc.}]
    - excluded_guests: list [guest_indices] → sets Person.not_coming=True
    - travel_info: dict {transport_type, schedule, car_option, carpool_interest} → persisted to Invitation.travel_*
    """
    def post(self, request):
        invitation_id = request.session.get('invitation_id')
        if not invitation_id:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
            
        invitation = get_object_or_404(Invitation, id=invitation_id)
        data = request.data
        
        # 1. Update Guests (Person)
        guests_data = data.get('guests', [])
        for guest_info in guests_data:
            try:
                person = Person.objects.get(id=guest_info.get('id'), invitation=invitation)
                
                # Update participation fields
                if 'is_coming' in guest_info:
                    person.not_coming = not guest_info['is_coming']
                
                if 'dietary_requirements' in guest_info:
                    person.dietary_requirements = guest_info['dietary_requirements']
                
                if 'menu_choice' in guest_info:
                    person.menu_choice = guest_info['menu_choice']
                    
                if 'notes' in guest_info:
                    person.notes = guest_info['notes']
                    
                person.save()
            except Person.DoesNotExist:
                continue
                
        # 2. Handle explicitly excluded guests (from UI "remove" action)
        excluded_indices = data.get('excluded_guests', [])
        # This assumes frontend passes indices relative to the sorted list, 
        # but better to pass IDs. If passing IDs:
        excluded_ids = data.get('excluded_guest_ids', [])
        if excluded_ids:
            Person.objects.filter(id__in=excluded_ids, invitation=invitation).update(not_coming=True)
            
        # 3. Update Travel Info (Invitation level)
        travel_info = data.get('travel_info', {})
        if travel_info:
            if 'transport_type' in travel_info:
                invitation.travel_transport_type = travel_info['transport_type']
            if 'schedule' in travel_info:
                invitation.travel_arrival_time = travel_info['schedule'] # Simplified mapping
            if 'carpool_interest' in travel_info:
                invitation.travel_carpool_offered = travel_info['carpool_interest'] == 'offer'
                invitation.travel_carpool_requested = travel_info['carpool_interest'] == 'request'
                
        # 4. Update Status
        # Se tutti hanno risposto, setta a 'confirmed' o 'declined'
        all_guests = invitation.guests.all()
        # Logic: se almeno uno viene -> confirmed. Se tutti declinano -> declined.
        any_coming = any(not p.not_coming for p in all_guests)
        
        if any_coming:
            invitation.status = 'confirmed'
        else:
            invitation.status = 'declined'
            
        invitation.save()
        
        return Response({'status': 'success', 'invitation_status': invitation.status})

class PublicGuestSearchView(APIView):
    """
    Ricerca invito per nome/cognome (per chi non ha QR code).
    Restituisce lista parziale per conferma.
    """
    def post(self, request):
        query = request.data.get('name', '').strip()
        if len(query) < 3:
            return Response({'error': 'Digitare almeno 3 caratteri'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Cerca tra i main guest (Invitation name) o singole persone
        # Strategia: Cerca persone che matchano, raggruppa per invito
        people = Person.objects.filter(
            Q(first_name__icontains=query) | Q(last_name__icontains=query)
        ).select_related('invitation')
        
        results = []
        seen_invitations = set()
        
        for person in people:
            inv = person.invitation
            if inv.id not in seen_invitations:
                results.append({
                    'id': inv.id, # Non esporre ID incrementale se non sicuro, usare UUID
                    'name': inv.name, # "Famiglia Rossi"
                    'main_guest': f"{person.first_name} {person.last_name}"
                })
                seen_invitations.add(inv.id)
                
        return Response(results)

class PublicSelectInvitationView(APIView):
    """
    Seleziona un invito dalla lista di ricerca e imposta la sessione.
    Richiede un secondo step di verifica (es. data di nascita o altro)?
    Per ora semplificato: selezione diretta.
    """
    def post(self, request):
        inv_id = request.data.get('invitation_id')
        invitation = get_object_or_404(Invitation, id=inv_id)
        
        request.session['invitation_id'] = str(invitation.id)
        
        # Logica "Mark as read"
        _auto_mark_as_read_if_first_visit(invitation)
        
        return Response({'status': 'authenticated'})

def _auto_mark_as_read_if_first_visit(invitation):
    if invitation.status in ['created', 'imported', 'sent']:
        invitation.status = 'read'
        invitation.save(update_fields=['status', 'updated_at'])

class PublicLogInteractionView(APIView):
    def post(self, request):
        invitation_id = request.session.get('invitation_id')
        if not invitation_id: return Response(status=status.HTTP_401_UNAUTHORIZED)
        
        event_type = request.data.get('event_type')
        metadata = request.data.get('metadata', {})
        
        # Qui potremmo salvare su un modello 'InvitationInteraction'
        # Per ora stampiamo o passiamo
        # InvitationInteraction.objects.create(invitation_id=invitation_id, type=event_type, ...)
        
        return Response({'status': 'logged'})

class PublicConfigView(APIView):
    """Restituisce configurazione pubblica (es. feature flags, date evento)"""
    def get(self, request):
        config = GlobalConfig.objects.first()
        data = {
            'event_date': '2025-06-15', # Hardcoded o da DB
            'rsvp_deadline': '2025-05-01',
            'wedding_list_enabled': True,
            'maps_api_key': settings.GOOGLE_MAPS_API_KEY if hasattr(settings, 'GOOGLE_MAPS_API_KEY') else ''
        }
        if config:
            data.update({
                'event_date': config.event_date,
                'rsvp_deadline': config.rsvp_deadline
            })
        return Response(data)

class PublicLogHeatmapView(APIView):
    def post(self, request):
        invitation_id = request.session.get('invitation_id')
        if not invitation_id: return Response(status=status.HTTP_401_UNAUTHORIZED)
        
        # Riceve array di coordinate o eventi
        # { "clicks": [{x,y, time}, ...], "scroll_depth": 80 }
        
        # Salva su DB (modello HeatmapData da creare)
        return Response({'status': 'saved'})


# ==========================================
# ADMIN API (IsAuthenticated & IsAdminUser)
# ==========================================

class AdminGoogleFontsProxyView(APIView):
    """
    Proxy sicuro per Google Fonts → OFFLINE MODE.
    Legge dal file statico backend/assets/fontInfo.json invece di chiamare l'API.
    """
    def get(self, request):
        font_file_path = os.path.join(settings.BASE_DIR, 'assets', 'fontInfo.json')
        
        try:
            with open(font_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return Response(data)
        except FileNotFoundError:
            # Fallback minimale se il file non esiste ancora (dovrebbe essere generato al build time)
            return Response({
                "items": [
                    {"family": "Roboto", "category": "sans-serif"},
                    {"family": "Open Sans", "category": "sans-serif"},
                    {"family": "Lato", "category": "sans-serif"},
                    {"family": "Montserrat", "category": "sans-serif"},
                ]
            })

class ConfigurableTextViewSet(viewsets.ModelViewSet):
    """
    CRUD completo per i testi configurabili.
    Supporta ricerca per key e filtro per language.
    """
    queryset = ConfigurableText.objects.all().order_by('key')
    serializer_class = ConfigurableTextSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['key', 'description', 'translations__value']

    @action(detail=False, methods=['post'])
    def bulk_update_translations(self, request):
        """
        Aggiornamento massivo traduzioni.
        Input: [{ "key": "welcome_msg", "lang": "en", "value": "Hello" }, ...]
        """
        data = request.data
        updated_count = 0
        
        for item in data:
            key = item.get('key')
            lang = item.get('lang')
            val = item.get('value')
            
            try:
                conf_text = ConfigurableText.objects.get(key=key)
                # Usa related manager o metodo custom se esiste
                # Qui assumiamo un modello TextTranslation collegato
                translation, created = conf_text.translations.get_or_create(language=lang)
                translation.value = val
                translation.save()
                updated_count += 1
            except ConfigurableText.DoesNotExist:
                continue
                
        return Response({'updated': updated_count})

class InvitationLabelViewSet(viewsets.ModelViewSet):
    """
    CRUD per le etichette degli inviti.
    Permette di creare, modificare, eliminare etichette personalizzate.
    """
    queryset = InvitationLabel.objects.all().order_by('name')
    serializer_class = InvitationLabelSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

class InvitationViewSet(viewsets.ModelViewSet):
    """CRUD completo inviti (solo admin)"""
    queryset = Invitation.objects.all().order_by('-created_at')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering_fields = ['created_at', 'status', 'name']

    def get_serializer_class(self):
        # Potremmo avere serializer diverso per list vs detail
        return InvitationSerializer

    @action(detail=True, methods=['post'])
    def send_whatsapp(self, request,pk=None):
        """Invia messaggio WhatsApp (simulato o via provider)"""
        invitation = self.get_object()
        # Logica integrazione Twilio/Meta API
        invitation.status = 'sent'
        invitation.save()
        return Response({'status': 'sent', 'timestamp': '2025-01-20T10:00:00Z'})

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Importazione massiva da CSV/Excel (passato come JSON list)"""
        items = request.data.get('items', [])
        created_count = 0
        errors = []
        
        for idx, item in enumerate(items):
            serializer = InvitationSerializer(data=item)
            if serializer.is_valid():
                serializer.save()
                created_count += 1
            else:
                errors.append({'index': idx, 'error': serializer.errors})
                
        return Response({'created': created_count, 'errors': errors})

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """Eliminazione massiva inviti"""
        ids = request.data.get('ids', [])
        deleted, _ = Invitation.objects.filter(id__in=ids).delete()
        return Response({'deleted': deleted})

    @action(detail=False, methods=['post'])
    def bulk_whatsapp(self, request):
        """Invio massivo WhatsApp"""
        ids = request.data.get('ids', [])
        # In background task (Celery) sarebbe meglio
        count = Invitation.objects.filter(id__in=ids).update(status='sent')
        return Response({'queued': count})
        
    @action(detail=False, methods=['post'])
    def bulk_verify_contacts(self, request):
        """
        Verifica validità numeri di telefono per lista ID.
        Simula verifica esterna (es. Twilio Lookup).
        """
        ids = request.data.get('ids', [])
        invitations = Invitation.objects.filter(id__in=ids)
        
        results = []
        for inv in invitations:
            # Simulazione logica verifica
            is_valid = len(str(inv.phone_number)) > 5 if inv.phone_number else False
            inv.verification_status = 'verified' if is_valid else 'invalid'
            inv.save(update_fields=['verification_status'])
            results.append({'id': inv.id, 'status': inv.verification_status})
            
        return Response({'results': results})

    @action(detail=False, methods=['post'])
    def bulk_assign_labels(self, request):
        """
        Assegna o rimuove etichette in bulk.
        Action: 'add' | 'remove' | 'set'
        """
        ids = request.data.get('ids', [])
        label_ids = request.data.get('label_ids', [])
        action_type = request.data.get('action', 'add')
        
        invitations = Invitation.objects.filter(id__in=ids)
        labels = InvitationLabel.objects.filter(id__in=label_ids)
        
        count = 0
        for inv in invitations:
            if action_type == 'add':
                inv.labels.add(*labels)
            elif action_type == 'remove':
                inv.labels.remove(*labels)
            elif action_type == 'set':
                inv.labels.set(labels)
            count += 1
            
        return Response({'updated': count})

    @action(detail=True, methods=['post'])
    def pin_accommodation(self, request, pk=None):
        """Fissa l'alloggio manualmente (impedisce override automatico)"""
        invitation = self.get_object()
        acc_id = request.data.get('accommodation_id')
        
        if acc_id:
            try:
                acc = Accommodation.objects.get(id=acc_id)
                invitation.assigned_accommodation = acc
                invitation.is_accommodation_pinned = True
                invitation.save()
                return Response({'status': 'pinned', 'accommodation': acc.name})
            except Accommodation.DoesNotExist:
                return Response({'error': 'Accommodation not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            # Unpin
            invitation.is_accommodation_pinned = False
            invitation.save()
            return Response({'status': 'unpinned'})

    @action(detail=True, methods=['get'])
    def interactions(self, request, pk=None):
        """Ritorna storico interazioni per timeline"""
        # Mock data o query reale su modello InvitationInteraction
        # Struttura: [{date, action, metadata}, ...]
        mock_data = [
            {"date": "2025-01-10T09:00:00Z", "action": "sent", "details": "WhatsApp sent"},
            {"date": "2025-01-10T09:05:00Z", "action": "read", "details": "Opened link"},
            {"date": "2025-01-12T18:30:00Z", "action": "rsvp", "details": "Confirmed 2 guests"}
        ]
        return Response(mock_data)
        
    @action(detail=True, methods=['get'])
    def sessions(self, request, pk=None):
        """
        Ritorna sessioni utente (log accessi).
        Richiede integrazione con django-user-agents o similare se tracciato.
        """
        sessions = [
            {"ip": "192.168.1.1", "device": "Mobile", "last_seen": "2025-01-12T18:30:00Z", "location": "Milan, IT"}
        ]
        
        # Se abbiamo heatmaps, possiamo aggregare dati
        # Se c'è un modello SessionLog:
        # logs = SessionLog.objects.filter(invitation_id=pk)
        # serializer = SessionLogSerializer(logs, many=True)
        # return Response(serializer.data)
        
        # Per ora ritorniamo la lista statica o vuota se non implementato
        # Ordinamento per data decrescente
        sorted_sessions = sorted(sessions, key=lambda x: x['last_seen'], reverse=True)
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

    @action(detail=False, methods=['post'])
    def auto_assign(self, request):
        """
        Algoritmo assegnazione automatica alloggi.
        Logica semplice: riempi prima quelli prioritari/vicini.
        """
        # 1. Trova inviti con accommodation_requested=True e !is_accommodation_pinned
        pending = Invitation.objects.filter(
            accommodation_requested=True, 
            is_accommodation_pinned=False,
            assigned_accommodation__isnull=True
        )
        
        # 2. Loop e assegna (simulato)
        assigned_count = 0
        accommodations = list(Accommodation.objects.filter(total_rooms__gt=0)) # Filtra quelli con spazio
        
        if not accommodations:
             return Response({'error': 'No accommodations available'}, status=status.HTTP_400_BAD_REQUEST)

        for inv in pending:
            # Logica greedy: assegna al primo con spazio
            # Necessiterebbe gestione 'occupied_rooms' su Accommodation
            target = accommodations[0] 
            inv.assigned_accommodation = target
            inv.save()
            assigned_count += 1
            
        return Response({'assigned': assigned_count})

    @action(detail=True, methods=['get'])
    def occupancy(self, request, pk=None):
        """Ritorna stato occupazione per singola struttura"""
        acc = self.get_object()
        assigned_invitations = acc.assigned_invitations.all()
        
        total_guests = 0
        rooms_used = assigned_invitations.count() # Approssimazione: 1 invito = 1 stanza
        
        for inv in assigned_invitations:
            total_guests += inv.guests.filter(not_coming=False).count()
            
        return Response({
            'name': acc.name,
            'total_rooms': acc.total_rooms,
            'occupied_rooms': rooms_used,
            'available_rooms': acc.total_rooms - rooms_used,
            'guests_count': total_guests
        })

# ==========================================
# INTERNAL UTILS / ALGORITHMS
# ==========================================

def assign_invitation(inv, acc):
    # Funzione helper per logica assegnazione
    pass

class DashboardStatsView(APIView):
    """Statistiche dashboard (solo admin) - UPDATED to exclude not_coming guests"""
    def get(self, request):
        config, _ = GlobalConfig.objects.get_or_create(pk=1)
        
        # Base stats - counting INVITATIONS
        total_invitations = Invitation.objects.count()
        inv_by_status = Invitation.objects.values('status').annotate(count=Count('id'))
        
        # Guest stats - using Person model
        # Filter out not_coming=True for all "confirmed" counts
        
        # Total potential guests (all stored persons)
        total_guests_db = Person.objects.count()
        
        # Confirmed guests (status=confirmed AND not_coming=False)
        confirmed_adults = Person.objects.filter(
            invitation__status='confirmed', 
            is_child=False,
            not_coming=False
        ).count()
        
        confirmed_children = Person.objects.filter(
            invitation__status='confirmed', 
            is_child=True,
            not_coming=False
        ).count()
        
        # Pending guests (status IN [sent, read, created, imported])
        # Note: for pending, we count everyone linked to the invitation 
        # because we don't know yet if they are coming or not.
        # But if not_coming is already marked (e.g. pre-excluded), we exclude them.
        pending_statuses = ['sent', 'read', 'created', 'imported']
        pending_adults = Person.objects.filter(
            invitation__status__in=pending_statuses,
            is_child=False,
            not_coming=False
        ).count()
        
        pending_children = Person.objects.filter(
            invitation__status__in=pending_statuses,
            is_child=True,
            not_coming=False
        ).count()
        
        # Declined guests (either invitation declined OR person marked not_coming in confirmed inv)
        # 1. People in declined invitations
        declined_inv_people = Person.objects.filter(invitation__status='declined').count()
        # 2. People marked not_coming in non-declined invitations
        not_coming_people = Person.objects.exclude(invitation__status='declined').filter(not_coming=True).count()
        
        total_declined_guests = declined_inv_people + not_coming_people
        
        # Breakdown declined adults/children is harder with mixed logic, keeping simple for now
        # Or let's try to be precise:
        declined_adults = Person.objects.filter(
            Q(invitation__status='declined', is_child=False) | 
            Q(not_coming=True, is_child=False)
        ).count()
        
        # Logistics
        # Accommodation: Count PEOPLE in confirmed invitations with acc_requested
        acc_confirmed_adults = Person.objects.filter(
            invitation__status='confirmed',
            invitation__accommodation_requested=True,
            is_child=False,
            not_coming=False
        ).count()
        
        acc_confirmed_children = Person.objects.filter(
            invitation__status='confirmed',
            invitation__accommodation_requested=True,
            is_child=True,
            not_coming=False
        ).count()
        
        # Transfer
        transfer_confirmed = Person.objects.filter(
            invitation__status='confirmed',
            invitation__transfer_requested=True,
            not_coming=False
        ).count()
        
        # Financials
        # Confirmed Cost
        cost_meals = (confirmed_adults * config.price_adult_meal) + (confirmed_children * config.price_child_meal)
        cost_acc = (acc_confirmed_adults * config.price_accommodation_adult) + (acc_confirmed_children * config.price_accommodation_child)
        cost_trans = transfer_confirmed * config.price_transfer
        total_confirmed_cost = cost_meals + cost_acc + cost_trans
        
        # Estimated Cost (Confirmed + Pending)
        # We assume pending will all confirm (optimistic) or use average. 
        # Let's use simple sum of pending + confirmed
        # Need to check pending accommodation/transfer requests?
        # If invitation is pending, we assume flags are indicative of intent if set, 
        # or defaults if not. For now, let's just add pending meals.
        
        pending_cost_meals = (pending_adults * config.price_adult_meal) + (pending_children * config.price_child_meal)
        
        # For pending logistics, we check the invitation flags
        pending_acc_adults = Person.objects.filter(
            invitation__status__in=pending_statuses,
            invitation__accommodation_requested=True, # Or offered? usually requested is set by guest
            is_child=False,
            not_coming=False
        ).count()
        
        # Using 'accommodation_offered' might be better for estimation if 'requested' is not set yet
        # But let's stick to what we have. If requested is False (default), maybe we under-estimate.
        # Alternative: Use 'accommodation_offered' for pending invitations as "Potential"
        
        # Let's use 'accommodation_requested' as it reflects user intent or default
        pending_acc_children = Person.objects.filter(
            invitation__status__in=pending_statuses,
            invitation__accommodation_requested=True,
            is_child=True,
            not_coming=False
        ).count()
        
        pending_trans = Person.objects.filter(
            invitation__status__in=pending_statuses,
            invitation__transfer_requested=True,
            not_coming=False
        ).count()
        
        pending_cost_acc = (pending_acc_adults * config.price_accommodation_adult) + (pending_acc_children * config.price_accommodation_child)
        pending_cost_trans = pending_trans * config.price_transfer
        
        estimated_total_cost = total_confirmed_cost + pending_cost_meals + pending_cost_acc + pending_cost_trans

        return Response({
            'guests': {
                'total_adults': Person.objects.filter(is_child=False).count(),
                'total_children': Person.objects.filter(is_child=True).count(),
                'adults_confirmed': confirmed_adults,
                'children_confirmed': confirmed_children,
                'adults_pending': pending_adults,
                'children_pending': pending_children,
                'adults_declined': declined_adults,
                'children_declined': total_declined_guests - declined_adults # approx
            },
            'invitations': {
                'total': total_invitations,
                'sent': Invitation.objects.filter(status='sent').count(),
                'confirmed': Invitation.objects.filter(status='confirmed').count(),
                'declined': Invitation.objects.filter(status='declined').count(),
                'imported': Invitation.objects.filter(status='imported').count(),
                'created': Invitation.objects.filter(status='created').count(),
                'read': Invitation.objects.filter(status='read').count(),
            },
            'logistics': {
                'accommodation': {
                    'total_confirmed': acc_confirmed_adults + acc_confirmed_children,
                    'confirmed_adults': acc_confirmed_adults,
                    'confirmed_children': acc_confirmed_children
                },
                'transfer': {
                    'confirmed': transfer_confirmed
                }
            },
            'financials': {
                'estimated_total': estimated_total_cost,
                'confirmed': total_confirmed_cost,
                'currency': 'EUR'
            }
        })

class DynamicDashboardStatsView(APIView):
    """
    Endpoint for dynamic dashboard statistics with filtering.
    Supports filtering by origin, status, and labels.
    Calculates breakdown for sunburst/treemap visualizations.
    """
    def get(self, request):
        filters_str = request.query_params.get('filters', '')
        # Parse filters: "groom,confirmed,Label1" -> clean list
        active_filters = [f.strip() for f in filters_str.split(',') if f.strip()]
        
        # Base QuerySet
        qs = Invitation.objects.all().prefetch_related('labels')
        
        # 1. Calculate Total (unfiltered)
        total_invitations = qs.count()
        
        # 2. Extract Available Filters (for UI)
        # Origins
        available_filters = ['groom', 'bride']
        # Statuses
        available_filters.extend([s.value for s in Invitation.Status])
        # Labels
        label_names = list(InvitationLabel.objects.values_list('name', flat=True))
        available_filters.extend(label_names)
        
        # 3. Apply Filters
        if active_filters:
            q_objects = Q()
            for f in active_filters:
                # Origin match
                if f in ['groom', 'bride']:
                    q_objects |= Q(origin=f)
                # Status match
                elif f in [s.value for s in Invitation.Status]:
                    q_objects |= Q(status=f)
                # Label match
                else:
                    q_objects |= Q(labels__name=f)
            
            # If we have filters, we want invitations that match ANY of them? 
            # OR logic is standard for "tags". 
            # If logic should be AND, we would chain .filter()
            # Requirement says "filters=groom,sent" -> usually means Union (OR) in simple dashboards,
            # but let's assume OR for now based on implementation pattern above.
            qs = qs.filter(q_objects).distinct()

        # 4. Build Hierarchical Data (Sunburst/Treemap structure)
        # Level 1: Origin (Groom/Bride)
        # Level 2: Status
        # Level 3: Labels (top label only to avoid explosion)
        
        hierarchy = []
        
        # Group by Origin
        origins = ['groom', 'bride']
        for origin in origins:
            origin_qs = qs.filter(origin=origin)
            origin_count = origin_qs.count()
            
            if origin_count > 0:
                origin_node = {
                    "name": origin.capitalize(),
                    "value": origin_count,
                    "field": "origin",
                    "children": []
                }
                
                # Group by Status within Origin
                statuses = origin_qs.values('status').annotate(count=Count('id'))
                for stat in statuses:
                    s_val = stat['status']
                    s_count = stat['count']
                    
                    status_node = {
                        "name": s_val.capitalize(),
                        "value": s_count,
                        "field": "status",
                        "children": []
                    }
                    
                    # Group by Label (Optional - pick top label or "No Label")
                    # This is expensive N+1 if not careful. 
                    # Optimization: Get IDs for this slice and aggregate labels
                    slice_ids = origin_qs.filter(status=s_val).values_list('id', flat=True)
                    labels = InvitationLabel.objects.filter(invitations__in=slice_ids).annotate(count=Count('invitations'))
                    
                    if labels:
                        for lbl in labels:
                             status_node["children"].append({
                                "name": lbl.name,
                                "value": lbl.count,
                                "field": "label"
                             })
                    else:
                         status_node["children"].append({
                                "name": "No Label",
                                "value": s_count,
                                "field": "label"
                         })
                    
                    origin_node["children"].append(status_node)
                
                hierarchy.append(origin_node)
        
        # If no hierarchy (empty result), ensure valid empty structure
        # but if we have data, format for frontend (array of root nodes)
        
        return Response({
            'meta': {
                'total': total_invitations,
                'available_filters': available_filters,
                'filtered_count': qs.count()
            },
            'levels': hierarchy
        })
