from django.urls import path
from .views import (
    whatsapp_status,
    whatsapp_qr_code,
    whatsapp_refresh_status,
    whatsapp_logout,
    whatsapp_send_test
)

# I ViewSet (Queue e Events) sono registrati nel router principale in backend/wedding/urls.py
# per mantenere centralizzata la gestione API Admin.
# Qui manteniamo solo le action views specifiche.

urlpatterns = [
    path('whatsapp/<str:session_type>/status/', whatsapp_status, name='whatsapp_status'),
    path('whatsapp/<str:session_type>/qr/', whatsapp_qr_code, name='whatsapp_qr'),
    path('whatsapp/<str:session_type>/refresh/', whatsapp_refresh_status, name='whatsapp_refresh'),
    path('whatsapp/<str:session_type>/logout/', whatsapp_logout, name='whatsapp_logout'),
    path('whatsapp/<str:session_type>/test/', whatsapp_send_test, name='whatsapp_test'),
]
