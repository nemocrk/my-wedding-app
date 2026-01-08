from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InvitationViewSet, GlobalConfigViewSet, AccommodationViewSet, 
    PublicInvitationAuthView, PublicInvitationView, PublicRSVPView, 
    PublicLogInteractionView, PublicLogHeatmapView, DashboardStatsView,
    WhatsAppTemplateViewSet
)

router = DefaultRouter()
router.register(r'invitations', InvitationViewSet, basename='invitation')
router.register(r'config', GlobalConfigViewSet, basename='config')
router.register(r'accommodations', AccommodationViewSet, basename='accommodation')
router.register(r'whatsapp-templates', WhatsAppTemplateViewSet, basename='whatsapp-templates')

urlpatterns = [
    # Admin API (Router)
    path('admin/', include(router.urls)),
    
    # Dashboard Stats
    path('admin/dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),

    # Public API (Manuali)
    path('public/auth/', PublicInvitationAuthView.as_view(), name='public-auth'),
    path('public/invitation/', PublicInvitationView.as_view(), name='public-invitation'),
    path('public/rsvp/', PublicRSVPView.as_view(), name='public-rsvp'),
    path('public/log-interaction/', PublicLogInteractionView.as_view(), name='public-log-interaction'),
    path('public/log-heatmap/', PublicLogHeatmapView.as_view(), name='public-log-heatmap'),
]
