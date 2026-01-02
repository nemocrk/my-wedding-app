import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _

class Invitation(models.Model):
    """
    Rappresenta una 'lettera di partecipazione' fisica o digitale.
    Può essere indirizzata a un singolo o a una famiglia.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(
        max_length=50, 
        unique=True, 
        help_text=_("Codice univoco per l'URL dell'invito (slug)")
    )
    name = models.CharField(
        max_length=255, 
        help_text=_("Nome descrittivo (es. Famiglia Rossi)")
    )
    
    # Opzioni offerte per questo invito
    accommodation_offered = models.BooleanField(
        default=False, 
        help_text=_("L'alloggio è offerto/disponibile per questo invito?")
    )
    transfer_offered = models.BooleanField(
        default=False, 
        help_text=_("Il transfer è offerto/disponibile per questo invito?")
    )

    # Gestione Tavoli / Affinità (Relazioni asimmetriche a livello DB, gestite simmetricamente in app)
    affinities = models.ManyToManyField(
        'self', 
        blank=True, 
        symmetrical=False, 
        related_name='affinity_with',
        help_text=_("Altri inviti con cui questi ospiti dovrebbero sedere vicini")
    )
    non_affinities = models.ManyToManyField(
        'self', 
        blank=True, 
        symmetrical=False, 
        related_name='conflict_with',
        help_text=_("Altri inviti con cui questi ospiti NON dovrebbero sedere vicini")
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

class Person(models.Model):
    """
    Singola persona associata a un invito.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invitation = models.ForeignKey(
        Invitation, 
        related_name='guests', 
        on_delete=models.CASCADE
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    is_child = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    class Meta:
        verbose_name_plural = "People"

class RSVP(models.Model):
    """
    Conferma di partecipazione per una singola persona.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    person = models.OneToOneField(
        Person, 
        related_name='rsvp', 
        on_delete=models.CASCADE
    )
    is_attending = models.BooleanField(default=False)
    dietary_requirements = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    
    # Nuovi campi logistici
    origin_location = models.CharField(
        max_length=255, 
        blank=True, 
        null=True, 
        help_text=_("Luogo di partenza")
    )
    requires_accommodation = models.BooleanField(default=False)
    requires_transfer = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        status = "Presente" if self.is_attending else "Assente"
        return f"RSVP: {self.person} - {status}"

class AccessLog(models.Model):
    """
    Log degli accessi all'invito.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invitation = models.ForeignKey(
        Invitation, 
        related_name='access_logs', 
        on_delete=models.CASCADE,
        null=True, blank=True
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Access: {self.invitation} at {self.timestamp}"

class InteractionLog(models.Model):
    """
    Log per heatmap e interazioni.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invitation = models.ForeignKey(
        Invitation, 
        related_name='interactions', 
        on_delete=models.CASCADE,
        null=True, blank=True
    )
    interaction_type = models.CharField(max_length=50) 
    data = models.JSONField(default=dict)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Interaction: {self.interaction_type} at {self.timestamp}"
