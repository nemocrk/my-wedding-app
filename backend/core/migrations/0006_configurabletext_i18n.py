from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_whatsapp_integration'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='configurabletext',
            options={'ordering': ['key', 'language'], 'verbose_name': 'Testo Configurabile', 'verbose_name_plural': 'Testi Configurabili'},
        ),
        migrations.AddField(
            model_name='configurabletext',
            name='language',
            field=models.CharField(db_index=True, default='it', help_text='Codice lingua ISO (it, en, es...)', max_length=5, verbose_name='Lingua'),
        ),
        migrations.AlterField(
            model_name='configurabletext',
            name='key',
            field=models.CharField(db_index=True, help_text="Chiave per identificare il testo (es. 'envelope.front.content')", max_length=255, verbose_name='Chiave'),
        ),
        migrations.AlterUniqueTogether(
            name='configurabletext',
            unique_together={('key', 'language')},
        ),
    ]
