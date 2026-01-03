from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    InvitationViewSet, GlobalConfigViewSet, DashboardStatsView, 
    AccommodationViewSet, PublicInvitationView
)
from django.http import HttpResponse

def health_check(request):
    return HttpResponse("OK")

# ========================================
# ADMIN ROUTER (Intranet Only)
# ========================================
admin_router = DefaultRouter()
admin_router.register(r'invitations', InvitationViewSet)
admin_router.register(r'accommodations', AccommodationViewSet, basename='accommodation')
admin_router.register(r'config', GlobalConfigViewSet, basename='config')

urlpatterns = [
    # Django Admin Panel
    path('admin/', admin.site.urls),
    
    # Health Check (both networks)
    path('health/', health_check),
    
    # ========================================
    # ADMIN API (Intranet - Nginx will filter)
    # ========================================
    path('api/admin/', include(admin_router.urls)),
    path('api/admin/dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    
    # ========================================
    # PUBLIC API (Internet - Open to guests)
    # ========================================
    path('api/public/invitation/', PublicInvitationView.as_view(), name='public-invitation'),
]
