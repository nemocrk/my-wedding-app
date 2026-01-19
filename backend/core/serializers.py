from rest_framework import serializers
from .models import Invitation, Person, GlobalConfig, GuestInteraction, GuestHeatmap, WhatsappTemplate, WhatsappMessageEvent, WhatsappSessionStatus, ConfigurableText, InvitationLabel, Accommodation, Room

class PersonSerializer(serializers.ModelSerializer):
    assigned_room_name = serializers.CharField(source='assigned_room.name', read_only=True)
    
    class Meta:
        model = Person
        fields = ['id', 'first_name', 'last_name', 'is_child', 'meal_preferences', 'notes', 'is_vegetarian', 'is_celiac', 'assigned_room_name']

class GuestInteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestInteraction
        fields = ['id', 'invitation', 'event_type', 'timestamp', 'details', 'session_id']
        read_only_fields = ['timestamp']

class GuestHeatmapSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestHeatmap
        fields = ['id', 'invitation', 'page_path', 'x_position', 'y_position', 'timestamp', 'viewport_width', 'viewport_height']
        read_only_fields = ['timestamp']

class InvitationLabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvitationLabel
        fields = ['id', 'name', 'color']

class AccommodationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Accommodation
        fields = ['id', 'name', 'address', 'website', 'description', 'total_capacity', 'total_rooms']

class RoomSerializer(serializers.ModelSerializer):
    accommodation_name = serializers.CharField(source='accommodation.name', read_only=True)
    available_slots = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Room
        fields = ['id', 'name', 'capacity', 'accommodation', 'accommodation_name', 'description', 'available_slots']

class InvitationSerializer(serializers.ModelSerializer):
    guests = PersonSerializer(many=True)
    contact_verified_display = serializers.CharField(source='get_contact_verified_display', read_only=True)
    labels = InvitationLabelSerializer(many=True, read_only=True)
    label_ids = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=InvitationLabel.objects.all(), 
        write_only=True, 
        source='labels',
        required=False  # Changed to False to fix tests
    )
    accommodation = AccommodationSerializer(read_only=True)
    assigned_room = RoomSerializer(read_only=True)
    
    class Meta:
        model = Invitation
        fields = ['id', 'code', 'name', 'accommodation_offered', 'transfer_offered', 
                 'accommodation_pinned', 'accommodation_requested', 'transfer_requested',
                 'accommodation', 'assigned_room', 'status', 'origin', 
                 'phone_number', 'contact_verified', 'contact_verified_display',
                 'guests', 'labels', 'label_ids']
        read_only_fields = ['id', 'accommodation', 'assigned_room']
        
    def create(self, validated_data):
        guests_data = validated_data.pop('guests')
        labels_data = validated_data.pop('labels', [])
        
        invitation = Invitation.objects.create(**validated_data)
        
        if labels_data:
            invitation.labels.set(labels_data)
            
        for guest_data in guests_data:
            Person.objects.create(invitation=invitation, **guest_data)
            
        return invitation
        
    def update(self, instance, validated_data):
        guests_data = validated_data.pop('guests', None)
        labels_data = validated_data.pop('labels', None)
        
        # Update invitation fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update labels if provided
        if labels_data is not None:
            instance.labels.set(labels_data)
            
        # Update guests if provided
        if guests_data is not None:
            # Simple strategy: remove all and recreate
            # In a real app you might want to update existing ones to preserve IDs
            instance.guests.all().delete()
            for guest_data in guests_data:
                Person.objects.create(invitation=instance, **guest_data)
                
        return instance

class GlobalConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalConfig
        fields = ['rsvp_enabled', 'maintenance_mode', 'welcome_message', 'invitation_link_secret']

class WhatsappTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsappTemplate
        fields = ['id', 'name', 'content', 'is_active', 'created_at']

class WhatsappMessageEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsappMessageEvent
        fields = ['id', 'invitation', 'template_name', 'status', 'sent_at', 'error_message']

class WhatsappSessionStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsappSessionStatus
        fields = ['id', 'session_id', 'status', 'qr_code', 'last_updated', 'name']

class ConfigurableTextSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfigurableText
        fields = ['id', 'key', 'language', 'value', 'description', 'updated_at']
        read_only_fields = ['updated_at']
