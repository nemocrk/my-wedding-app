from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    # Admin Views
    InvitationViewSet, GlobalConfigViewSet, DashboardStatsView, AccommodationViewSet,
    # Public Views
    PublicInvitationAuthView, PublicInvitationView, PublicRSVPView
)
from django.http import HttpResponse

def health_check(request):
    return HttpResponse("OK")

# ========================================
# ADMIN ROUTER (Intranet Only)
# ========================================
admin_router = DefaultRouter()
admin_router.register(r'invitations', InvitationViewSet, basename='admin-invitation')
admin_router.register(r'accommodations', AccommodationViewSet, basename='admin-accommodation')
admin_router.register(r'config', GlobalConfigViewSet, basename='admin-config')

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
    
    # ========================================
    # PUBLIC API (Internet - Guest Access)
    # Endpoint protetti da sessione dopo autenticazione iniziale
    # ========================================
    
    # 1. Autenticazione Iniziale (valida code + token, crea sessione)
    path('api/public/auth/', PublicInvitationAuthView.as_view(), name='public-auth'),
    
    # 2. Dettagli Invito (richiede sessione attiva)
    path('api/public/invitation/', PublicInvitationView.as_view(), name='public-invitation'),
    
    # 3. RSVP - Conferma/Declino (richiede sessione attiva)
    path('api/public/rsvp/', PublicRSVPView.as_view(), name='public-rsvp'),
]
