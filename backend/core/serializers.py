from rest_framework import serializers
from .models import (
    Invitation, Person, GlobalConfig, Accommodation, Room,
    GuestInteraction, GuestHeatmap, WhatsAppSessionStatus, 
    WhatsAppMessageQueue, WhatsAppMessageEvent, WhatsAppTemplate,
    ConfigurableText, InvitationLabel
)

class GlobalConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalConfig
        fields = '__all__'

class ConfigurableTextSerializer(serializers.ModelSerializer):
    """Serializer per testi configurabili (Front Busta + Card Content)"""
    class Meta:
        model = ConfigurableText
        fields = ['key', 'content', 'metadata', 'updated_at']
        read_only_fields = ['key', 'updated_at']  # 'key' must be read-only for updates

class InvitationLabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvitationLabel
        fields = ['id', 'name', 'color']

class PersonSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    assigned_room_number = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Person
        fields = [
            'id', 'first_name', 'last_name', 'is_child', 
            'dietary_requirements', 'assigned_room', 'assigned_room_number'
        ]
        extra_kwargs = {
            'last_name': {'required': False, 'allow_blank': True, 'allow_null': True},
            'assigned_room': {'required': False, 'allow_null': True}
        }

    def get_assigned_room_number(self, obj):
        return obj.assigned_room.room_number if obj.assigned_room else None

class PublicPersonSerializer(serializers.ModelSerializer):
    """Serializer ridotto per visualizzazione pubblica (solo nome)"""
    class Meta:
        model = Person
        fields = ['first_name', 'last_name', 'is_child']

class PublicInvitationSerializer(serializers.ModelSerializer):
    """Serializer per endpoint pubblico con lettera renderizzata"""
    guests = PublicPersonSerializer(many=True, read_only=True)
    letter_content = serializers.SerializerMethodField()
    whatsapp = serializers.SerializerMethodField()
    travel_info = serializers.SerializerMethodField()


    class Meta:
        model = Invitation
        fields = [
            'name', 'guests', 'letter_content',
            'accommodation_offered', 'transfer_offered', 'status',
            'whatsapp', 'phone_number', 'travel_info'
        ]

    def get_letter_content(self, obj):
        """Renderizza il template della lettera con placeholder sostituiti"""
        config = self.context.get('config')
        if not config:
            config, _ = GlobalConfig.objects.get_or_create(pk=1)
        
        template = config.letter_text
        
        # Genera lista nomi ospiti
        guest_names = ', '.join([
            f"{g.first_name} {g.last_name or ''}" for g in obj.guests.all()
        ])
        
        # Sostituzioni placeholder
        rendered = template.replace('{guest_names}', guest_names)
        rendered = rendered.replace('{family_name}', obj.name)
        rendered = rendered.replace('{code}', obj.code)
        
        return rendered

    def get_whatsapp(self, obj):
        whatsAppSessionStatus = WhatsAppSessionStatus.objects.get(session_type=obj.origin)
        if not whatsAppSessionStatus:
            return {
                'whatsapp_number': '',
                'whatsapp_name': '',
                'whatsapp_picture': '',
            }
        return {
            'whatsapp_number': f"+{whatsAppSessionStatus.phone_number}",
            'whatsapp_name': whatsAppSessionStatus.name,
            'whatsapp_picture': whatsAppSessionStatus.picture
        }
    
    def get_travel_info(self, obj):
        return {
            'transport_type': obj.travel_transport_type,
            'schedule': obj.travel_schedule,
            'car_option': obj.travel_car_with,
            'carpool_interest': obj.travel_carpool_interest
        }


class RoomDetailSerializer(serializers.ModelSerializer):
    """Serializer completo per stanze con ospiti assegnati"""
    assigned_guests = PersonSerializer(many=True, read_only=True)
    occupied_count = serializers.IntegerField(read_only=True)
    available_slots = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            'id', 'room_number', 'capacity_adults', 'capacity_children',
            'assigned_guests', 'occupied_count', 'available_slots'
        ]

    def get_available_slots(self, obj):
        return obj.available_slots()

class RoomSerializer(serializers.ModelSerializer):
    """Serializer leggero per creazione/aggiornamento alloggi"""
    class Meta:
        model = Room
        fields = ['id', 'room_number', 'capacity_adults', 'capacity_children']

