from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.db.models import Sum, Count, Q
from .models import Invitation, GlobalConfig, Person, Accommodation, Room
from .serializers import (
    InvitationSerializer, InvitationListSerializer, GlobalConfigSerializer, 
    AccommodationSerializer, PublicInvitationSerializer
)
import logging

logger = logging.getLogger(__name__)

class PublicInvitationView(APIView):
    """
    Endpoint pubblico per accesso inviti da parte degli ospiti.
    Richiede: code + token di verifica.
    """
    def get(self, request):
        code = request.query_params.get('code')
        token = request.query_params.get('token')
        
        config, _ = GlobalConfig.objects.get_or_create(pk=1)
        
        if not code or not token:
            return Response({
                'valid': False,
                'message': config.unauthorized_message
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            invitation = Invitation.objects.get(code=code)
            
            # Verifica token
            if not invitation.verify_token(token, config.invitation_link_secret):
                return Response({
                    'valid': False,
                    'message': config.unauthorized_message
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Token valido: serializza invito
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


class InvitationViewSet(viewsets.ModelViewSet):
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
        
        # Costruisci URL pubblico
        base_url = request.build_absolute_uri('/').rstrip('/')
        public_url = f"{base_url}?code={invitation.code}&token={token}"
        
        return Response({
            'code': invitation.code,
            'token': token,
            'url': public_url
        })


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
    """CRUD completo per Alloggi"""
    queryset = Accommodation.objects.all()
    serializer_class = AccommodationSerializer

    @action(detail=False, methods=['post'])
    def auto_assign(self, request):
        """
        Algoritmo di assegnazione automatica GRANULARE: Person -> Room.
        
        Regole:
        1. Solo invitati CONFERMATI con accommodation_requested=True
        2. Invitati affini hanno priorità nella stessa stanza/struttura
        3. Invitati non-affini NON possono coesistere nella stessa stanza
        4. CAPACITY LOGIC:
           - Un BAMBINO può occupare un posto ADULTO
           - Un ADULTO NON può occupare un posto BAMBINO
        5. Assegnazione a livello di Person (ogni persona viene assegnata a una Room specifica)
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
                guests__assigned_room__isnull=True  # Almeno un guest non assegnato
            ).distinct().prefetch_related('guests', 'affinities', 'non_affinities')

            # Fetch alloggi con stanze
            accommodations = Accommodation.objects.prefetch_related('rooms__assigned_guests').all()

            assigned_count = 0
            assignment_log = []

            def can_fit_in_room(room, person):
                """
                Verifica se una persona può essere assegnata a una stanza.
                Considera la logica adulti/bambini.
                """
                slots = room.available_slots()
                
                if person.is_child:
                    # Bambino: può usare posti bambini o adulti
                    return (slots['child_slots_free'] > 0) or (slots['adult_slots_free'] > 0)
                else:
                    # Adulto: solo posti adulti
                    return slots['adult_slots_free'] > 0

            def has_non_affinity_in_room(room, invitation):
                """
                Verifica se nella stanza c'è già un invitato non-affine.
                """
                non_affine_ids = set(invitation.non_affinities.values_list('id', flat=True))
                room_guests = room.assigned_guests.all()
                for guest in room_guests:
                    if guest.invitation_id in non_affine_ids:
                        return True
                return False

            def assign_group_to_accommodation(group_invitations, accommodation):
                """
                Assegna un gruppo di invitati affini alle stanze di un alloggio.
                Cerca di mantenerli vicini (stessa stanza se possibile).
                """
                nonlocal assigned_count, assignment_log
                
                # Raccogli tutte le persone del gruppo
                all_persons = []
                for inv in group_invitations:
                    all_persons.extend(inv.guests.filter(assigned_room__isnull=True))

                # Verifica non-affinità
                non_affine_ids = set()
                for inv in group_invitations:
                    non_affine_ids.update(inv.non_affinities.values_list('id', flat=True))

                # Ordina stanze per capienza (più grandi prima)
                rooms = sorted(
                    accommodation.rooms.all(),
                    key=lambda r: r.total_capacity(),
                    reverse=True
                )

                # Prova ad assegnare tutte le persone
                for person in all_persons:
                    assigned = False
                    for room in rooms:
                        # Check non-affinità
                        if has_non_affinity_in_room(room, person.invitation):
                            continue
                        
                        # Check capienza
                        if can_fit_in_room(room, person):
                            person.assigned_room = room
                            person.save()
                            
                            # Aggiorna accommodation dell'invito (se non già fatto)
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
                        # Non c'è spazio per questa persona
                        logger.warning(f"Impossibile assegnare {person} dell'invito {person.invitation.name}")
                        return False
                
                return True

            # Fase 1: Assegna gruppi affini insieme
            processed_invitations = set()
            
            for invitation in invitations:
                if invitation.id in processed_invitations:
                    continue

                # Cerca affinità non ancora assegnate
                affine_invitations = [invitation] + list(
                    invitation.affinities.filter(
                        status=Invitation.Status.CONFIRMED,
                        accommodation_requested=True,
                        guests__assigned_room__isnull=True
                    ).distinct()
                )

                # Cerca alloggio con capienza sufficiente
                for acc in accommodations:
                    if assign_group_to_accommodation(affine_invitations, acc):
                        # Successo
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

            # Conta non assegnati
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
    def get(self, request):
        config, _ = GlobalConfig.objects.get_or_create(pk=1)
        
        # 1. GUESTS
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

        # 2. LOGISTICS (Confirmed)
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

        # 3. FINANCIALS
        def calculate_cost(adults, children, acc_adults, acc_children, transfers):
            total = 0
            total += float(adults) * float(config.price_adult_meal)
            total += float(children) * float(config.price_child_meal)
            total += float(acc_adults) * float(config.price_accommodation_adult)
            total += float(acc_children) * float(config.price_accommodation_child)
            total += float(transfers) * float(config.price_transfer)
            return total

        # Costo Confermato
        cost_confirmed = calculate_cost(
            adults_confirmed, children_confirmed,
            acc_confirmed_adults, acc_confirmed_children,
            trans_confirmed
        )

        # Costo Ipotizzato (Confermato + Pending)
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
