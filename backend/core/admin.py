from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from .models import (
    Invitation, Person, Accommodation, Room, GlobalConfig,
    GuestInteraction, GuestHeatmap, WhatsAppMessageQueue, WhatsAppSessionStatus
)

# -----------------------------------------------------------------------------
# DASHBOARD WHATSAPP
# -----------------------------------------------------------------------------

@admin.register(WhatsAppSessionStatus)
class WhatsAppSessionStatusAdmin(admin.ModelAdmin):
    list_display = ('session_type', 'status_badge', 'last_check', 'has_error')
    readonly_fields = ('last_check', 'last_qr_code')

    def status_badge(self, obj):
        colors = {
            'connected': '28a745',    # Green
            'disconnected': '6c757d', # Gray
            'waiting_qr': 'ffc107',   # Yellow
            'error': 'dc3545'         # Red
        }
        color = colors.get(obj.state, '000000')
        return format_html(
            '<span style="background-color: #{}; color: white; padding: 3px 10px; border-radius: 10px; font-weight: bold;">{}</span>',
            color, obj.get_state_display()
        )
    status_badge.short_description = 'Stato Connessione'

    def has_error(self, obj):
        return bool(obj.error_message)
    has_error.boolean = True
    has_error.short_description = 'Errori?'

@admin.register(WhatsAppMessageQueue)
class WhatsAppMessageQueueAdmin(admin.ModelAdmin):
    list_display = ('recipient_number', 'session_type', 'status_badge', 'scheduled_for', 'sent_at', 'attempts')
    list_filter = ('status', 'session_type', 'scheduled_for')
    search_fields = ('recipient_number', 'message_body', 'error_log')
    readonly_fields = ('sent_at', 'attempts', 'error_log', 'created_at_display')
    ordering = ('-scheduled_for',)
    actions = ['retry_failed_messages', 'force_send_now']

    def created_at_display(self, obj):
        return obj.scheduled_for
    created_at_display.short_description = 'Creato il'

    def status_badge(self, obj):
        colors = {
            'pending': 'ffc107',    # Yellow
            'processing': '17a2b8', # Blue
            'sent': '28a745',       # Green
            'failed': 'dc3545',     # Red
            'skipped': '6c757d'     # Gray
        }
        color = colors.get(obj.status, '000000')
        label = obj.get_status_display()
        return format_html(
            '<span style="color: #{}; font-weight: bold;">● {}</span>',
            color, label
        )
    status_badge.short_description = 'Stato Invio'

    @admin.action(description="🔄 Riprova invio messaggi falliti/saltati")
    def retry_failed_messages(self, request, queryset):
        rows = queryset.update(status='pending', attempts=0, error_log=None)
        self.message_user(request, f"{rows} messaggi ri-accodati per l'invio.")

    @admin.action(description="🚀 Forza invio immediato (Reset priorità)")
    def force_send_now(self, request, queryset):
        from django.utils import timezone
        rows = queryset.update(status='pending', scheduled_for=timezone.now())
        self.message_user(request, f"{rows} messaggi impostati con priorità immediata.")

# -----------------------------------------------------------------------------
# CONFIGURAZIONE GLOBALE
# -----------------------------------------------------------------------------

@admin.register(GlobalConfig)
class GlobalConfigAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'whatsapp_rate_limit', 'whatsapp_typing_simulation')
    fieldsets = (
        ('WhatsApp Config', {
            'fields': (
                ('whatsapp_groom_number', 'whatsapp_groom_firstname'),
                ('whatsapp_bride_number', 'whatsapp_bride_firstname'),
                'whatsapp_rate_limit',
                'whatsapp_typing_simulation'
            )
        }),
        ('Matrimonio Config', {
            'fields': (
                'invitation_link_secret',
                'letter_text',
                'unauthorized_message'
            )
        }),
        ('Prezzi', {
            'fields': (
                ('price_adult_meal', 'price_child_meal'),
                ('price_accommodation_adult', 'price_accommodation_child'),
                'price_transfer'
            )
        }),
    )

# -----------------------------------------------------------------------------
# GESTIONE INVITATI
# -----------------------------------------------------------------------------

class PersonInline(admin.TabularInline):
    model = Person
    extra = 0
    fields = ('first_name', 'last_name', 'is_child', 'assigned_room')

@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'status_badge', 'guests_count', 'accommodation_req', 'transfer_req')
    list_filter = ('status', 'accommodation_requested', 'transfer_requested', 'accommodation_offered')
    search_fields = ('name', 'code')
    inlines = [PersonInline]
    actions = ['send_whatsapp_reminder']

    def status_badge(self, obj):
        colors = {
            'confirmed': 'green',
            'declined': 'red',
            'pending': 'orange'
        }
        return format_html(
            '<span style="color: {};">{}</span>',
            colors.get(obj.status, 'black'),
            obj.get_status_display()
        )
    status_badge.short_description = 'RSVP'

    def guests_count(self, obj):
        return obj.guests.count()
    guests_count.short_description = 'Ospiti'

    def accommodation_req(self, obj):
        return obj.accommodation_requested
    accommodation_req.boolean = True
    accommodation_req.short_description = 'Alloggio?'

    def transfer_req(self, obj):
        return obj.transfer_requested
    transfer_req.boolean = True
    transfer_req.short_description = 'Transfer?'

    @admin.action(description="📱 Invia Reminder WhatsApp (Stub)")
    def send_whatsapp_reminder(self, request, queryset):
        # Placeholder per azione massiva - implementazione nel prossimo step
        self.message_user(request, "Funzionalità in arrivo...", level='warning')

# -----------------------------------------------------------------------------
# LOGISTICA & ANALYTICS
# -----------------------------------------------------------------------------

class RoomInline(admin.TabularInline):
    model = Room
    extra = 1

@admin.register(Accommodation)
class AccommodationAdmin(admin.ModelAdmin):
    list_display = ('name', 'total_capacity_display', 'assigned_count')
    inlines = [RoomInline]

    def total_capacity_display(self, obj):
        return obj.total_capacity()
    total_capacity_display.short_description = 'Capienza Totale'

    def assigned_count(self, obj):
        return obj.assigned_invitations.count()
    assigned_count.short_description = 'Inviti Assegnati'

@admin.register(GuestInteraction)
class GuestInteractionAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'invitation', 'event_type', 'device_type', 'geo_country')
    list_filter = ('event_type', 'device_type')
    readonly_fields = ('timestamp', 'ip_address', 'user_agent')
