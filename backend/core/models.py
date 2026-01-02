from django.db import models
from django.core.exceptions import ValidationError

class GlobalConfig(models.Model):
    """Singleton model for global configurations (prices, texts)"""
    # Costi Unitari
    price_adult_meal = models.DecimalField(max_digits=10, decimal_places=2, default=100.00, verbose_name="Costo Pranzo Adulti")
    price_child_meal = models.DecimalField(max_digits=10, decimal_places=2, default=50.00, verbose_name="Costo Pranzo Bambini")
    price_accommodation_adult = models.DecimalField(max_digits=10, decimal_places=2, default=80.00, verbose_name="Costo Alloggio Adulti")
    price_accommodation_child = models.DecimalField(max_digits=10, decimal_places=2, default=40.00, verbose_name="Costo Alloggio Bambini")
    price_transfer = models.DecimalField(max_digits=10, decimal_places=2, default=20.00, verbose_name="Costo Transfer (p.p.)")

    # Template Testi
    letter_text = models.TextField(
        default="Caro {guest_names},\nSiamo lieti di invitarti al nostro matrimonio...",
        help_text="Placeholder disponibili: {guest_names}, {family_name}, {code}",
        verbose_name="Testo Lettera"
    )

    def save(self, *args, **kwargs):
        if not self.pk and GlobalConfig.objects.exists():
            raise ValidationError('There can be only one GlobalConfig instance')
        return super(GlobalConfig, self).save(*args, **kwargs)

    def __str__(self):
        return "Configurazione Globale"

    class Meta:
        verbose_name = "Configurazione Globale"
        verbose_name_plural = "Configurazione Globale"


class Invitation(models.Model):
    code = models.SlugField(unique=True, help_text="Codice univoco per l'URL (es. famiglia-rossi)")
    name = models.CharField(max_length=200, help_text="Nome visualizzato (es. Famiglia Rossi)")
    
    # Opzioni offerte dagli sposi (PROPOSTA)
    accommodation_offered = models.BooleanField(default=False)
    transfer_offered = models.BooleanField(default=False)
    
    # Stato RSVP (Calcolato o forzato)
    # Lo stato sarà derivato dalle risposte dei singoli ospiti
    
    # Affinità
    affinities = models.ManyToManyField('self', blank=True, symmetrical=True)
    non_affinities = models.ManyToManyField(
        'self', 
        blank=True, 
        symmetrical=True, 
        related_name='incompatible_with'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def status(self):
        """Calcola lo stato complessivo dell'invito basandosi sugli ospiti"""
        guests = self.guests.all()
        if not guests:
            return "empty"
        
        # Se nessuno ha ancora risposto (is_attending is None)
        if all(g.is_attending is None for g in guests):
            return "pending"
        
        # Se qualcuno ha risposto
        attending_count = sum(1 for g in guests if g.is_attending is True)
        declined_count = sum(1 for g in guests if g.is_attending is False)
        
        if attending_count > 0:
            if declined_count > 0:
                return "partial" # Alcuni vengono, altri no
            return "confirmed" # Almeno uno viene, nessuno ha declinato esplicitamente (o gli altri sono null)
        
        if declined_count == len(guests):
            return "declined" # Tutti hanno declinato
            
        return "pending"

    def __str__(self):
        return f"{self.name} ({self.code})"

class Person(models.Model):
    invitation = models.ForeignKey(Invitation, related_name='guests', on_delete=models.CASCADE)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    is_child = models.BooleanField(default=False)
    
    # RSVP fields (RISPOSTA REALE)
    is_attending = models.BooleanField(null=True, blank=True, verbose_name="Presente")
    dietary_requirements = models.TextField(blank=True, null=True, verbose_name="Allergie/Intolleranze")
    
    # Dettagli logistici confermati dal guest
    requires_accommodation = models.BooleanField(default=False, verbose_name="Richiede Alloggio")
    requires_transfer = models.BooleanField(default=False, verbose_name="Richiede Transfer")

    def __str__(self):
        return f"{self.first_name} {self.last_name or ''}".strip()
