from django.contrib import admin
from .models import (
    GlobalConfig, ConfigurableText, Accommodation, Room, Invitation, Person,
    GuestInteraction, GuestHeatmap, WhatsAppSessionStatus, 
    WhatsAppMessageQueue, WhatsAppMessageEvent, WhatsAppTemplate
)

@admin.register(GlobalConfig)
class GlobalConfigAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'price_adult_meal', 'price_child_meal', 'whatsapp_rate_limit']
    fieldsets = (
        ('Costi Unitari', {
            'fields': ('price_adult_meal', 'price_child_meal', 'price_accommodation_adult', 'price_accommodation_child', 'price_transfer')
        }),
        ('Testi Template', {
            'fields': ('letter_text', 'unauthorized_message')
        }),
        ('Sicurezza', {
            'fields': ('invitation_link_secret',)
        }),
        ('WhatsApp Config', {
            'fields': ('whatsapp_groom_number', 'whatsapp_groom_firstname', 'whatsapp_groom_lastname',
                      'whatsapp_bride_number', 'whatsapp_bride_firstname', 'whatsapp_bride_lastname',
                      'whatsapp_rate_limit', 'whatsapp_typing_simulation')
        }),
    )

@admin.register(ConfigurableText)
class ConfigurableTextAdmin(admin.ModelAdmin):
    list_display = ['key', 'content_preview', 'updated_at']
    search_fields = ['key', 'content']
    list_filter = ['updated_at']
    ordering = ['key']
    
    def content_preview(self, obj):
        """Mostra preview del contenuto (primi 100 caratteri)"""
        return obj.content[:100] + '...' if len(obj.content) > 100 else obj.content
    content_preview.short_description = 'Anteprima Contenuto'

@admin.register(Accommodation)
class AccommodationAdmin(admin.ModelAdmin):
    list_display = ['name', 'address', 'created_at']
    search_fields = ['name', 'address']
    list_filter = ['created_at']

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['room_number', 'accommodation', 'capacity_adults', 'capacity_children']
    search_fields = ['room_number', 'accommodation__name']
    list_filter = ['accommodation']

@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'status', 'origin', 'phone_number', 'contact_verified']
    search_fields = ['name', 'code', 'phone_number']
    list_filter = ['status', 'origin', 'contact_verified', 'accommodation_offered', 'transfer_offered']
    filter_horizontal = ['affinities', 'non_affinities']

@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'invitation', 'is_child', 'not_coming', 'assigned_room']
    search_fields = ['first_name', 'last_name', 'invitation__name']
    list_filter = ['is_child', 'not_coming', 'assigned_room']

@admin.register(GuestInteraction)
class GuestInteractionAdmin(admin.ModelAdmin):
    list_display = ['invitation', 'event_type', 'timestamp', 'device_type', 'ip_address']
    search_fields = ['invitation__code', 'invitation__name', 'ip_address']
    list_filter = ['event_type', 'device_type', 'timestamp']
    ordering = ['-timestamp']

@admin.register(GuestHeatmap)
class GuestHeatmapAdmin(admin.ModelAdmin):
    list_display = ['invitation', 'session_id', 'timestamp', 'screen_width', 'screen_height']
    search_fields = ['invitation__code', 'session_id']
    list_filter = ['timestamp']
    ordering = ['-timestamp']

@admin.register(WhatsAppSessionStatus)
class WhatsAppSessionStatusAdmin(admin.ModelAdmin):
    list_display = ['session_type', 'phone_number', 'name', 'state', 'last_check']
    list_filter = ['session_type', 'state']
    readonly_fields = ['last_qr_code', 'picture']

@admin.register(WhatsAppMessageQueue)
class WhatsAppMessageQueueAdmin(admin.ModelAdmin):
    list_display = ['recipient_number', 'session_type', 'status', 'scheduled_for', 'sent_at', 'attempts']
    search_fields = ['recipient_number', 'message_body']
    list_filter = ['session_type', 'status', 'scheduled_for']
    ordering = ['scheduled_for']

@admin.register(WhatsAppMessageEvent)
class WhatsAppMessageEventAdmin(admin.ModelAdmin):
    list_display = ['queue_message', 'phase', 'timestamp', 'duration_ms']
    search_fields = ['queue_message__recipient_number']
    list_filter = ['phase', 'timestamp']
    ordering = ['timestamp']

@admin.register(WhatsAppTemplate)
class WhatsAppTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'condition', 'trigger_status', 'is_active', 'updated_at']
    search_fields = ['name', 'content']
    list_filter = ['condition', 'trigger_status', 'is_active']
    ordering = ['-updated_at']
