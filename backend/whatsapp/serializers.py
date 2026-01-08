from rest_framework import serializers
from core.models import WhatsAppMessageEvent, WhatsAppMessageQueue

class WhatsAppMessageEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppMessageEvent
        fields = ['id', 'queue_message', 'phase', 'timestamp', 'duration_ms', 'metadata']
        read_only_fields = ['id', 'timestamp']

class WhatsAppMessageQueueSerializer(serializers.ModelSerializer):
    events = WhatsAppMessageEventSerializer(many=True, read_only=True)
    
    class Meta:
        model = WhatsAppMessageQueue
        fields = ['id', 'session_type', 'recipient_number', 'message_body', 'status', 'scheduled_for', 'sent_at', 'attempts', 'error_log', 'events']
        read_only_fields = ['id', 'scheduled_for', 'sent_at', 'events']
