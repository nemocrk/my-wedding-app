from rest_framework import serializers
from .models import Invitation, Person, GlobalConfig, Accommodation, Room

class GlobalConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalConfig
        fields = '__all__'

class PersonSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = Person
        fields = [
            'id', 'first_name', 'last_name', 'is_child', 
            'dietary_requirements'
        ]
        extra_kwargs = {
            'last_name': {'required': False, 'allow_blank': True, 'allow_null': True}
        }

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id', 'room_number', 'capacity_adults', 'capacity_children']


class AccommodationSerializer(serializers.ModelSerializer):
    rooms = RoomSerializer(many=True)
    total_capacity = serializers.IntegerField(read_only=True)
    available_capacity = serializers.IntegerField(read_only=True)

    class Meta:
        model = Accommodation
        fields = [
            'id', 'name', 'address', 'rooms',
            'total_capacity', 'available_capacity',
            'created_at', 'updated_at'
        ]

    def create(self, validated_data):
        rooms_data = validated_data.pop('rooms')
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
    
    class Meta:
        model = Invitation
        fields = [
            'id', 'code', 'name', 'accommodation_offered', 'transfer_offered',
            'accommodation_requested', 'transfer_requested', 'accommodation',
            'affinities', 'non_affinities', 'guests', 'created_at', 'status'
        ]
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        guests_data = validated_data.pop('guests')
        affinities = validated_data.pop('affinities', [])
        non_affinities = validated_data.pop('non_affinities', [])
        
        invitation = Invitation.objects.create(**validated_data)
        
        for guest_data in guests_data:
            guest_data.pop('id', None)
            Person.objects.create(invitation=invitation, **guest_data)
            
        self._handle_affinities(invitation, affinities, non_affinities)
                
        return invitation

    def update(self, instance, validated_data):
        guests_data = validated_data.pop('guests', None)
        affinities = validated_data.pop('affinities', None)
        non_affinities = validated_data.pop('non_affinities', None)

        # 1. Update Invitation Fields (status, logistics, name, etc.)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # 2. Update Guests
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
                    # Logistics removed from guest
                        
                    guest.save()
                    incoming_guest_ids.append(g_id)
                else:
                    g_data.pop('id', None)
                    new_guest = Person.objects.create(invitation=instance, **g_data)
                    incoming_guest_ids.append(new_guest.id)
            
            for g_id, guest in existing_guests.items():
                if g_id not in incoming_guest_ids:
                    guest.delete()

        # 3. Update Affinities
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

    class Meta:
        model = Invitation
        fields = [
            'id', 'name', 'code', 'guests_count', 'guests', 
            'accommodation_offered', 'transfer_offered', 
            'accommodation_requested', 'transfer_requested',
            'status', 'accommodation_name'
        ]
