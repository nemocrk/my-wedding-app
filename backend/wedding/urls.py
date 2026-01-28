from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    # Admin Views
    InvitationViewSet, GlobalConfigViewSet, DashboardStatsView, AccommodationViewSet, 
    WhatsAppTemplateViewSet, ConfigurableTextViewSet, AdminGoogleFontsProxyView,
    InvitationLabelViewSet,
    # Public Views
    PublicInvitationAuthView, PublicRSVPView,
    PublicLogInteractionView, PublicLogHeatmapView, PublicConfigurableTextView,
    PublicLanguagesView
)
# Importa WhatsApp ViewSet dal modulo corretto
from whatsapp.views import WhatsAppMessageQueueViewSet, WhatsAppMessageEventViewSet
from core.dashboard import DynamicDashboardStatsView

from django.http import HttpResponse

def health_check(request):
    return HttpResponse("OK")

# ========================================
# ADMIN ROUTER (Intranet Only)
# ========================================
admin_router = DefaultRouter(trailing_slash=True)  # Forza trailing slash
admin_router.register(r'invitations', InvitationViewSet, basename='admin-invitation')
admin_router.register(r'invitation-labels', InvitationLabelViewSet, basename='admin-invitation-label')
admin_router.register(r'accommodations', AccommodationViewSet, basename='admin-accommodation')
admin_router.register(r'config', GlobalConfigViewSet, basename='admin-config')
admin_router.register(r'whatsapp-templates', WhatsAppTemplateViewSet, basename='admin-whatsapp-templates')
admin_router.register(r'texts', ConfigurableTextViewSet, basename='admin-texts')

# Viewset spostati dal core a whatsapp per pulizia, ma registrati qui per mantenere endpoint unificati sotto /api/admin/
admin_router.register(r'whatsapp-queue', WhatsAppMessageQueueViewSet, basename='admin-whatsapp-queue')
admin_router.register(r'whatsapp-events', WhatsAppMessageEventViewSet, basename='admin-whatsapp-events')


urlpatterns = [
    # ========================================
    # DJANGO ADMIN PANEL (Intranet Only)
    # ========================================
    path('admin/', admin.site.urls),
    
    # ========================================
    # HEALTH CHECK (Both Networks)
    # ========================================
    path('health/', health_check),
    
    # ========================================
    # ADMIN API (Intranet - Nginx filtered)
    # Tutti gli endpoint CRUD per inviti, alloggi, config
    # ========================================
    path('api/admin/', include(admin_router.urls)),
    path('api/admin/dashboard/stats/', DashboardStatsView.as_view(), name='admin-dashboard-stats'),
    path('api/admin/dashboard/dynamic-stats/', DynamicDashboardStatsView.as_view(), name='admin-dashboard-dynamic-stats'),
    # 6. Lingue Disponibili (pubblico)
    path('api/admin/languages/', PublicLanguagesView.as_view(), name='public-languages'),
    
    # NEW: Google Fonts Proxy (Backend-to-Google)
    path('api/admin/google-fonts/', AdminGoogleFontsProxyView.as_view(), name='admin-google-fonts'),
    
    # --- WHATSAPP INTEGRATION ROUTES (Admin Only) ---
    # Include urls specifici per actions (status, qr, refresh, logout)
    # Nota: abbiamo spostato i ViewSet nel router principale sopra, quindi in whatsapp.urls
    # lasciamo solo le function-based views o i router specifici se necessario.
    path('api/admin/', include('whatsapp.urls')),

    # ========================================
    # PUBLIC API (Internet - Guest Access)
    # Endpoint protetti da sessione dopo autenticazione iniziale
    # ========================================
    
    # 1. Autenticazione Iniziale (valida code + token, crea sessione)
    path('api/public/auth/', PublicInvitationAuthView.as_view(), name='public-auth'),
        
    # 3. RSVP - Conferma/Declino (richiede sessione attiva)
    path('api/public/rsvp/', PublicRSVPView.as_view(), name='public-rsvp'),
    
    # 4. Analytics & Tracking
    path('api/public/log-interaction/', PublicLogInteractionView.as_view(), name='public-log-interaction'),
    path('api/public/log-heatmap/', PublicLogHeatmapView.as_view(), name='public-log-heatmap'),
    
    # 5. Testi Configurabili (pubblico read-only per Home/Landing)
    path('api/public/texts/', PublicConfigurableTextView.as_view(), name='public-texts'),

    # 6. Lingue Disponibili (pubblico)
    path('api/public/languages/', PublicLanguagesView.as_view(), name='public-languages'),
]
