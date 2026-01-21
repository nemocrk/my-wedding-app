import pytest
from django.db import transaction
from core.models import Invitation, Person, InvitationLabel

@pytest.mark.django_db
class TestDietarySignals:

    def test_auto_assign_dietary_label_on_add(self):
        """
        Testa che l'etichetta 'Intolleranze' venga assegnata automaticamente
        quando un ospite inserisce una richiesta alimentare.
        """
        # Crea un invito
        invitation = Invitation.objects.create(
            name="Famiglia Rossi",
            code="ROSSI01",
            status=Invitation.Status.CREATED
        )
        
        # Crea un ospite senza intolleranze
        guest = Person.objects.create(
            invitation=invitation,
            first_name="Mario",
            last_name="Rossi"
        )
        
        # Verifica che l'etichetta non ci sia ancora
        assert not invitation.labels.filter(name="Intolleranze").exists()
        
        # Aggiorna l'ospite con intolleranze
        guest.dietary_requirements = "Celiachia"
        guest.save()
        
        # Verifica che l'etichetta sia stata aggiunta
        assert invitation.labels.filter(name="Intolleranze").exists()
        
        # Verifica anche il colore
        label = invitation.labels.get(name="Intolleranze")
        assert label.color == "#FF6B6B"

    def test_auto_remove_dietary_label_on_clear(self):
        """
        Testa che l'etichetta venga rimossa quando nessun ospite ha più intolleranze.
        """
        invitation = Invitation.objects.create(
            name="Famiglia Bianchi",
            code="BIANCHI01"
        )
        
        # Aggiunge ospite con intolleranza
        guest = Person.objects.create(
            invitation=invitation,
            first_name="Luigi",
            dietary_requirements="Lattosio"
        )
        
        # Label dovrebbe esserci
        assert invitation.labels.filter(name="Intolleranze").exists()
        
        # Rimuove intolleranza
        guest.dietary_requirements = ""
        guest.save()
        
        # Label dovrebbe essere rimossa
        assert not invitation.labels.filter(name="Intolleranze").exists()

    def test_keep_label_if_other_guest_has_requirements(self):
        """
        Testa che l'etichetta rimanga se un ospite rimuove l'intolleranza 
        ma un altro nello stesso invito ne ha ancora.
        """
        invitation = Invitation.objects.create(
            name="Famiglia Verdi",
            code="VERDI01"
        )
        
        # Ospite 1 con intolleranza
        guest1 = Person.objects.create(
            invitation=invitation,
            first_name="Giuseppe",
            dietary_requirements="No Noci"
        )
        
        # Ospite 2 con intolleranza
        guest2 = Person.objects.create(
            invitation=invitation,
            first_name="Maria",
            dietary_requirements="Vegetariana"
        )
        
        assert invitation.labels.filter(name="Intolleranze").exists()
        
        # Ospite 1 rimuove intolleranza
        guest1.dietary_requirements = ""
        guest1.save()
        
        # Label deve rimanere perché c'è guest2
        assert invitation.labels.filter(name="Intolleranze").exists()
        
        # Ospite 2 rimuove intolleranza
        guest2.dietary_requirements = ""
        guest2.save()
        
        # Ora deve sparire
        assert not invitation.labels.filter(name="Intolleranze").exists()
