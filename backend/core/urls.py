from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvitationViewSet, AccommodationViewSet

router = DefaultRouter()
router.register(r'invitations', InvitationViewSet)
router.register(r'accommodations', AccommodationViewSet, basename='accommodation')

urlpatterns = [
    path('', include(router.urls)),
]
