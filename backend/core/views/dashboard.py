from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from core.models import Invitation, InvitationLabel
from core.analytics import DynamicPieChartEngine

class DynamicDashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        """
        Query Params:
        - filters: comma separated list of values (e.g. 'groom,sent,Label2')
        """
        filters_param = request.query_params.get('filters', '')
        if not filters_param:
            return Response({"error": "No filters provided"}, status=400)
            
        selected_filters = [f.strip() for f in filters_param.split(',') if f.strip()]
        
        queryset = Invitation.objects.all()
        engine = DynamicPieChartEngine(queryset, selected_filters)
        levels = engine.calculate()
        
        # Get Available filters for UI (could be optimized/cached)
        labels = InvitationLabel.objects.values_list('name', flat=True)
        origins = [c[0] for c in Invitation.Origin.choices]
        statuses = [c[0] for c in Invitation.Status.choices]
        
        return Response({
            "levels": levels,
            "meta": {
                "total": queryset.count(),
                "available_filters": {
                    "origins": origins,
                    "statuses": statuses,
                    "labels": list(labels)
                }
            }
        })
