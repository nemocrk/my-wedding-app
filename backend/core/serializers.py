from rest_framework import serializers
from .models import (
    Invitation, Person, GlobalConfig, Accommodation, Room, 
    GuestInteraction, GuestHeatmap, WhatsAppSessionStatus, 
    WhatsAppMessageQueue, WhatsAppMessageEvent, WhatsAppTemplate
)

class PersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ['id', 'first_name', 'last_name', 'is_child', 'dietary_requirements']

class PersonWithRoomSerializer(serializers.ModelSerializer):
    assigned_room_number = serializers.CharField(source='assigned_room.room_number', read_only=True)
    assigned_room_id = serializers.IntegerField(source='assigned_room.id', read_only=True)
    accommodation_name = serializers.CharField(source='assigned_room.accommodation.name', read_only=True)
    
    class Meta:
        model = Person
        fields = ['id', 'first_name', 'last_name', 'is_child', 'dietary_requirements', 'assigned_room_id', 'assigned_room_number', 'accommodation_name']

class InvitationSerializer(serializers.ModelSerializer):
    guests = PersonSerializer(many=True, read_only=False)
    
    class Meta:
        model = Invitation
        fields = '__all__'

    def create(self, validated_data):
        guests_data = validated_data.pop('guests')
        invitation = Invitation.objects.create(**validated_data)
        for guest_data in guests_data:
            Person.objects.create(invitation=invitation, **guest_data)
        return invitation

    def update(self, instance, validated_data):
        guests_data = validated_data.pop('guests', [])
        
        # Update invitation fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Gestione Guests:
        # Strategia semplice: se guests_data è fornito, riconcilia
        if guests_data:
            # 1. Elimina guests non presenti (se hanno ID)
            # Nota: Per semplicità in questo MVP, assumiamo che il frontend mandi tutto.
            # Se ha ID -> Update, se no -> Create.
            
            # Map existing IDs
            existing_ids = [g.id for g in instance.guests.all()]
            incoming_ids = [g.get('id') for g in guests_data if g.get('id')]
            
            # Delete removed
            for g_id in existing_ids:
                if g_id not in incoming_ids:
                    Person.objects.filter(id=g_id).delete()
            
            # Update or Create
            for g_data in guests_data:
                g_id = g_data.get('id')
                if g_id:
                    p = Person.objects.get(id=g_id, invitation=instance)
                    p.first_name = g_data.get('first_name', p.first_name)
                    p.last_name = g_data.get('last_name', p.last_name)
                    p.is_child = g_data.get('is_child', p.is_child)
                    p.dietary_requirements = g_data.get('dietary_requirements', p.dietary_requirements)
                    p.save()
                else:
                    Person.objects.create(invitation=instance, **g_data)
                    
        return instance

class InvitationListSerializer(serializers.ModelSerializer):
    """Versione leggera per la lista"""
    guests = PersonSerializer(many=True, read_only=True)
    
    class Meta:
        model = Invitation
        fields = ['id', 'code', 'name', 'status', 'origin', 'phone_number', 'guests', 'accommodation_offered', 'transfer_offered', 'accommodation_requested', 'transfer_requested']

class PublicInvitationSerializer(serializers.ModelSerializer):
    """Serializer per vista pubblica ospite (read-only)"""
    guests = PersonSerializer(many=True, read_only=True)
    config = serializers.SerializerMethodField()
    assigned_accommodation = serializers.SerializerMethodField()

    class Meta:
        model = Invitation
        fields = ['id', 'name', 'code', 'guests', 'status', 'accommodation_offered', 'transfer_offered', 'accommodation_requested', 'transfer_requested', 'config', 'assigned_accommodation']

    def get_config(self, obj):
        # Passiamo alcuni testi dinamici dalla GlobalConfig
        config = self.context.get('config')
        if not config: return {}
        # Sostituzione placeholder nel testo
        guest_names = ", ".join([p.first_name for p in obj.guests.all()])
        text = config.letter_text.replace('{guest_names}', guest_names).replace('{family_name}', obj.name).replace('{code}', obj.code)
        
        return {
            'letter_text': text,
            'whatsapp_number': config.whatsapp_groom_number if obj.origin == 'groom' else config.whatsapp_bride_number
        }
    
    def get_assigned_accommodation(self, obj):
        # Mostra dettagli alloggio SOLO se confermato
        if obj.status == Invitation.Status.CONFIRMED and obj.accommodation:
            return {
                'name': obj.accommodation.name,
                'address': obj.accommodation.address,
                'map_url': f"https://www.google.com/maps/search/?api=1&query={obj.accommodation.address}"
            }
        return None

class GlobalConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalConfig
        fields = '__all__'

class RoomSerializer(serializers.ModelSerializer):
    assigned_guests_count = serializers.IntegerField(source='assigned_guests.count', read_only=True)
    capacity_total = serializers.IntegerField(source='total_capacity', read_only=True)
    
    class Meta:
        model = Room
        fields = ['id', 'room_number', 'capacity_adults', 'capacity_children', 'assigned_guests_count', 'capacity_total']

class AccommodationSerializer(serializers.ModelSerializer):
    rooms = RoomSerializer(many=True, read_only=True)
    total_capacity = serializers.IntegerField(source='total_capacity', read_only=True)
    available_capacity = serializers.IntegerField(source='available_capacity', read_only=True)

    class Meta:
        model = Accommodation
        fields = ['id', 'name', 'address', 'rooms', 'total_capacity', 'available_capacity']

# --- ANALYTICS ---

class GuestInteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestInteraction
        fields = '__all__'

class GuestHeatmapSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestHeatmap
        fields = '__all__'

# --- WHATSAPP ---
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
