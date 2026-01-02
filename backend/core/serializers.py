from rest_framework import serializers
from .models import Invitation, Person

class PersonSerializer(serializers.ModelSerializer):
    # id is needed for updates to map back to existing records
    id = serializers.IntegerField(required=False)

    class Meta:
        model = Person
        fields = ['id', 'first_name', 'last_name', 'is_child']
        extra_kwargs = {
            'last_name': {'required': False, 'allow_blank': True, 'allow_null': True}
        }

class InvitationSerializer(serializers.ModelSerializer):
    guests = PersonSerializer(many=True)
    
    class Meta:
        model = Invitation
        fields = [
            'id', 'code', 'name', 'accommodation_offered', 'transfer_offered',
            'affinities', 'non_affinities', 'guests', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        guests_data = validated_data.pop('guests')
        affinities = validated_data.pop('affinities', [])
        non_affinities = validated_data.pop('non_affinities', [])
        
        # 1. Create Invitation
        invitation = Invitation.objects.create(**validated_data)
        
        # 2. Create Guests
        for guest_data in guests_data:
            # remove id if present (shouldn't be for create, but safe check)
            guest_data.pop('id', None)
            Person.objects.create(invitation=invitation, **guest_data)
            
        # 3. Set M2M Relations & Enforce Symmetry
        self._handle_affinities(invitation, affinities, non_affinities)
                
        return invitation

    def update(self, instance, validated_data):
        guests_data = validated_data.pop('guests', None)
        affinities = validated_data.pop('affinities', None)
        non_affinities = validated_data.pop('non_affinities', None)

        # 1. Update Invitation Fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # 2. Update Guests
        if guests_data is not None:
            # Current guests in DB
            existing_guests = {g.id: g for g in instance.guests.all()}
            incoming_guest_ids = []

            for g_data in guests_data:
                g_id = g_data.get('id')
                if g_id and g_id in existing_guests:
                    # Update existing guest
                    guest = existing_guests[g_id]
                    guest.first_name = g_data.get('first_name', guest.first_name)
                    # Use explicit get to allow clearing last_name (sending None or "")
                    if 'last_name' in g_data:
                        guest.last_name = g_data['last_name']
                    if 'is_child' in g_data:
                        guest.is_child = g_data['is_child']
                    guest.save()
                    incoming_guest_ids.append(g_id)
                else:
                    # Create new guest
                    g_data.pop('id', None)
                    new_guest = Person.objects.create(invitation=instance, **g_data)
                    incoming_guest_ids.append(new_guest.id)
            
            # Delete guests not present in the incoming list
            for g_id, guest in existing_guests.items():
                if g_id not in incoming_guest_ids:
                    guest.delete()

        # 3. Update Affinities (Symmetric)
        self._handle_affinities(instance, affinities, non_affinities)

        return instance

    def _handle_affinities(self, invitation, affinities, non_affinities):
        if affinities is not None:
            invitation.affinities.set(affinities)
            # Ensure symmetry for added ones
            for related in affinities:
                related.affinities.add(invitation)
                
        if non_affinities is not None:
            invitation.non_affinities.set(non_affinities)
            for related in non_affinities:
                related.non_affinities.add(invitation)

class InvitationListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views"""
    guests_count = serializers.IntegerField(source='guests.count', read_only=True)
    # Instead of just names string, we return the full list of guests (light version)
    guests = PersonSerializer(many=True, read_only=True)

    class Meta:
        model = Invitation
        fields = ['id', 'name', 'code', 'guests_count', 'guests', 'accommodation_offered', 'transfer_offered']
