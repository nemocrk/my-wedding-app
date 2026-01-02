import logging
from django.http import JsonResponse

logger = logging.getLogger(__name__)

class JsonExceptionMiddleware:
    """
    Middleware che cattura le eccezioni non gestite e restituisce
    una risposta JSON invece della pagina HTML di debug/errore standard.
    Utile per le API chiamate dal frontend.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        # Intercetta solo se la richiesta è per le API
        if request.path.startswith('/api/'):
            logger.exception("Unhandled Exception on API Request")
            
            error_message = str(exception)
            error_type = exception.__class__.__name__
            
            # In produzione, potremmo voler nascondere i dettagli tecnici del DB
            # Ma per ora in dev è utile vedere l'errore esatto (es. relation does not exist)
            
            return JsonResponse({
                "error": "Internal Server Error",
                "detail": error_message,
                "type": error_type,
                "path": request.path
            }, status=500)
        
        return None  # Lascia che Django gestisca le eccezioni non-API normalmente
