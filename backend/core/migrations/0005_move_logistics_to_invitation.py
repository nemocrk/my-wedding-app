from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_move_status_to_invitation'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='person',
            name='requires_accommodation',
        ),
        migrations.RemoveField(
            model_name='person',
            name='requires_transfer',
        ),
        migrations.AddField(
            model_name='invitation',
            name='accommodation_requested',
            field=models.BooleanField(default=False, verbose_name='Richiede Alloggio'),
        ),
        migrations.AddField(
            model_name='invitation',
            name='transfer_requested',
            field=models.BooleanField(default=False, verbose_name='Richiede Transfer'),
        ),
    ]