class InvitationAssignmentSerializer(serializers.ModelSerializer):
    """Serializer leggero per mostrare chi occupa l'alloggio"""
    adults_count = serializers.SerializerMethodField()
    children_count = serializers.SerializerMethodField()

    class Meta:
        model = Invitation
        fields = ['id', 'name', 'code', 'adults_count', 'children_count']

    def get_adults_count(self, obj):
        return obj.guests.filter(is_child=False).count()

    def get_children_count(self, obj):
        return obj.guests.filter(is_child=True).count()

class AccommodationSerializer(serializers.ModelSerializer):
    rooms = RoomSerializer(many=True, write_only=True)  # Input JSON "rooms" usa RoomSerializer
    rooms_details = RoomDetailSerializer(many=True, read_only=True, source='rooms') # Output JSON "rooms_details" usa RoomDetailSerializer

    assigned_invitations = InvitationAssignmentSerializer(many=True, read_only=True)
    total_capacity = serializers.IntegerField(read_only=True)
    available_capacity = serializers.IntegerField(read_only=True)

    class Meta:
        model = Accommodation
        fields = [
            'id', 'name', 'address', 
            'rooms',           # Writable (input)
            'rooms_details',   # Readable (output)
            'assigned_invitations',
            'total_capacity', 'available_capacity',
            'created_at', 'updated_at'
        ]

    def to_representation(self, instance):
        """Override per restituire 'rooms' con i dettagli in lettura, nascondendo 'rooms_details'"""
        representation = super().to_representation(instance)
        # Sostituiamo 'rooms' (che sarebbe vuoto o base) con i dettagli
        representation['rooms'] = RoomDetailSerializer(instance.rooms.all(), many=True).data
        # Rimuoviamo il campo duplicato se presente
        representation.pop('rooms_details', None)
        return representation

    def create(self, validated_data):
        rooms_data = validated_data.pop('rooms', [])
        accommodation = Accommodation.objects.create(**validated_data)
        for room_data in rooms_data:
            Room.objects.create(accommodation=accommodation, **room_data)
        return accommodation

    def update(self, instance, validated_data):
        rooms_data = validated_data.pop('rooms', None)
        instance.name = validated_data.get('name', instance.name)
        instance.address = validated_data.get('address', instance.address)
        instance.save()

        if rooms_data is not None:
            # Strategia: cancella e ricrea (safe per Admin UI)
            instance.rooms.all().delete()
            for room_data in rooms_data:
                Room.objects.create(accommodation=instance, **room_data)

        return instance


