from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InvitationViewSet, GlobalConfigViewSet, PublicInvitationView, 
    PublicInvitationAuthView, PublicRSVPView, DashboardStatsView,
    AccommodationViewSet, PublicLogInteractionView, PublicLogHeatmapView,
    WhatsAppTemplateViewSet, PublicConfigurableTextView, ConfigurableTextViewSet,
    PublicLanguagesView
)

router = DefaultRouter()
router.register(r'invitations', InvitationViewSet)
router.register(r'config', GlobalConfigViewSet, basename='config')
router.register(r'accommodations', AccommodationViewSet)
router.register(r'whatsapp/templates', WhatsAppTemplateViewSet)
router.register(r'texts', ConfigurableTextViewSet) # Admin CRUD per testi

urlpatterns = [
    # Admin API
    path('admin/', include(router.urls)),
    path('admin/dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    
    # Public API
    path('public/invitation/auth/', PublicInvitationAuthView.as_view(), name='public-invitation-auth'),
    path('public/invitation/', PublicInvitationView.as_view(), name='public-invitation'),
    path('public/rsvp/', PublicRSVPView.as_view(), name='public-rsvp'),
    path('public/analytics/interaction/', PublicLogInteractionView.as_view(), name='public-log-interaction'),
    path('public/analytics/heatmap/', PublicLogHeatmapView.as_view(), name='public-log-heatmap'),
    path('public/texts/', PublicConfigurableTextView.as_view(), name='public-configurable-texts'),
    path('public/languages/', PublicLanguagesView.as_view(), name='public-languages'), # New endpoint
]
