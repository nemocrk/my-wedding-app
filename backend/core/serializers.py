from rest_framework import serializers
from .models import Invitation, Person

class PersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ['id', 'first_name', 'last_name', 'is_child']
        read_only_fields = ['id']

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
            Person.objects.create(invitation=invitation, **guest_data)
            
        # 3. Set M2M Relations & Enforce Symmetry
        if affinities:
            invitation.affinities.set(affinities)
            # Reverse logic: Add this new invitation to the other side's affinities
            for other_invitation in affinities:
                other_invitation.affinities.add(invitation)
                
        if non_affinities:
            invitation.non_affinities.set(non_affinities)
            # Reverse logic: Add this new invitation to the other side's non_affinities
            for other_invitation in non_affinities:
                other_invitation.non_affinities.add(invitation)
                
        return invitation

class InvitationListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views"""
    guests_count = serializers.IntegerField(source='guests.count', read_only=True)
    guests_names = serializers.SerializerMethodField()

    class Meta:
        model = Invitation
        fields = ['id', 'name', 'code', 'guests_count', 'guests_names', 'accommodation_offered']

    def get_guests_names(self, obj):
        return ", ".join([p.first_name for p in obj.guests.all()[:3]]) + ("..." if obj.guests.count() > 3 else "")
