from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from core.models import Invitation, InvitationLabel
from core.analytics import DynamicPieChartEngine

class DynamicDashboardStatsView(APIView):

    def get(self, request):
        """
        Query Params:
        - filters: comma separated list of values (e.g. 'groom,sent,Label2')
        """
        filters_param = request.query_params.get('filters', '')
            
        selected_filters = [f.strip() for f in filters_param.split(',') if f.strip()]
        
        queryset = Invitation.objects.all()
        engine = DynamicPieChartEngine(queryset, selected_filters)
        
        levels = None

        if filters_param:
            levels = engine.calculate()
        
        # Get Available filters for UI (could be optimized/cached)
        labels = InvitationLabel.objects.values_list('name', flat=True)
        origins = [c[0] for c in Invitation.Origin.choices]
        statuses = [c[0] for c in Invitation.Status.choices]

        
        return Response({
            "levels": [] if levels is None else levels,
            "meta": {
                "total": queryset.count(),
                "filtered_count": queryset.count(),
                "available_filters": origins + statuses + list(labels)
            }
        })
