from rest_framework import viewsets
from .models import Invitation
from .serializers import InvitationSerializer, InvitationListSerializer

class InvitationViewSet(viewsets.ModelViewSet):
    queryset = Invitation.objects.all().order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return InvitationListSerializer
        return InvitationSerializer
