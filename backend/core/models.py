from django.db import models
from django.core.exceptions import ValidationError
import hashlib

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
    
    # Sicurezza Inviti Pubblici
    invitation_link_secret = models.CharField(
        max_length=64,
        default="my-secret-wedding-key-2026",
        help_text="Chiave segreta per generare token di verifica link inviti",
        verbose_name="Chiave Segreta Link"
    )
    
    unauthorized_message = models.TextField(
        default="Spiacenti, questo invito non è valido o è scaduto. Contatta gli sposi per maggiori informazioni.",
        verbose_name="Messaggio Non Autorizzato"
    )

    # WhatsApp Config
    whatsapp_groom_number = models.CharField(max_length=20, blank=True, null=True, verbose_name="Numero Sposo (es. 39333...)")
    whatsapp_groom_firstname = models.CharField(max_length=100, blank=True, null=True, verbose_name="Nome Sposo")
    whatsapp_groom_lastname = models.CharField(max_length=100, blank=True, null=True, verbose_name="Cognome Sposo")
    
    whatsapp_bride_number = models.CharField(max_length=20, blank=True, null=True, verbose_name="Numero Sposa")
    whatsapp_bride_firstname = models.CharField(max_length=100, blank=True, null=True, verbose_name="Nome Sposa")
    whatsapp_bride_lastname = models.CharField(max_length=100, blank=True, null=True, verbose_name="Cognome Sposa")
    
    whatsapp_rate_limit = models.IntegerField(
        default=10, 
        help_text="Massimo messaggi inviabili per ora per sessione (Safety Buffer)",
        verbose_name="Rate Limit (msg/ora)"
    )
    whatsapp_typing_simulation = models.BooleanField(
        default=True, 
        verbose_name="Simula Digitazione Umana"
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


class ConfigurableText(models.Model):
    """
    Gestisce contenuti lunghi e specifici del matrimonio configurabili da frontend-admin.
    Supporta HTML con inline styles per personalizzazione font/size/color.
    Supporta multi-lingua (i18n).
    
    Esempi chiavi:
    - envelope.front.content: Front della busta
    - card.alloggio.content_offered: Contenuto card Alloggio (offerto)
    ...
    """
    key = models.CharField(
        max_length=255, 
        db_index=True,
        help_text="Chiave per identificare il testo (es. 'envelope.front.content')",
        verbose_name="Chiave"
    )
    
    language = models.CharField(
        max_length=5,
        default='it',
        db_index=True,
        help_text="Codice lingua ISO (it, en, es...)",
        verbose_name="Lingua"
    )
    
    content = models.TextField(
        help_text="Contenuto HTML con inline styles (es. <span style='font-family: serif;'>Testo</span>)",
        verbose_name="Contenuto"
    )
    
    # Metadata per editor (optional, per future features come section-based editing)
    metadata = models.JSONField(
        default=dict, 
        blank=True,
        help_text="Metadati per editor WYSIWYG (es. {\"sections\": [{\"text\": \"...\", \"font\": \"serif\"}]})",
        verbose_name="Metadati"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creato il")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Aggiornato il")
    
    class Meta:
        ordering = ['key', 'language']
        verbose_name = 'Testo Configurabile'
        verbose_name_plural = 'Testi Configurabili'
        unique_together = ['key', 'language']
    
    def __str__(self):
        return f"{self.key} ({self.language})"


class InvitationLabel(models.Model):
    """Etichetta personalizzabile per gli inviti"""
    name = models.CharField(max_length=50, unique=True, verbose_name="Nome Etichetta")
    color = models.CharField(max_length=7, default="#CCCCCC", verbose_name="Colore (HEX)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Etichetta Invito"
        verbose_name_plural = "Etichette Invito"
        ordering = ['name']


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
            inv.guests.filter(is_child=False, not_coming=False).count() + inv.guests.filter(is_child=True, not_coming=False).count()
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

    def total_capacity(self):
        """Capienza totale della singola stanza"""
        return self.capacity_adults + self.capacity_children

    def occupied_count(self):
        """Numero di persone assegnate a questa stanza (escludendo not_coming)"""
        return self.assigned_guests.filter(not_coming=False).count()

    def available_slots(self):
        """Posti disponibili (considerando la logica adulti/bambini, escludendo not_coming)"""
        adults_assigned = self.assigned_guests.filter(is_child=False, not_coming=False).count()
        children_assigned = self.assigned_guests.filter(is_child=True, not_coming=False).count()
        
        # Logica: bambini usano prima i posti bambini, poi quelli adulti
        children_in_child_slots = min(children_assigned, self.capacity_children)
        children_in_adult_slots = children_assigned - children_in_child_slots
        
        used_adult_slots = adults_assigned + children_in_adult_slots
        used_child_slots = children_in_child_slots
        
        return {
            'adult_slots_free': self.capacity_adults - used_adult_slots,
            'child_slots_free': self.capacity_children - used_child_slots,
            'total_free': (self.capacity_adults - used_adult_slots) + (self.capacity_children - used_child_slots)
        }

    class Meta:
        verbose_name = "Stanza"
        verbose_name_plural = "Stanze"
        unique_together = ['accommodation', 'room_number']


class Invitation(models.Model):
    class Status(models.TextChoices):
        IMPORTED = 'imported', 'Importato'
        CREATED = 'created', 'Creato'
        SENT = 'sent', 'Inviato'
        READ = 'read', 'Letto'
        CONFIRMED = 'confirmed', 'Accettato'
        DECLINED = 'declined', 'Declinato'
        
    class Origin(models.TextChoices):
        GROOM = 'groom', 'Lato Sposo'
        BRIDE = 'bride', 'Lato Sposa'

    class ContactVerified(models.TextChoices):
        NOT_VALID = 'not_valid', 'Numero non valido/assente'
        NOT_EXIST = 'not_exist', 'Non esiste su WhatsApp'
        NOT_PRESENT = 'not_present', 'Non in rubrica'
        OK = 'ok', 'OK (Verificato)'

    class TravelCarInfo(models.TextChoices):
        NOT_AVAILABLE = 'none', 'Non Disponibile'
        CAR_RENTAL = 'noleggio', 'Auto a Noleggio'
        MY_CAR = 'proprio', 'Auto Propria'

    code = models.SlugField(unique=True, help_text="Codice univoco per l'URL (es. famiglia-rossi)")
    name = models.CharField(max_length=200, help_text="Nome visualizzato (es. Famiglia Rossi)")
    
    # Contatti & Organizzazione
    origin = models.CharField(
        max_length=10, 
        choices=Origin.choices, 
        default=Origin.GROOM,
        verbose_name="Appartenenza"
    )
    phone_number = models.CharField(
        max_length=20, 
        blank=True, 
        null=True, 
        verbose_name="Numero Telefono (Referente)"
    )

    contact_verified = models.CharField(
        max_length=20,
        choices=ContactVerified.choices,
        default=ContactVerified.NOT_VALID,
        verbose_name="Stato Verifica Contatto"
    )
    
    # OPZIONI OFFERTE (Lato Sposi - Configurazione)
    accommodation_offered = models.BooleanField(default=False, verbose_name="Alloggio Offerto")
    transfer_offered = models.BooleanField(default=False, verbose_name="Transfer Offerto")
    
    # STATO DEL WORKFLOW
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CREATED,
        verbose_name="Stato Invito"
    )
    
    # RISPOSTE RSVP (Lato Invitati - Scelte)
    accommodation_requested = models.BooleanField(default=False, verbose_name="Richiede Alloggio")
    transfer_requested = models.BooleanField(default=False, verbose_name="Richiede Transfer")
    
    # TRAVEL INFO (Wizard RSVP Step 3)
    travel_transport_type = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Tipo trasporto: 'traghetto', 'aereo'",
        verbose_name="Tipo Trasporto"
    )
    travel_schedule = models.TextField(
        blank=True,
        null=True,
        help_text="Orari partenza/arrivo (free-text)",
        verbose_name="Orari Viaggio"
    )
    travel_car_with = models.CharField(
        max_length=10,
        choices=TravelCarInfo.choices,
        default=TravelCarInfo.NOT_AVAILABLE,
        help_text="True se auto disponibile",
        verbose_name="Auto disponibile"
    )
    travel_carpool_interest = models.BooleanField(
        null=True,
        blank=True,
        help_text="True se interesse carpool",
        verbose_name="Interesse Carpool"
    )
    
    # LOGISTICA (Assegnazione a livello di Struttura - manteniamo per backward compatibility)
    accommodation = models.ForeignKey(
        Accommodation,
        null=True,
        blank=True,
        related_name='assigned_invitations',
        on_delete=models.SET_NULL,
        verbose_name="Alloggio Assegnato"
    )
    
    # NUOVI CAMPI (Issue #51)
    accommodation_pinned = models.BooleanField(
        default=False, 
        verbose_name="Blocca Assegnazione Alloggio",
        help_text="Se attivo, l'algoritmo di auto-assegnazione non modificherà l'alloggio di questo invito."
    )
    
    labels = models.ManyToManyField(
        InvitationLabel, 
        blank=True, 
        related_name='invitations',
        verbose_name="Etichette"
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

    def generate_verification_token(self, secret_key):
        """Genera token HMAC per validazione link pubblico"""
        data = f"{self.code}-{self.id}".encode('utf-8')
        return hashlib.sha256(data + secret_key.encode('utf-8')).hexdigest()[:16]

    def verify_token(self, token, secret_key):
        """Verifica token di accesso"""
        expected = self.generate_verification_token(secret_key)
        return token == expected


class Person(models.Model):
    invitation = models.ForeignKey(Invitation, related_name='guests', on_delete=models.CASCADE)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    is_child = models.BooleanField(default=False)
    
    # Dettagli personali
    dietary_requirements = models.TextField(blank=True, null=True, verbose_name="Allergie/Intolleranze")
    
    # EXCLUSION FLAG (Wizard RSVP Step 1)
    not_coming = models.BooleanField(
        default=False,
        help_text="True se deselezionato nel wizard RSVP (escluso da conteggi e assignment)",
        verbose_name="Non Partecipa"
    )
    
    # ASSEGNAZIONE CAMERA (Livello Granulare)
    assigned_room = models.ForeignKey(
        Room,
        null=True,
        blank=True,
        related_name='assigned_guests',
        on_delete=models.SET_NULL,
        verbose_name="Stanza Assegnata"
    )

    def __str__(self):
        suffix = " (non partecipa)" if self.not_coming else ""
        return f"{self.first_name} {self.last_name or ''}{suffix}".strip()

    class Meta:
        verbose_name = "Persona"
        verbose_name_plural = "Persone"

# ---------------------------------------------
# ANALYTICS MODELS
# ---------------------------------------------

class GuestInteraction(models.Model):
    """Traccia singole interazioni dell'utente (Visit, Click, RSVP)"""
    class EventType(models.TextChoices):
        VISIT = 'visit', 'Visita Pagina'
        CLICK_CTA = 'click_cta', 'Click CTA'
        RSVP_SUBMIT = 'rsvp_submit', 'Invio RSVP'
        RSVP_RESET = 'rsvp_reset', 'Reset RSVP'
        
    invitation = models.ForeignKey(Invitation, on_delete=models.CASCADE, related_name='interactions')
    session_id = models.CharField(
        max_length=100, 
        blank=True, 
        default='unknown',
        help_text="ID univoco sessione frontend"
    )
    event_type = models.CharField(max_length=50, choices=EventType.choices)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Dettagli Tecnici
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    device_type = models.CharField(max_length=50, null=True, blank=True, help_text="Mobile, Desktop, Tablet")
    
    # Geolocalizzazione (Popolabile se DB GeoIP disponibile)
    geo_country = models.CharField(max_length=100, null=True, blank=True)
    geo_city = models.CharField(max_length=100, null=True, blank=True)
    
    metadata = models.JSONField(default=dict, blank=True, help_text="Dati extra (es. button_id, phone_number_old, phone_number_new)")

    def __str__(self):
        return f"{self.invitation.code} - {self.event_type} - {self.timestamp}"
    
    class Meta:
        verbose_name = "Interazione Ospite"
        verbose_name_plural = "Interazioni Ospiti"
        ordering = ['-timestamp']


class GuestHeatmap(models.Model):
    """Traccia movimenti del mouse per sessione"""
    invitation = models.ForeignKey(Invitation, on_delete=models.CASCADE, related_name='heatmaps')
    session_id = models.CharField(max_length=100, help_text="ID univoco sessione frontend")
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Dati compressi: lista di [x, y, time_offset]
    # Usiamo JSONField per flessibilità. In produzione ad alto traffico meglio TimeSeries DB.
    mouse_data = models.JSONField(default=list)
    
    screen_width = models.IntegerField(default=0)
    screen_height = models.IntegerField(default=0)
    
    def __str__(self):
        return f"Heatmap {self.invitation.code} - {self.timestamp}"

    class Meta:
        verbose_name = "Heatmap Ospite"
        verbose_name_plural = "Heatmaps Ospiti"


# ---------------------------------------------
# WHATSAPP MODELS
# ---------------------------------------------

class WhatsAppSessionStatus(models.Model):
    """Singleton per lo status delle sessioni WhatsApp WAHA"""
    class SessionState(models.TextChoices):
        DISCONNECTED = 'disconnected', 'Disconnesso'
        WAITING_QR = 'waiting_qr', 'In Attesa QR Code'
        CONNECTED = 'connected', 'Connesso'
        ERROR = 'error', 'Errore'
    
    session_type = models.CharField(
        max_length=10,
        choices=[('groom', 'Sposo'), ('bride', 'Sposa')],
        unique=True
    )
    phone_number = models.TextField(blank=True, null=True)
    name = models.TextField(blank=True, null=True)
    picture = models.TextField(blank=True, null=True)
    state = models.CharField(
        max_length=20,
        choices=SessionState.choices,
        default=SessionState.DISCONNECTED
    )
    last_qr_code = models.TextField(blank=True, null=True)
    last_check = models.DateTimeField(auto_now=True)
    error_message = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = "Status Sessione WhatsApp"
        verbose_name_plural = "Status Sessioni WhatsApp"

class WhatsAppMessageQueue(models.Model):
    """Coda di invio asincrona per evitare blocchi e gestire rate limits"""
    class Status(models.TextChoices):
        PENDING = 'pending', 'In Attesa'
        PROCESSING = 'processing', 'In Elaborazione'
        SENT = 'sent', 'Inviato'
        FAILED = 'failed', 'Fallito'
        SKIPPED = 'skipped', 'Saltato (Rate Limit)'

    session_type = models.CharField(max_length=10, choices=[('groom', 'Sposo'), ('bride', 'Sposa')])
    recipient_number = models.CharField(max_length=20)
    message_body = models.TextField()
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    scheduled_for = models.DateTimeField(auto_now_add=True, help_text="Quando provare l'invio")
    sent_at = models.DateTimeField(null=True, blank=True)
    
    attempts = models.IntegerField(default=0)
    error_log = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"[{self.session_type}] -> {self.recipient_number} ({self.status})"
    
    class Meta:
        verbose_name = "Coda Messaggi WhatsApp"
        verbose_name_plural = "Coda Messaggi WhatsApp"
        ordering = ['scheduled_for']


class WhatsAppMessageEvent(models.Model):
    """
    Timeline granulare degli eventi di invio messaggio.
    Permette di tracciare sia i wait del worker (rate_limit) che gli step human-like (reading, typing, etc.).
    """
    class Phase(models.TextChoices):
        # Worker (Backend Django)
        QUEUED = 'queued', 'Accodato'
        WAITING_RATE_LIMIT = 'waiting_rate_limit', 'In Attesa Rate Limit'
        RATE_LIMIT_OK = 'rate_limit_ok', 'Rate Limit Superato'
        
        # Integration Layer (Node.js)
        READING = 'reading', 'Lettura Messaggi'
        WAITING_HUMAN = 'waiting_human', 'Attesa Umana'
        TYPING = 'typing', 'Digitazione'
        SENDING = 'sending', 'Invio'
        SENT = 'sent', 'Inviato'
        
        # Errori
        FAILED = 'failed', 'Fallito'
        SKIPPED = 'skipped', 'Saltato'
    
    queue_message = models.ForeignKey(
        WhatsAppMessageQueue, 
        related_name='events', 
        on_delete=models.CASCADE,
        verbose_name="Messaggio Coda"
    )
    phase = models.CharField(
        max_length=30, 
        choices=Phase.choices,
        verbose_name="Fase"
    )
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Timestamp")
    duration_ms = models.IntegerField(
        null=True, 
        blank=True, 
        help_text="Durata della fase in millisecondi (se applicabile)"
    )
    metadata = models.JSONField(
        default=dict, 
        blank=True, 
        help_text="Dati extra (es. rate_limit_remaining, typing_duration_ms, error_detail)"
    )
    
    def __str__(self):
        return f"{self.queue_message.recipient_number} - {self.phase} @ {self.timestamp}"
    
    class Meta:
        verbose_name = "Evento Messaggio WhatsApp"
        verbose_name_plural = "Eventi Messaggi WhatsApp"
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['queue_message', 'timestamp']),
            models.Index(fields=['phase']),
        ]

class WhatsAppTemplate(models.Model):
    class Condition(models.TextChoices):
        STATUS_CHANGE = 'status_change', 'Cambio di Stato'
        MANUAL = 'manual', 'Manuale (Spot)'

    name = models.CharField(max_length=100, help_text="Nome descrittivo del template")
    condition = models.CharField(max_length=20, choices=Condition.choices, default=Condition.STATUS_CHANGE)
    
    # Se condition == STATUS_CHANGE, questo campo definisce QUANDO inviare
    trigger_status = models.CharField(
        max_length=20, 
        choices=Invitation.Status.choices, 
        blank=True, 
        null=True,
        help_text="Stato che attiva l'invio automatico"
    )
    
    content = models.TextField(help_text="Usa {name}, {link}, {code} come placeholder")
    is_active = models.BooleanField(default=True, verbose_name="Attivo")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['trigger_status', 'condition'] # Un solo template automatico per stato
        verbose_name = "Template WhatsApp"
        verbose_name_plural = "Template WhatsApp"

    def __str__(self):
        return f"{self.name} ({self.get_condition_display()})"
