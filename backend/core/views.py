from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.db.models import Sum, Count, Q
from .models import Invitation, GlobalConfig, Person, Accommodation
from .serializers import InvitationSerializer, InvitationListSerializer, GlobalConfigSerializer, AccommodationSerializer
import logging

logger = logging.getLogger(__name__)

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
        Algoritmo di assegnazione automatica invitati -> alloggi.
        
        Regole:
        1. Solo invitati CONFERMATI con accommodation_requested=True
        2. Invitati affini hanno priorità nello stesso alloggio
        3. Invitati non-affini NON possono mai coesistere
        4. CAPACITY LOGIC:
           - Un BAMBINO può occupare un posto ADULTO (flessibilità verso l'alto)
           - Un ADULTO NON può occupare un posto BAMBINO (rigidità verso il basso)
           - Esempio: Stanza con (A:2, B:1)
             * OK: 3 bambini (usano 2 adulti + 1 bambino)
             * OK: 2 adulti + 1 bambino
             * NO: 3 adulti (non possono usare il posto bambino)
        """
        try:
            # Reset assegnazioni precedenti (opzionale)
            if request.data.get('reset_previous', False):
                Invitation.objects.filter(accommodation__isnull=False).update(accommodation=None)
                logger.info("Reset assegnazioni precedenti completato")

            # Fetch invitati da processare
            invitations = Invitation.objects.filter(
                status=Invitation.Status.CONFIRMED,
                accommodation_requested=True,
                accommodation__isnull=True  # Solo non ancora assegnati
            ).prefetch_related('guests', 'affinities', 'non_affinities')

            # Fetch alloggi disponibili
            accommodations = Accommodation.objects.prefetch_related('rooms').all()

            assigned_count = 0
            assignment_log = []

            def check_capacity(accommodation, adults_needed, children_needed):
                """
                Controlla se l'alloggio può ospitare il gruppo.
                
                Logica:
                - Calcola posti adulti disponibili (può ospitare adulti o bambini)
                - Calcola posti bambini disponibili (solo per bambini)
                - Assegna prima i bambini ai posti bambini, poi eventualmente ai posti adulti
                - Gli adulti possono usare SOLO i posti adulti
                """
                total_adult_slots = sum(room.capacity_adults for room in accommodation.rooms.all())
                total_child_slots = sum(room.capacity_children for room in accommodation.rooms.all())

                # Sottrai posti già occupati
                for inv in accommodation.assigned_invitations.all():
                    occupied_adults = inv.guests.filter(is_child=False).count()
                    occupied_children = inv.guests.filter(is_child=True).count()
                    
                    # Gli adulti occupano sempre i posti adulti
                    total_adult_slots -= occupied_adults
                    
                    # I bambini occupano prima i posti bambini, poi quelli adulti se necessario
                    if occupied_children <= total_child_slots:
                        total_child_slots -= occupied_children
                    else:
                        # Overflow: i bambini extra vanno sui posti adulti
                        overflow = occupied_children - total_child_slots
                        total_child_slots = 0
                        total_adult_slots -= overflow

                # Verifica se ci sta il nuovo gruppo
                # Step 1: Assegna bambini
                children_in_child_slots = min(children_needed, total_child_slots)
                children_in_adult_slots = children_needed - children_in_child_slots
                
                # Step 2: Verifica adulti (solo posti adulti)
                total_needed_adult_slots = adults_needed + children_in_adult_slots
                
                if total_needed_adult_slots <= total_adult_slots:
                    return True
                return False

            # Fase 1: Assegna gruppi affini insieme
            for invitation in invitations:
                if invitation.accommodation:
                    continue  # Già assegnato in iterazione precedente

                # Cerca affinità non ancora assegnate
                affine_invitations = [invitation] + list(
                    invitation.affinities.filter(
                        status=Invitation.Status.CONFIRMED,
                        accommodation_requested=True,
                        accommodation__isnull=True
                    )
                )

                # Verifica non-affinità (blocco)
                non_affine_ids = set()
                for inv in affine_invitations:
                    non_affine_ids.update(inv.non_affinities.values_list('id', flat=True))

                # Calcola capienza richiesta dal gruppo
                total_adults = sum(i.guests.filter(is_child=False).count() for i in affine_invitations)
                total_children = sum(i.guests.filter(is_child=True).count() for i in affine_invitations)

                # Cerca alloggio compatibile
                for acc in accommodations:
                    # Check: nessun invitato non-affine già nell'alloggio
                    existing = acc.assigned_invitations.all()
                    if any(e.id in non_affine_ids for e in existing):
                        continue

                    # Check capienza con nuova logica
                    if check_capacity(acc, total_adults, total_children):
                        # Assegna gruppo
                        for inv in affine_invitations:
                            inv.accommodation = acc
                            inv.save()
                            assigned_count += 1
                            assignment_log.append({
                                'invitation': inv.name,
                                'accommodation': acc.name,
                                'group_type': 'affine'
                            })
                        logger.info(f"Gruppo affine assegnato a {acc.name}: {[i.name for i in affine_invitations]}")
                        break

            # Fase 2: Assegna invitati singoli rimasti
            remaining = Invitation.objects.filter(
                status=Invitation.Status.CONFIRMED,
                accommodation_requested=True,
                accommodation__isnull=True
            )

            for invitation in remaining:
                adults = invitation.guests.filter(is_child=False).count()
                children = invitation.guests.filter(is_child=True).count()
                non_affine_ids = set(invitation.non_affinities.values_list('id', flat=True))

                for acc in accommodations:
                    existing = acc.assigned_invitations.all()
                    if any(e.id in non_affine_ids for e in existing):
                        continue

                    if check_capacity(acc, adults, children):
                        invitation.accommodation = acc
                        invitation.save()
                        assigned_count += 1
                        assignment_log.append({
                            'invitation': invitation.name,
                            'accommodation': acc.name,
                            'group_type': 'single'
                        })
                        logger.info(f"Invito singolo assegnato a {acc.name}: {invitation.name}")
                        break

            unassigned = Invitation.objects.filter(
                status=Invitation.Status.CONFIRMED,
                accommodation_requested=True,
                accommodation__isnull=True
            ).count()

            return Response({
                'success': True,
                'assigned_count': assigned_count,
                'unassigned_count': unassigned,
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
