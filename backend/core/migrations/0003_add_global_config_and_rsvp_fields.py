from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_alter_person_last_name'),
    ]

    operations = [
        migrations.CreateModel(
            name='GlobalConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('price_adult_meal', models.DecimalField(decimal_places=2, default=100.0, max_digits=10, verbose_name='Costo Pranzo Adulti')),
                ('price_child_meal', models.DecimalField(decimal_places=2, default=50.0, max_digits=10, verbose_name='Costo Pranzo Bambini')),
                ('price_accommodation_adult', models.DecimalField(decimal_places=2, default=80.0, max_digits=10, verbose_name='Costo Alloggio Adulti')),
                ('price_accommodation_child', models.DecimalField(decimal_places=2, default=40.0, max_digits=10, verbose_name='Costo Alloggio Bambini')),
                ('price_transfer', models.DecimalField(decimal_places=2, default=20.0, max_digits=10, verbose_name='Costo Transfer (p.p.)')),
                ('letter_text', models.TextField(default='Caro {guest_names},\nSiamo lieti di invitarti al nostro matrimonio...', help_text='Placeholder disponibili: {guest_names}, {family_name}, {code}', verbose_name='Testo Lettera')),
            ],
            options={
                'verbose_name': 'Configurazione Globale',
                'verbose_name_plural': 'Configurazione Globale',
            },
        ),
        migrations.AddField(
            model_name='person',
            name='dietary_requirements',
            field=models.TextField(blank=True, null=True, verbose_name='Allergie/Intolleranze'),
        ),
        migrations.AddField(
            model_name='person',
            name='is_attending',
            field=models.BooleanField(blank=True, null=True, verbose_name='Presente'),
        ),
        migrations.AddField(
            model_name='person',
            name='requires_accommodation',
            field=models.BooleanField(default=False, verbose_name='Richiede Alloggio'),
        ),
        migrations.AddField(
            model_name='person',
            name='requires_transfer',
            field=models.BooleanField(default=False, verbose_name='Richiede Transfer'),
        ),
    ]
