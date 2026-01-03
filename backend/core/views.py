from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.db.models import Sum, Count, Q
from django.contrib.sessions.models import Session
from .models import Invitation, GlobalConfig, Person, Accommodation, Room, GuestInteraction, GuestHeatmap
from .serializers import (
    InvitationSerializer, InvitationListSerializer, GlobalConfigSerializer, 
    AccommodationSerializer, PublicInvitationSerializer
)
import logging
import os

logger = logging.getLogger(__name__)

# ========================================
# PUBLIC API (Internet - Session Based)
# ========================================

class PublicInvitationAuthView(APIView):
    """
    Endpoint INIZIALE per autenticazione invito pubblico.
    Valida code + token e crea sessione sicura.
    """
    def post(self, request):
        code = request.data.get('code')
        token = request.data.get('token')
        
        config, _ = GlobalConfig.objects.get_or_create(pk=1)
        
        if not code or not token:
            return Response({
                'valid': False,
                'message': 'Parametri mancanti: code e token richiesti.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            invitation = Invitation.objects.get(code=code)
            
            # Verifica token
            if not invitation.verify_token(token, config.invitation_link_secret):
                logger.warning(f"Token non valido per invito {code}")
                return Response({
                    'valid': False,
                    'message': config.unauthorized_message
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Token valido: salva in sessione
            request.session['invitation_code'] = code
            request.session['invitation_token'] = token
            request.session['invitation_id'] = invitation.id
            request.session.save()
            
            logger.info(f"Sessione creata per invito {code} (ID: {invitation.id})")
            
            # Serializza invito
            serializer = PublicInvitationSerializer(invitation, context={'config': config})
            return Response({
                'valid': True,
                'invitation': serializer.data
            })
            
        except Invitation.DoesNotExist:
            return Response({
                'valid': False,
                'message': config.unauthorized_message
            }, status=status.HTTP_404_NOT_FOUND)


class PublicInvitationView(APIView):
    """
    Endpoint per recuperare dettagli invito (richiede sessione attiva).
    """
    def get(self, request):
        # Verifica sessione
        invitation_id = request.session.get('invitation_id')
        stored_code = request.session.get('invitation_code')
        stored_token = request.session.get('invitation_token')
        
        if not all([invitation_id, stored_code, stored_token]):
            config, _ = GlobalConfig.objects.get_or_create(pk=1)
            return Response({
                'valid': False,
                'message': 'Sessione non valida. Ricarica la pagina dal link originale.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            invitation = Invitation.objects.get(id=invitation_id, code=stored_code)
            config, _ = GlobalConfig.objects.get_or_create(pk=1)
            
            # Double-check token
            if not invitation.verify_token(stored_token, config.invitation_link_secret):
                request.session.flush()  # Invalida sessione
                return Response({
                    'valid': False,
                    'message': config.unauthorized_message
                }, status=status.HTTP_403_FORBIDDEN)
            
            serializer = PublicInvitationSerializer(invitation, context={'config': config})
            return Response({
                'valid': True,
                'invitation': serializer.data
            })
            
        except Invitation.DoesNotExist:
            request.session.flush()
            config, _ = GlobalConfig.objects.get_or_create(pk=1)
            return Response({
                'valid': False,
                'message': config.unauthorized_message
            }, status=status.HTTP_404_NOT_FOUND)


class PublicRSVPView(APIView):
    """
    Endpoint per conferma/declino partecipazione (richiede sessione attiva).
    """
    def post(self, request):
        invitation_id = request.session.get('invitation_id')
        
        if not invitation_id:
            return Response({
                'success': False,
                'message': 'Sessione scaduta.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            invitation = Invitation.objects.get(id=invitation_id)
            
            # Aggiorna stato
            new_status = request.data.get('status')  # 'confirmed' | 'declined'
            if new_status not in ['confirmed', 'declined']:
                return Response({
                    'success': False,
                    'message': 'Stato non valido.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            invitation.status = new_status
            
            # Opzioni logistiche (solo se confermato)
            if new_status == 'confirmed':
                invitation.accommodation_requested = request.data.get('accommodation_requested', False)
                invitation.transfer_requested = request.data.get('transfer_requested', False)
            
            invitation.save()
            
            # Log RSVP submit interaction directly
            _log_interaction(request, invitation, 'rsvp_submit', metadata=request.data)
            
            logger.info(f"RSVP aggiornato per invito {invitation.code}: {new_status}")
            
            return Response({
                'success': True,
                'message': 'Risposta registrata con successo!'
            })
            
        except Invitation.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Invito non trovato.'
            }, status=status.HTTP_404_NOT_FOUND)

def _log_interaction(request, invitation, event_type, metadata=None):
    """Helper interno per loggare interazioni"""
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')
        
    device_type = 'desktop'
    if 'mobile' in user_agent.lower(): device_type = 'mobile'
    elif 'tablet' in user_agent.lower(): device_type = 'tablet'
    
    # Estrazione Geo Dati (passati dal frontend nel metadata)
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

class PublicLogInteractionView(APIView):
    """
    Endpoint per loggare interazioni generiche (click, visite, reset).
    """
    def post(self, request):
        invitation_id = request.session.get('invitation_id')
        if not invitation_id: return Response(status=status.HTTP_401_UNAUTHORIZED)
            
        event_type = request.data.get('event_type')
        metadata = request.data.get('metadata', {})
        
        if event_type:
            try:
                invitation = Invitation.objects.get(pk=invitation_id)
                _log_interaction(request, invitation, event_type, metadata)
                return Response({"logged": True})
            except Invitation.DoesNotExist:
                return Response(status=status.HTTP_404_NOT_FOUND)
        
        return Response(status=status.HTTP_400_BAD_REQUEST)

class PublicLogHeatmapView(APIView):
    """
    Endpoint per loggare dati heatmap (mouse tracking).
    """
    def post(self, request):
        invitation_id = request.session.get('invitation_id')
        if not invitation_id: return Response(status=status.HTTP_401_UNAUTHORIZED)
            
        mouse_data = request.data.get('mouse_data', [])
        screen_w = request.data.get('screen_width', 0)
        screen_h = request.data.get('screen_height', 0)
        session_id = request.data.get('session_id', 'unknown')
        
        if mouse_data:
            try:
                # Verifica esistenza invito per integrità dati
                Invitation.objects.get(pk=invitation_id)
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
        """Genera link pubblico con token per un invito (Admin Only)"""
        invitation = self.get_object()
        config, _ = GlobalConfig.objects.get_or_create(pk=1)
        token = invitation.generate_verification_token(config.invitation_link_secret)
        
        # Costruisci URL pubblico (frontend-user)
        frontend_url = os.environ.get('FRONTEND_PUBLIC_URL', 'http://localhost')
        public_url = f"{frontend_url}?code={invitation.code}&token={token}"
        
        return Response({
            'code': invitation.code,
            'token': token,
            'url': public_url
        })

    @action(detail=True, methods=['get'])
    def heatmaps(self, request, pk=None):
        """Recupera le sessioni di heatmap per un dato invito"""
        invitation = self.get_object()
        heatmaps = GuestHeatmap.objects.filter(invitation=invitation).order_by('-timestamp')
        data = [{
            'id': h.id,
            'session_id': h.session_id,
            'timestamp': h.timestamp,
            'mouse_data': h.mouse_data,
            'screen_width': h.screen_width,
            'screen_height': h.screen_height
        } for h in heatmaps]
        return Response(data)

    @action(detail=True, methods=['get'])
    def interactions(self, request, pk=None):
        """
        Raggruppa interazioni e heatmap per session_id
        Restituisce una lista di 'sessioni' con eventi cronologici
        """
        invitation = self.get_object()
        
        # Fetch all interactions
        interactions = GuestInteraction.objects.filter(invitation=invitation).order_by('timestamp')
        heatmaps = GuestHeatmap.objects.filter(invitation=invitation)
        
        # Group by Session ID (from metadata if available, or fallback to timestamp logic if needed)
        # Assuming frontend sends 'session_id' in metadata for interactions
        sessions_map = {}
        
        # Process Heatmaps first to establish base sessions
        for hm in heatmaps:
            sid = hm.session_id
            if sid not in sessions_map:
                sessions_map[sid] = {
                    'session_id': sid,
                    'start_time': hm.timestamp,
                    'heatmap': {
                        'id': hm.id,
                        'mouse_data': hm.mouse_data,
                        'screen_width': hm.screen_width,
                        'screen_height': hm.screen_height
                    },
                    'events': [],
                    'device_info': 'Unknown'
                }

        # Process Interactions
        for evt in interactions:
            # Try to match interaction to a session
            # 1. Check explicit session_id in metadata
            meta = evt.metadata or {}
            sid = meta.get('session_id')
            
            # If no explicit session_id, we might create a 'Legacy/Unknown' session bucket 
            # or try to match by close timestamp/IP if critical. For now, we group by 'unknown' if missing.
            if not sid:
                sid = f"unknown_{evt.ip_address}" 

            if sid not in sessions_map:
                sessions_map[sid] = {
                    'session_id': sid,
                    'start_time': evt.timestamp,
                    'heatmap': None,
                    'events': [],
                    'device_info': f"{evt.device_type} ({evt.geo_country or '?'})"
                }
            
            # Enrich device info if available and not set
            if sessions_map[sid]['device_info'] == 'Unknown' or sessions_map[sid]['device_info'].startswith('Unknown'):
                 sessions_map[sid]['device_info'] = f"{evt.device_type} ({evt.geo_country or '?'})"

            sessions_map[sid]['events'].append({
                'type': evt.event_type,
                'timestamp': evt.timestamp,
                'details': meta
            })

        # Sort sessions by start_time descending
        sorted_sessions = sorted(sessions_map.values(), key=lambda x: x['start_time'], reverse=True)
        
        return Response(sorted_sessions)


class GlobalConfigViewSet(viewsets.ViewSet):
    """Configurazione globale (solo admin)"""
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


class AccommodationViewSet(viewsets.ModelViewSet):
    """CRUD completo per Alloggi (solo admin)"""
    queryset = Accommodation.objects.all()
    serializer_class = AccommodationSerializer

    # CRITICAL FIX: explicitly set url_path to match kebab-case from frontend
    @action(detail=False, methods=['post'], url_path='auto-assign')
    def auto_assign(self, request):
        """
        Algoritmo di assegnazione automatica GRANULARE: Person -> Room.
        """
        try:
            # Reset assegnazioni precedenti
            if request.data.get('reset_previous', False):
                Person.objects.filter(assigned_room__isnull=False).update(assigned_room=None)
                Invitation.objects.filter(accommodation__isnull=False).update(accommodation=None)
                logger.info("Reset assegnazioni precedenti completato")

            # Fetch invitati da processare
            invitations = Invitation.objects.filter(
                status=Invitation.Status.CONFIRMED,
                accommodation_requested=True,
                guests__assigned_room__isnull=True
            ).distinct().prefetch_related('guests', 'affinities', 'non_affinities')

            # Fetch alloggi con stanze
            accommodations = Accommodation.objects.prefetch_related('rooms__assigned_guests').all()

            assigned_count = 0
            assignment_log = []

            def can_fit_in_room(room, person):
                slots = room.available_slots()
                if person.is_child:
                    return (slots['child_slots_free'] > 0) or (slots['adult_slots_free'] > 0)
                else:
                    return slots['adult_slots_free'] > 0

            def has_non_affinity_in_room(room, invitation):
                non_affine_ids = set(invitation.non_affinities.values_list('id', flat=True))
                room_guests = room.assigned_guests.all()
                for guest in room_guests:
                    if guest.invitation_id in non_affine_ids:
                        return True
                return False

            def assign_group_to_accommodation(group_invitations, accommodation):
                nonlocal assigned_count, assignment_log
                
                all_persons = []
                for inv in group_invitations:
                    all_persons.extend(inv.guests.filter(assigned_room__isnull=True))

                rooms = sorted(
                    accommodation.rooms.all(),
                    key=lambda r: r.total_capacity(),
                    reverse=True
                )

                for person in all_persons:
                    assigned = False
                    for room in rooms:
                        if has_non_affinity_in_room(room, person.invitation):
                            continue
                        
                        if can_fit_in_room(room, person):
                            person.assigned_room = room
                            person.save()
                            
                            if not person.invitation.accommodation:
                                person.invitation.accommodation = accommodation
                                person.invitation.save()
                            
                            assigned_count += 1
                            assignment_log.append({
                                'person': f"{person.first_name} {person.last_name or ''}",
                                'invitation': person.invitation.name,
                                'room': f"{accommodation.name} - {room.room_number}",
                                'is_child': person.is_child
                            })
                            assigned = True
                            break
                    
                    if not assigned:
                        logger.warning(f"Impossibile assegnare {person} dell'invito {person.invitation.name}")
                        return False
                
                return True

            # Fase 1: Assegna gruppi affini insieme
            processed_invitations = set()
            
            for invitation in invitations:
                if invitation.id in processed_invitations:
                    continue

                affine_invitations = [invitation] + list(
                    invitation.affinities.filter(
                        status=Invitation.Status.CONFIRMED,
                        accommodation_requested=True,
                        guests__assigned_room__isnull=True
                    ).distinct()
                )

                for acc in accommodations:
                    if assign_group_to_accommodation(affine_invitations, acc):
                        for inv in affine_invitations:
                            processed_invitations.add(inv.id)
                        logger.info(f"Gruppo affine assegnato a {acc.name}: {[i.name for i in affine_invitations]}")
                        break

            # Fase 2: Assegna invitati singoli rimasti
            remaining = Invitation.objects.filter(
                status=Invitation.Status.CONFIRMED,
                accommodation_requested=True,
                guests__assigned_room__isnull=True
            ).distinct()

            for invitation in remaining:
                for acc in accommodations:
                    if assign_group_to_accommodation([invitation], acc):
                        logger.info(f"Invito singolo assegnato a {acc.name}: {invitation.name}")
                        break

            unassigned_persons = Person.objects.filter(
                invitation__status=Invitation.Status.CONFIRMED,
                invitation__accommodation_requested=True,
                assigned_room__isnull=True
            ).count()

            return Response({
                'success': True,
                'assigned_count': assigned_count,
                'unassigned_count': unassigned_persons,
                'assignment_log': assignment_log
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Errore assegnazione alloggi: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DashboardStatsView(APIView):
    """Statistiche dashboard (solo admin)"""
    def get(self, request):
        config, _ = GlobalConfig.objects.get_or_create(pk=1)
        
        confirmed_invitations = Invitation.objects.filter(status=Invitation.Status.CONFIRMED)
        pending_invitations = Invitation.objects.filter(status=Invitation.Status.PENDING)
        declined_invitations = Invitation.objects.filter(status=Invitation.Status.DECLINED)
        
        adults_confirmed = Person.objects.filter(invitation__in=confirmed_invitations, is_child=False).count()
        children_confirmed = Person.objects.filter(invitation__in=confirmed_invitations, is_child=True).count()
        
        adults_pending = Person.objects.filter(invitation__in=pending_invitations, is_child=False).count()
        children_pending = Person.objects.filter(invitation__in=pending_invitations, is_child=True).count()
        
        adults_declined = Person.objects.filter(invitation__in=declined_invitations, is_child=False).count()
        children_declined = Person.objects.filter(invitation__in=declined_invitations, is_child=True).count()

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
            inv_adults = inv.guests.filter(is_child=False).count()
            inv_children = inv.guests.filter(is_child=True).count()
            
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
            inv_adults = inv.guests.filter(is_child=False).count()
            inv_children = inv.guests.filter(is_child=True).count()
            
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
