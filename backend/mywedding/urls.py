from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    InvitationViewSet, 
    GlobalConfigViewSet, 
    AccommodationViewSet,
    # Public Views
    PublicInvitationAuthView,
    PublicInvitationView,
    PublicRSVPView,
    PublicStatusUpdateView, # NEW
    PublicLogInteractionView,
    PublicLogHeatmapView
)

# Admin Router
router = DefaultRouter()
router.register(r'invitations', InvitationViewSet)
router.register(r'config', GlobalConfigViewSet, basename='config')
router.register(r'accommodations', AccommodationViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    
    # Public API Endpoints (Session Based)
    path('api/public/auth/', PublicInvitationAuthView.as_view(), name='public-auth'),
    path('api/public/invitation/', PublicInvitationView.as_view(), name='public-invitation'),
    path('api/public/rsvp/', PublicRSVPView.as_view(), name='public-rsvp'),
    path('api/public/status/', PublicStatusUpdateView.as_view(), name='public-status'), # NEW
    path('api/public/log/interaction/', PublicLogInteractionView.as_view(), name='public-log-interaction'),
    path('api/public/log/heatmap/', PublicLogHeatmapView.as_view(), name='public-log-heatmap'),
]
