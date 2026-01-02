from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import InvitationViewSet, GlobalConfigViewSet, DashboardStatsView

router = DefaultRouter()
router.register(r'invitations', InvitationViewSet)
router.register(r'config', GlobalConfigViewSet, basename='config')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
]
