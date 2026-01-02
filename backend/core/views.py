from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.db.models import Sum, Count, Q
from .models import Invitation, GlobalConfig, Person
from .serializers import InvitationSerializer, InvitationListSerializer, GlobalConfigSerializer

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
    """
    ViewSet for managing the Singleton GlobalConfig.
    """
    def list(self, request):
        config, created = GlobalConfig.objects.get_or_create(pk=1)
        serializer = GlobalConfigSerializer(config)
        return Response(serializer.data)

    def create(self, request):
        # Allow update via POST/PUT essentially
        config, created = GlobalConfig.objects.get_or_create(pk=1)
        serializer = GlobalConfigSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DashboardStatsView(APIView):
    """
    Returns aggregated stats for the dashboard charts.
    """
    def get(self, request):
        config, _ = GlobalConfig.objects.get_or_create(pk=1)
        
        # 1. Ospiti (Adulti/Bambini - Confermati/Non Confermati)
        stats_guests = Person.objects.aggregate(
            adults_confirmed=Count('id', filter=Q(is_child=False, is_attending=True)),
            children_confirmed=Count('id', filter=Q(is_child=True, is_attending=True)),
            adults_pending=Count('id', filter=Q(is_child=False, is_attending__isnull=True)),
            children_pending=Count('id', filter=Q(is_child=True, is_attending__isnull=True)),
            adults_declined=Count('id', filter=Q(is_child=False, is_attending=False)),
            children_declined=Count('id', filter=Q(is_child=True, is_attending=False)),
        )

        # 2. Logistic Requests (Transfer / Accommodation)
        # Confirmed Requests: field requires_X = True
        
        # Conteggio Alloggi
        acc_confirmed_adults = Person.objects.filter(requires_accommodation=True, is_child=False).count()
        acc_confirmed_children = Person.objects.filter(requires_accommodation=True, is_child=True).count()
        
        # Transfer
        trans_confirmed = Person.objects.filter(requires_transfer=True).count()

        # 3. Financials
        # Total Potential Cost (Assuming ALL pending come + ALL confirmed come)
        # Total Confirmed Cost (Only confirmed)
        
        def calculate_cost(adults, children, acc_adults, acc_children, transfers):
            total = 0
            total += adults * config.price_adult_meal
            total += children * config.price_child_meal
            total += acc_adults * config.price_accommodation_adult
            total += acc_children * config.price_accommodation_child
            total += transfers * config.price_transfer
            return total

        # Costo Confermato
        cost_confirmed = calculate_cost(
            stats_guests['adults_confirmed'], 
            stats_guests['children_confirmed'],
            acc_confirmed_adults,
            acc_confirmed_children,
            trans_confirmed
        )

        # Costo Ipotizzato (Confermato + Pending come se accettassero tutto ciò che gli è offerto)
        # Per i pending, dobbiamo stimare se prenderebbero alloggio/transfer. 
        # Pessimistic scenario (Max Cost): All pending guests take offered services.
        
        pending_adults = Person.objects.filter(is_child=False, is_attending__isnull=True)
        pending_children = Person.objects.filter(is_child=True, is_attending__isnull=True)
        
        est_acc_adults = acc_confirmed_adults
        est_acc_children = acc_confirmed_children
        est_trans = trans_confirmed

        for p in pending_adults:
            if p.invitation.accommodation_offered: est_acc_adults += 1
            if p.invitation.transfer_offered: est_trans += 1
            
        for p in pending_children:
            if p.invitation.accommodation_offered: est_acc_children += 1
            if p.invitation.transfer_offered: est_trans += 1

        cost_total_estimated = calculate_cost(
            stats_guests['adults_confirmed'] + stats_guests['adults_pending'],
            stats_guests['children_confirmed'] + stats_guests['children_pending'],
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
