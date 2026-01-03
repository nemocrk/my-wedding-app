import os
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from core.models import Invitation, GlobalConfig, GuestInteraction, GuestHeatmap

from rest_framework import serializers

# --- SERIALIZERS ---
class InvitationSerializer(serializers.ModelSerializer):
    guests = serializers.SerializerMethodField()
    letter_content = serializers.SerializerMethodField()

    class Meta:
        model = Invitation
        fields = [
            'id', 'name', 'code', 'status', 
            'accommodation_offered', 'transfer_offered',
            'accommodation_requested', 'transfer_requested',
            'guests', 'letter_content'
        ]

    def get_guests(self, obj):
        people = obj.guests.all()
        return [
            {
                'id': p.id,
                'first_name': p.first_name,
                'last_name': p.last_name,
                'is_child': p.is_child
            } for p in people
        ]

    def get_letter_content(self, obj):
        config = GlobalConfig.objects.first()
        template = config.letter_text if config else "Ciao {guest_names}!"
        guests = obj.guests.all()
        names = obj.name if not guests else ", ".join([p.first_name for p in guests])
        return template.format(guest_names=names, family_name=obj.name, code=obj.code)

class PublicAuthSerializer(serializers.Serializer):
    code = serializers.CharField()
    token = serializers.CharField()

class RSVPSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Invitation.Status.choices)
    accommodation_requested = serializers.BooleanField(required=False, default=False)
    transfer_requested = serializers.BooleanField(required=False, default=False)


# --- VIEWSETS ---

class AdminInvitationViewSet(viewsets.ModelViewSet):
    """
    Gestione completa Inviti per l'Area Admin.
    Include generazione link sicuri e recupero heatmaps.
    """
    queryset = Invitation.objects.all().order_by('-created_at')
    serializer_class = InvitationSerializer
    # permission_classes = [permissions.IsAdminUser] 

    @action(detail=True, methods=['get'])
    def generate_link(self, request, pk=None):
        invitation = self.get_object()
        config = GlobalConfig.objects.first()
        if not config:
            config = GlobalConfig.objects.create() 
            
        secret = config.invitation_link_secret
        token = invitation.generate_verification_token(secret)
        
        base_url = os.environ.get('FRONTEND_PUBLIC_URL', 'http://localhost')
        url = f"{base_url}/?code={invitation.code}&token={token}"
        return Response({'url': url})

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


class PublicInvitationViewSet(viewsets.ViewSet):
    """
    API Pubbliche per gli ospiti (Frontend User).
    """
    permission_classes = [permissions.AllowAny]

    def _log_interaction(self, request, invitation, event_type, metadata=None):
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

    @action(detail=False, methods=['post'], url_path='auth')
    def authenticate(self, request):
        serializer = PublicAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        code = serializer.validated_data['code']
        token = serializer.validated_data['token']
        invitation = get_object_or_404(Invitation, code=code)
        
        config = GlobalConfig.objects.first()
        secret = config.invitation_link_secret if config else "default-secret"

        if invitation.verify_token(token, secret):
            request.session['invitation_id'] = invitation.id
            request.session['invitation_code'] = invitation.code
            
            # Log Visit (senza geo qui, verrà loggato dal frontend con interazione esplicita 'visit' se necessario, 
            # ma lo facciamo anche qui come backup server-side)
            self._log_interaction(request, invitation, 'visit_auth')
            
            return Response({
                "valid": True,
                "invitation": InvitationSerializer(invitation).data
            })
        else:
            return Response(
                {"valid": False, "message": config.unauthorized_message if config else "Non autorizzato"},
                status=status.HTTP_403_FORBIDDEN
            )

    @action(detail=False, methods=['get'], url_path='invitation')
    def get_details(self, request):
        inv_id = request.session.get('invitation_id')
        if not inv_id: return Response(status=status.HTTP_401_UNAUTHORIZED)
        invitation = get_object_or_404(Invitation, pk=inv_id)
        return Response(InvitationSerializer(invitation).data)

    @action(detail=False, methods=['post'], url_path='rsvp')
    def submit_rsvp(self, request):
        inv_id = request.session.get('invitation_id')
        if not inv_id: return Response(status=status.HTTP_401_UNAUTHORIZED)

        serializer = RSVPSerializer(data=request.data)
        if not serializer.is_valid(): return Response(status=status.HTTP_400_BAD_REQUEST)
        
        invitation = get_object_or_404(Invitation, pk=inv_id)
        data = serializer.validated_data
        
        invitation.status = data['status']
        if data['status'] == Invitation.Status.CONFIRMED:
            if invitation.accommodation_offered:
                invitation.accommodation_requested = data['accommodation_requested']
            if invitation.transfer_offered:
                invitation.transfer_requested = data['transfer_requested']
        else:
            invitation.accommodation_requested = False
            invitation.transfer_requested = False
            
        invitation.save()
        self._log_interaction(request, invitation, 'rsvp_submit', metadata=data)
        return Response({"success": True, "message": "Grazie! La tua risposta è stata registrata."})

    @action(detail=False, methods=['post'], url_path='log-interaction')
    def log_interaction(self, request):
        inv_id = request.session.get('invitation_id')
        if not inv_id: return Response(status=status.HTTP_401_UNAUTHORIZED)
            
        event_type = request.data.get('event_type')
        metadata = request.data.get('metadata', {})
        
        if event_type:
            invitation = Invitation.objects.get(pk=inv_id)
            self._log_interaction(request, invitation, event_type, metadata)
            
        return Response({"logged": True})

    @action(detail=False, methods=['post'], url_path='log-heatmap')
    def log_heatmap(self, request):
        inv_id = request.session.get('invitation_id')
        if not inv_id: return Response(status=status.HTTP_401_UNAUTHORIZED)
            
        mouse_data = request.data.get('mouse_data', [])
        screen_w = request.data.get('screen_width', 0)
        screen_h = request.data.get('screen_height', 0)
        session_id = request.data.get('session_id', 'unknown')
        
        if mouse_data:
            GuestHeatmap.objects.create(
                invitation_id=inv_id,
                session_id=session_id,
                mouse_data=mouse_data,
                screen_width=screen_w,
                screen_height=screen_h
            )
        return Response({"logged": True})
