from django.urls import path
from . import views

urlpatterns = [
    path('<str:session_type>/status/', views.whatsapp_status),
    path('<str:session_type>/qr/', views.whatsapp_qr_code),
    path('<str:session_type>/refresh/', views.whatsapp_refresh_status),
]
