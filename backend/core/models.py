from django.db import models

class Invitation(models.Model):
    code = models.SlugField(unique=True, help_text="Codice univoco per l'URL (es. famiglia-rossi)")
    name = models.CharField(max_length=200, help_text="Nome visualizzato (es. Famiglia Rossi)")
    
    # Opzioni logistiche
    accommodation_offered = models.BooleanField(default=False)
    transfer_offered = models.BooleanField(default=False)
    
    # Affinità per gestione tavoli (Relazione simmetrica)
    affinities = models.ManyToManyField('self', blank=True, symmetrical=True)
    
    # Non-Affinità (Relazione simmetrica per chi NON deve stare vicino)
    non_affinities = models.ManyToManyField(
        'self', 
        blank=True, 
        symmetrical=True, 
        related_name='incompatible_with'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

class Person(models.Model):
    invitation = models.ForeignKey(Invitation, related_name='guests', on_delete=models.CASCADE)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True, null=True) # Opzionale
    is_child = models.BooleanField(default=False)
    
    # RSVP fields (per il futuro)
    is_attending = models.BooleanField(null=True, blank=True)
    dietary_requirements = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name or ''}".strip()
