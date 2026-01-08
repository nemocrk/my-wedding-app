from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_guestheatmap_guestinteraction'),
    ]

    operations = [
        migrations.AddField(
            model_name='invitation',
            name='contact_verified',
            field=models.CharField(choices=[('not_valid', 'Numero non valido/assente'), ('not_exist', 'Non esiste su WhatsApp'), ('not_present', 'Non in rubrica'), ('ok', 'OK (Verificato)')], default='not_valid', max_length=20, verbose_name='Stato Verifica Contatto'),
        ),
    ]
