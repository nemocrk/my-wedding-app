from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.db.models import Sum, Count, Q
from django.contrib.sessions.models import Session
from django.db import transaction
from django.utils import timezone
from .models import Invitation, GlobalConfig, Person, Accommodation, Room, GuestInteraction, GuestHeatmap, WhatsAppMessageQueue
from .serializers import (
    InvitationSerializer, InvitationListSerializer, GlobalConfigSerializer, 
    AccommodationSerializer, PublicInvitationSerializer, WhatsAppMessageQueueSerializer
)
import logging
import os
import copy

logger = logging.getLogger(__name__)

# ========================================
# PUBLIC API (Internet - Session Based)
# ========================================

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
    def post(self, request):
        invitation_id = request.session.get('invitation_id')
        if not invitation_id:
            return Response({'success': False, 'message': 'Sessione scaduta'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            invitation = Invitation.objects.get(id=invitation_id)
            new_status = request.data.get('status')
            if new_status not in ['confirmed', 'declined']:
                return Response({'success': False, 'message': 'Stato non valido'}, status=status.HTTP_400_BAD_REQUEST)
            invitation.status = new_status
            if new_status == 'confirmed':
                invitation.accommodation_requested = request.data.get('accommodation_requested', False)
                invitation.transfer_requested = request.data.get('transfer_requested', False)
            invitation.save()
            meta = request.data.copy()
            _log_interaction(request, invitation, 'rsvp_submit', metadata=meta)
            return Response({'success': True, 'message': 'Risposta registrata con successo!'})
        except Invitation.DoesNotExist:
            return Response({'success': False, 'message': 'Invito non trovato'}, status=status.HTTP_404_NOT_FOUND)

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

class PublicLogInteractionView(APIView):
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
    def post(self, request):
        invitation_id = request.session.get('invitation_id')
        if not invitation_id: return Response(status=status.HTTP_401_UNAUTHORIZED)
        mouse_data = request.data.get('mouse_data', [])
        screen_w = request.data.get('screen_width', 0)
        screen_h = request.data.get('screen_height', 0)
        session_id = request.data.get('session_id', 'unknown')
        if mouse_data:
            try:
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
        invitation = self.get_object()
        config, _ = GlobalConfig.objects.get_or_create(pk=1)
        token = invitation.generate_verification_token(config.invitation_link_secret)
        frontend_url = os.environ.get('FRONTEND_PUBLIC_URL', 'http://localhost')
        public_url = f"{frontend_url}?code={invitation.code}&token={token}"
        return Response({'code': invitation.code, 'token': token, 'url': public_url})

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

class AccommodationViewSet(viewsets.ModelViewSet):
    """CRUD completo per Alloggi (solo admin)"""
    queryset = Accommodation.objects.all()
    serializer_class = AccommodationSerializer

    @action(detail=False, methods=['get'], url_path='unassigned-invitations')
    def unassigned_invitations(self, request):
        unassigned = Invitation.objects.filter(
            status=Invitation.Status.CONFIRMED,
            accommodation_requested=True,
            guests__assigned_room__isnull=True
        ).distinct().prefetch_related('guests')
        data = []
        for inv in unassigned:
            adults = inv.guests.filter(is_child=False).count()
            children = inv.guests.filter(is_child=True).count()
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
                'invitation_sort': lambda i: -(i.guests.count()),
                'room_sort': lambda r: r.total_capacity(),
                'group_affinity': True
            },
            'CHILDREN_FIRST': {
                'name': 'Children First',
                'description': 'Priorità alle famiglie con bambini per occupare slot specifici.',
                'invitation_sort': lambda i: -(i.guests.filter(is_child=True).count()),
                'room_sort': lambda r: -(r.capacity_children),
                'group_affinity': True
            },
            'PERFECT_MATCH': {
                'name': 'Perfect Match Only',
                'description': 'Cerca di riempire le stanze al 100% della capienza.',
                'invitation_sort': lambda i: -(i.guests.count()),
                'room_sort': lambda r: r.total_capacity(),
                'group_affinity': False,
                'perfect_match_only': True
            },
            'SMALLEST_FIRST': {
                'name': 'Smallest First',
                'description': 'Riempimento dal basso (coppie e singoli prima).',
                'invitation_sort': lambda i: i.guests.count(),
                'room_sort': lambda r: r.total_capacity(),
                'group_affinity': False
            },
            'AFFINITY_CLUSTER': {
                'name': 'Affinity Cluster',
                'description': 'Massimizza la coesione dei gruppi affini trattandoli come blocchi unici.',
                'invitation_sort': lambda i: -(i.guests.count() + sum(a.guests.count() for a in i.affinities.all())),
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
                    guests__assigned_room__isnull=True
                ).distinct().prefetch_related('guests', 'affinities', 'non_affinities'))

                accommodations = list(Accommodation.objects.prefetch_related(
                    'rooms__assigned_guests__invitation',
                    'assigned_invitations__non_affinities'
                ).all())

                assigned_count = 0
                wasted_beds = 0
                assignment_log = []

                def get_room_owner(room):
                    owner_ids = list(Person.objects.filter(assigned_room=room).values_list('invitation_id', flat=True).distinct())
                    if not owner_ids: return None
                    if len(owner_ids) > 1: return -1 
                    return owner_ids[0]

                def is_accommodation_compatible(acc, inv):
                    non_affine_ids = set(inv.non_affinities.values_list('id', flat=True))
                    existing_inv_ids = set(Person.objects.filter(
                        assigned_room__accommodation=acc
                    ).values_list('invitation_id', flat=True))
                    
                    if non_affine_ids.intersection(existing_inv_ids): return False
                    return True

                def can_fit(room, person, inv_id):
                    owner = get_room_owner(room)
                    if owner == -1: return False
                    if owner is not None and owner != inv_id: return False
                    slots = room.available_slots()
                    if person.is_child: return (slots['child_slots_free'] > 0) or (slots['adult_slots_free'] > 0)
                    else: return slots['adult_slots_free'] > 0

                def assign_invitation(inv, acc):
                    nonlocal assigned_count, wasted_beds
                    if strategy_params.get('perfect_match_only', False):
                        if acc.available_capacity() < inv.guests.count(): return False

                    if not is_accommodation_compatible(acc, inv): return False

                    persons = list(inv.guests.filter(assigned_room__isnull=True))
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
                            assignment_log.append({'person': str(p), 'room': str(r), 'invitation': inv.name})
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
                    assigned_room__isnull=True
                ).count()

                occupied_rooms = Room.objects.filter(assigned_guests__isnull=False).distinct()
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
                if dry_run: transaction.savepoint_rollback(sid)
                else: transaction.savepoint_commit(sid)
            return results

        if is_simulation:
            simulation_results = []
            for key, params in strategies.items():
                logger.info(f"Simulating Strategy: {key}")
                res = run_strategy(key, params, dry_run=True)
                simulation_results.append(res)
            simulation_results.sort(key=lambda x: (-x.get('assigned_guests', 0), x.get('wasted_beds', 9999)))
            return Response({'mode': 'SIMULATION', 'results': simulation_results, 'best_strategy': simulation_results[0]['strategy_code'] if simulation_results else None})
        else:
            if strategy_code not in strategies: return Response({'error': 'Invalid Strategy'}, status=status.HTTP_400_BAD_REQUEST)
            result = run_strategy(strategy_code, strategies[strategy_code], dry_run=False)
            return Response({'mode': 'EXECUTION', 'result': result})

