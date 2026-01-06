from django.urls import path
from . import views

urlpatterns = [
    path('<str:session_type>/status/', views.whatsapp_status, name='whatsapp_status'),
    path('<str:session_type>/qr/', views.whatsapp_qr_code, name='whatsapp_qr'),
    path('<str:session_type>/refresh/', views.whatsapp_refresh_status, name='whatsapp_refresh'),
    path('<str:session_type>/logout/', views.whatsapp_logout, name='whatsapp_logout'),
    path('<str:session_type>/test/', views.whatsapp_send_test, name='whatsapp_test'),
]
