from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_add_global_config_and_rsvp_fields'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='person',
            name='is_attending',
        ),
        migrations.AddField(
            model_name='invitation',
            name='status',
            field=models.CharField(choices=[('pending', 'In Attesa'), ('confirmed', 'Confermato'), ('declined', 'Declinato')], default='pending', max_length=20, verbose_name='Stato RSVP'),
        ),
    ]
