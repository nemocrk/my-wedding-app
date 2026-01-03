from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils.crypto import get_random_string
from core.models import Invitation, GlobalConfig, GuestInteraction, GuestHeatmap

# --- SERIALIZERS ---
from rest_framework import serializers

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
        from core.models import Person
        people = obj.guests.all()
        return [
            {
                'first_name': p.first_name,
                'last_name': p.last_name,
                'is_child': p.is_child
            } for p in people
        ]

    def get_letter_content(self, obj):
        # Recupera config globale o default
        config = GlobalConfig.objects.first()
        template = config.letter_text if config else "Ciao {guest_names}!"
        
        # Formatta i nomi
        guests = obj.guests.all()
        if not guests:
            names = obj.name
        else:
            names = ", ".join([p.first_name for p in guests])
        
        return template.format(
            guest_names=names,
            family_name=obj.name,
            code=obj.code
        )

class PublicAuthSerializer(serializers.Serializer):
    code = serializers.CharField()
    token = serializers.CharField()

class RSVPSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Invitation.Status.choices)
    accommodation_requested = serializers.BooleanField(required=False, default=False)
    transfer_requested = serializers.BooleanField(required=False, default=False)


# --- VIEWS ---

class PublicInvitationViewSet(viewsets.ViewSet):
    """
    Gestisce l'accesso pubblico agli inviti (Frontend User).
    Usa sessioni per mantenere l'autenticazione temporanea.
    """
    permission_classes = [permissions.AllowAny]

    def _log_interaction(self, request, invitation, event_type, metadata=None):
        """Helper to log interactions securely"""
        # Estrazione User Agent
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Estrazione IP (considerando Proxy/Nginx)
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
            
        # Device Type (Simple detection)
        device_type = 'desktop'
        ua_lower = user_agent.lower()
        if 'mobile' in ua_lower:
            device_type = 'mobile'
        elif 'tablet' in ua_lower or 'ipad' in ua_lower:
            device_type = 'tablet'
            
        GuestInteraction.objects.create(
            invitation=invitation,
            event_type=event_type,
            ip_address=ip,
            user_agent=user_agent,
            device_type=device_type,
            metadata=metadata or {}
        )

    @action(detail=False, methods=['post'], url_path='auth')
    def authenticate(self, request):
        """Validazione Code + Token"""
        serializer = PublicAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        code = serializer.validated_data['code']
        token = serializer.validated_data['token']
        
        # Recupera invito
        invitation = get_object_or_404(Invitation, code=code)
        
        # Recupera segreto
        config = GlobalConfig.objects.first()
        secret = config.invitation_link_secret if config else "default-secret"

        if invitation.verify_token(token, secret):
            # Login successo: salva in sessione
            request.session['invitation_id'] = invitation.id
            request.session['invitation_code'] = invitation.code
            
            # LOG VISIT
            self._log_interaction(request, invitation, 'visit')
            
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
        """Recupera dati invito da sessione attiva"""
        inv_id = request.session.get('invitation_id')
        if not inv_id:
            return Response({"message": "Sessione scaduta"}, status=status.HTTP_401_UNAUTHORIZED)
        
        invitation = get_object_or_404(Invitation, pk=inv_id)
        return Response(InvitationSerializer(invitation).data)

    @action(detail=False, methods=['post'], url_path='rsvp')
    def submit_rsvp(self, request):
        """Salva RSVP"""
        inv_id = request.session.get('invitation_id')
        if not inv_id:
            return Response({"message": "Sessione scaduta"}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = RSVPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        invitation = get_object_or_404(Invitation, pk=inv_id)
        
        data = serializer.validated_data
        
        # Update Logic
        invitation.status = data['status']
        if data['status'] == Invitation.Status.CONFIRMED:
            # Solo se confermato salviamo le richieste
            if invitation.accommodation_offered:
                invitation.accommodation_requested = data['accommodation_requested']
            if invitation.transfer_offered:
                invitation.transfer_requested = data['transfer_requested']
        else:
            # Reset se declina
            invitation.accommodation_requested = False
            invitation.transfer_requested = False
            
        invitation.save()
        
        # LOG RSVP SUBMIT
        self._log_interaction(request, invitation, 'rsvp_submit', metadata=data)

        return Response({
            "success": True,
            "message": "Grazie! La tua risposta è stata registrata."
        })

    # --- ANALYTICS ENDPOINTS ---

    @action(detail=False, methods=['post'], url_path='log-interaction')
    def log_interaction(self, request):
        """Endpoint esplicito per loggare eventi client-side (es. reset form, click cta)"""
        inv_id = request.session.get('invitation_id')
        if not inv_id:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
            
        event_type = request.data.get('event_type')
        metadata = request.data.get('metadata', {})
        
        if event_type:
            invitation = Invitation.objects.get(pk=inv_id)
            self._log_interaction(request, invitation, event_type, metadata)
            
        return Response({"logged": True})

    @action(detail=False, methods=['post'], url_path='log-heatmap')
    def log_heatmap(self, request):
        """Endpoint per ricevere batch di dati heatmap"""
        inv_id = request.session.get('invitation_id')
        if not inv_id:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
            
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
