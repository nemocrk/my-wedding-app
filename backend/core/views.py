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


class DashboardStatsView(APIView):
    def get(self, request):
        config, _ = GlobalConfig.objects.get_or_create(pk=1)
        
        # 1. Ospiti aggregati per stato INVITO
        # Se l'invito è confirmed, contiamo i suoi ospiti come confirmed
        
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

        # 2. Logistic Requests
        # Confirmed Requests: field requires_X = True AND invitation status = confirmed
        
        acc_confirmed_adults = Person.objects.filter(invitation__in=confirmed_invitations, requires_accommodation=True, is_child=False).count()
        acc_confirmed_children = Person.objects.filter(invitation__in=confirmed_invitations, requires_accommodation=True, is_child=True).count()
        trans_confirmed = Person.objects.filter(invitation__in=confirmed_invitations, requires_transfer=True).count()

        # 3. Financials
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
        # Per i pending, assumiamo lo scenario peggiore (prendono tutto se offerto)
        
        est_acc_adults = acc_confirmed_adults
        est_acc_children = acc_confirmed_children
        est_trans = trans_confirmed

        # Aggiungiamo i pending che hanno l'offerta attiva
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
