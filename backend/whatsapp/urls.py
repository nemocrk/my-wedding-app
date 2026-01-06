from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    whatsapp_status,
    whatsapp_qr_code,
    whatsapp_refresh_status,
    whatsapp_logout,
    whatsapp_send_test,
    WhatsAppMessageEventViewSet,
    WhatsAppMessageQueueViewSet
)

router = DefaultRouter()
router.register(r'whatsapp-events', WhatsAppMessageEventViewSet, basename='whatsapp-events')
router.register(r'whatsapp-queue', WhatsAppMessageQueueViewSet, basename='whatsapp-queue')

urlpatterns = [
    path('', include(router.urls)),
    path('whatsapp/<str:session_type>/status/', whatsapp_status, name='whatsapp_status'),
    path('whatsapp/<str:session_type>/qr/', whatsapp_qr_code, name='whatsapp_qr'),
    path('whatsapp/<str:session_type>/refresh/', whatsapp_refresh_status, name='whatsapp_refresh'),
    path('whatsapp/<str:session_type>/logout/', whatsapp_logout, name='whatsapp_logout'),
    path('whatsapp/<str:session_type>/test/', whatsapp_send_test, name='whatsapp_test'),
]