class InvitationSerializer(serializers.ModelSerializer):
    guests = PersonSerializer(many=True)
    accommodation = AccommodationSerializer(read_only=True) # Nested read-only for display
    contact_verified_display = serializers.CharField(source='get_contact_verified_display', read_only=True)
    labels = InvitationLabelSerializer(many=True, read_only=True)  # Read: Object List
    label_ids = serializers.PrimaryKeyRelatedField(
        many=True, 
        write_only=True, 
        queryset=InvitationLabel.objects.all(), 
        required=False,     # MUST be False for tests to pass
        allow_empty=True    # MUST be True for empty list
    ) 
    
    class Meta:
        model = Invitation
        fields = [
            'id', 'code', 'name', 'accommodation_offered', 'transfer_offered', 'accommodation_pinned',
            'accommodation_requested', 'transfer_requested', 'accommodation',
            'affinities', 'non_affinities', 'guests', 'created_at', 'status',
            'origin', 'phone_number', 'contact_verified', 'contact_verified_display',
            'labels', 'label_ids'
        ]
        read_only_fields = ['id', 'created_at', 'contact_verified_display']

    def create(self, validated_data):
        guests_data = validated_data.pop('guests')
        affinities = validated_data.pop('affinities', [])
        non_affinities = validated_data.pop('non_affinities', [])
        label_ids = validated_data.pop('label_ids', []) # Retrieve manually
        
        # Remove nested labels if accidentally passed (though read-only)
        validated_data.pop('labels', None)
        
        invitation = Invitation.objects.create(**validated_data)
        
        # Set ManyToMany Fields
        if label_ids:
             invitation.labels.set(label_ids)
        
        for guest_data in guests_data:
            guest_data.pop('id', None)
            Person.objects.create(invitation=invitation, **guest_data)
            
        self._handle_affinities(invitation, affinities, non_affinities)
                
        return invitation

    def update(self, instance, validated_data):
        guests_data = validated_data.pop('guests', None)
        affinities = validated_data.pop('affinities', None)
        non_affinities = validated_data.pop('non_affinities', None)
        label_ids = validated_data.pop('label_ids', None) # Retrieve manually
        
        # Remove nested labels
        validated_data.pop('labels', None)
        
        # Check if is imported
        if instance.status == Invitation.Status.IMPORTED:
            # Reset verification status if phone changes
            instance.status = Invitation.Status.CREATED

        # Check if phone number is changing
        new_phone = validated_data.get('phone_number')
        if new_phone is not None and new_phone != instance.phone_number:
            # Reset verification status if phone changes
            instance.contact_verified = Invitation.ContactVerified.NOT_VALID
            
        # 1. Update Invitation Fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # 2. Update Labels
        if label_ids is not None:
            instance.labels.set(label_ids)

        # 3. Update Guests (preserva assigned_room se presente)
        if guests_data is not None:
            existing_guests = {g.id: g for g in instance.guests.all()}
            incoming_guest_ids = []

            for g_data in guests_data:
                g_id = g_data.get('id')
                if g_id and g_id in existing_guests:
                    guest = existing_guests[g_id]
                    guest.first_name = g_data.get('first_name', guest.first_name)
                    
                    if 'last_name' in g_data: guest.last_name = g_data['last_name']
                    if 'is_child' in g_data: guest.is_child = g_data['is_child']
                    if 'dietary_requirements' in g_data: guest.dietary_requirements = g_data['dietary_requirements']
                    if 'assigned_room' in g_data: guest.assigned_room_id = g_data['assigned_room']
                        
                    guest.save()
                    incoming_guest_ids.append(g_id)
                else:
                    g_data.pop('id', None)
                    new_guest = Person.objects.create(invitation=instance, **g_data)
                    incoming_guest_ids.append(new_guest.id)
            
            for g_id, guest in existing_guests.items():
                if g_id not in incoming_guest_ids:
                    guest.delete()

        # 4. Update Affinities
        self._handle_affinities(instance, affinities, non_affinities)

        return instance

    def _handle_affinities(self, invitation, affinities, non_affinities):
        if affinities is not None:
            invitation.affinities.set(affinities)
            for related in affinities:
                related.affinities.add(invitation)
                
        if non_affinities is not None:
            invitation.non_affinities.set(non_affinities)
            for related in non_affinities:
                related.non_affinities.add(invitation)

class InvitationListSerializer(serializers.ModelSerializer):
    guests_count = serializers.IntegerField(source='guests.count', read_only=True)
    guests = PersonSerializer(many=True, read_only=True)
    accommodation_name = serializers.CharField(source='accommodation.name', read_only=True)
    contact_verified_display = serializers.CharField(source='get_contact_verified_display', read_only=True)
    labels = InvitationLabelSerializer(many=True, read_only=True)

    class Meta:
        model = Invitation
        fields = [
            'id', 'name', 'code', 'guests_count', 'guests', 
            'accommodation_offered', 'transfer_offered', 'accommodation_pinned',
            'accommodation_requested', 'transfer_requested',
            'status', 'accommodation_name', 'origin', 'phone_number',
            'contact_verified', 'contact_verified_display', 'labels'
        ]

# --- NEW SERIALIZERS ---

class GuestInteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestInteraction
        fields = '__all__'

class GuestHeatmapSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestHeatmap
        fields = '__all__'

class WhatsAppSessionStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppSessionStatus
        fields = '__all__'

class WhatsAppMessageEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppMessageEvent
        fields = ['phase', 'timestamp', 'duration_ms', 'metadata']

class WhatsAppMessageQueueSerializer(serializers.ModelSerializer):
    events = WhatsAppMessageEventSerializer(many=True, read_only=True)
    
    class Meta:
        model = WhatsAppMessageQueue
        fields = ['id', 'session_type', 'recipient_number', 'message_body', 'status', 'scheduled_for', 'sent_at', 'attempts', 'error_log', 'events']

class WhatsAppTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppTemplate
        fields = '__all__'
