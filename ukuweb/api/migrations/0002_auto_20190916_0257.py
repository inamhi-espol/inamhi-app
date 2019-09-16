# -*- coding: utf-8 -*-
# Generated by Django 1.9.13 on 2019-09-16 02:57
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='FormDataField',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=500)),
                ('input_time', models.TimeField(blank=True, null=True)),
                ('save_date', models.DateTimeField(blank=True, null=True)),
                ('editions', models.IntegerField(default=1)),
                ('initial_value', models.DecimalField(decimal_places=2, max_digits=11, null=True)),
                ('final_value', models.DecimalField(decimal_places=2, max_digits=11, null=True)),
                ('defined_coordinate', models.CharField(blank=True, max_length=100, null=True)),
                ('saved_coordinate', models.CharField(blank=True, max_length=100, null=True)),
                ('status', models.BooleanField(default=False)),
            ],
            options={
                'ordering': ['name', 'save_date'],
            },
        ),
        migrations.CreateModel(
            name='FormDataVersion',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('version', models.IntegerField(default=1)),
                ('data', models.TextField()),
                ('coordinates', models.CharField(max_length=100, null=True)),
                ('saved_date', models.DateTimeField(blank=True, null=True)),
                ('reason', models.CharField(blank=True, max_length=500, null=True)),
            ],
        ),
        migrations.RemoveField(
            model_name='formdata',
            name='coordinates',
        ),
        migrations.RemoveField(
            model_name='formdata',
            name='data',
        ),
        migrations.RemoveField(
            model_name='formdata',
            name='reason',
        ),
        migrations.AlterField(
            model_name='formdata',
            name='code',
            field=models.CharField(blank=True, max_length=15, null=True),
        ),
        migrations.AddField(
            model_name='formdataversion',
            name='form_data',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='versions', to='api.FormData'),
        ),
        migrations.AddField(
            model_name='formdatafield',
            name='form_data',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fields', to='api.FormData'),
        ),
    ]
