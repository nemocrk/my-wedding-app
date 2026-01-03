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


class Accommodation(models.Model):
    """Struttura ricettiva (Hotel, B&B, Casa) per ospitare gli invitati"""
    name = models.CharField(max_length=200, verbose_name="Nome Alloggio")
    address = models.TextField(verbose_name="Indirizzo Completo")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    def total_capacity(self):
        """Capienza totale (adulti + bambini) sommando tutte le stanze"""
        return sum(room.capacity_adults + room.capacity_children for room in self.rooms.all())

    def available_capacity(self):
        """Capienza disponibile sottraendo gli invitati già assegnati"""
        assigned = sum(
            inv.guests.filter(is_child=False).count() + inv.guests.filter(is_child=True).count()
            for inv in self.assigned_invitations.all()
        )
        return self.total_capacity() - assigned

    class Meta:
        verbose_name = "Alloggio"
        verbose_name_plural = "Alloggi"
        ordering = ['name']


class Room(models.Model):
    """Singola stanza all'interno di un alloggio"""
    accommodation = models.ForeignKey(
        Accommodation,
        related_name='rooms',
        on_delete=models.CASCADE,
        verbose_name="Alloggio"
    )
    room_number = models.CharField(max_length=50, verbose_name="Numero/Nome Stanza")
    capacity_adults = models.PositiveIntegerField(default=2, verbose_name="Capienza Adulti")
    capacity_children = models.PositiveIntegerField(default=0, verbose_name="Capienza Bambini")

    def __str__(self):
        return f"{self.accommodation.name} - {self.room_number} (A:{self.capacity_adults}, B:{self.capacity_children})"

    class Meta:
        verbose_name = "Stanza"
        verbose_name_plural = "Stanze"
        unique_together = ['accommodation', 'room_number']


class Invitation(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'In Attesa'
        CONFIRMED = 'confirmed', 'Confermato'
        DECLINED = 'declined', 'Declinato'

    code = models.SlugField(unique=True, help_text="Codice univoco per l'URL (es. famiglia-rossi)")
    name = models.CharField(max_length=200, help_text="Nome visualizzato (es. Famiglia Rossi)")
    
    # OPZIONI OFFERTE (Lato Sposi - Configurazione)
    accommodation_offered = models.BooleanField(default=False, verbose_name="Alloggio Offerto")
    transfer_offered = models.BooleanField(default=False, verbose_name="Transfer Offerto")
    
    # RISPOSTE RSVP (Lato Invitati - Scelte)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name="Stato RSVP"
    )
    # Se true, si applica a tutto il gruppo (o si assume il conteggio totale degli ospiti)
    accommodation_requested = models.BooleanField(default=False, verbose_name="Richiede Alloggio")
    transfer_requested = models.BooleanField(default=False, verbose_name="Richiede Transfer")
    
    # LOGISTICA (Assegnazione)
    accommodation = models.ForeignKey(
        Accommodation,
        null=True,
        blank=True,
        related_name='assigned_invitations',
        on_delete=models.SET_NULL,
        verbose_name="Alloggio Assegnato"
    )

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

    def __str__(self):
        return f"{self.name} ({self.code})"

class Person(models.Model):
    invitation = models.ForeignKey(Invitation, related_name='guests', on_delete=models.CASCADE)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    is_child = models.BooleanField(default=False)
    
    # Dettagli personali che rimangono al singolo
    dietary_requirements = models.TextField(blank=True, null=True, verbose_name="Allergie/Intolleranze")
    
    # RIMOSSI: requires_accommodation, requires_transfer (spostati su Invitation)

    def __str__(self):
        return f"{self.first_name} {self.last_name or ''}".strip()