class DashboardStatsView(APIView):
    def get(self, request):
        config, _ = GlobalConfig.objects.get_or_create(pk=1)
        confirmed_invitations = Invitation.objects.filter(status=Invitation.Status.CONFIRMED)
        pending_invitations = Invitation.objects.filter(status=Invitation.Status.PENDING)
        declined_invitations = Invitation.objects.filter(status=Invitation.Status.DECLINED)
        
        adults_confirmed = Person.objects.filter(invitation__in=confirmed_invitations, is_child=False).count()
        children_confirmed = Person.objects.filter(invitation__in=confirmed_invitations, is_child=True).count()
        
        stats_guests = {
            'adults_confirmed': adults_confirmed,
            'children_confirmed': children_confirmed,
            'adults_pending': Person.objects.filter(invitation__in=pending_invitations, is_child=False).count(),
            'children_pending': Person.objects.filter(invitation__in=pending_invitations, is_child=True).count(),
            'adults_declined': Person.objects.filter(invitation__in=declined_invitations, is_child=False).count(),
            'children_declined': Person.objects.filter(invitation__in=declined_invitations, is_child=True).count(),
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

        return Response({
            'guests': stats_guests,
            'logistics': {'accommodation': {'confirmed_adults': acc_confirmed_adults, 'confirmed_children': acc_confirmed_children}, 'transfer': {'confirmed': trans_confirmed}},
        })

class WhatsAppMessageQueueViewSet(viewsets.ModelViewSet):
    """
    CRUD completo per la coda messaggi.
    Permette al frontend-admin di monitorare lo stato di invio.
    """
    queryset = WhatsAppMessageQueue.objects.all().order_by('-scheduled_for')
    serializer_class = WhatsAppMessageQueueSerializer

    @action(detail=False, methods=['post'], url_path='retry-failed')
    def retry_failed(self, request):
        """Resetta messaggi falliti/saltati a Pending"""
        updated_count = WhatsAppMessageQueue.objects.filter(
            status__in=['failed', 'skipped']
        ).update(status='pending', attempts=0, error_log=None)
        return Response({'message': f'{updated_count} messaggi ri-accodati.', 'count': updated_count})

    @action(detail=True, methods=['post'], url_path='force-send')
    def force_send(self, request, pk=None):
        """Forza l'invio immediato di un singolo messaggio"""
        msg = self.get_object()
        msg.status = 'pending'
        msg.scheduled_for = timezone.now()
        msg.save()
        return Response({'message': 'Messaggio impostato con priorità immediata.'})
