# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models
from django.contrib.auth.models import User
import uuid
import json

# Create your models here.
class UserType(models.Model):
    USER_ADMIN = "administrador"
    USER_INTERVIEWER = "entrevistador"
    ADMIN = "01"
    INTERVIEWER = "02"
    name = models.CharField(max_length=30)
    code = models.CharField(max_length=2)

    def __unicode__(self):
        return self.name


class TemplateType(models.Model):
    INITIAL_TEMPLATE = "INICIAL"
    FOLLOWUP_TEMPLATE = "SEGUIMIENTO"
    SIMPLE_TEMPLATE = "SIMPLE"
    COMPOUND_TEMPLATE = "COMPUESTA"
    MULTIFORM_TEMPLATE = "MULTIFORM"
    INITIAL = "01"
    FOLLOWUP = "02"
    SIMPLE = "03"
    COMPOUND = "04"
    MULTIFORM = "05"
    name = models.CharField(max_length=20)
    code = models.CharField(max_length=2)

    def __unicode__(self):
        return self.name


class UserProfile(models.Model):
    uid = models.CharField(
        primary_key=True, default=uuid.uuid4, editable=False, max_length=36
    )
    name = models.CharField(max_length=350)
    last_name = models.CharField(max_length=350)
    user_type = models.ForeignKey(UserType)
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    manager = models.ForeignKey(
        "self", null=True, blank=True, related_name="created_by"
    )

    def __unicode__(self):
        return self.name


class Template(models.Model):
    uid = models.CharField(default=uuid.uuid4, max_length=36)
    type = models.ForeignKey(TemplateType)
    name = models.CharField(max_length=500)
    structure = models.TextField()
    quantity = models.IntegerField(default=0)
    gps = models.BooleanField(default=False)
    set_name = models.CharField(null=True, max_length=36)
    input_interval = models.TimeField(null=True, blank=True)
    set_id = models.CharField(null=True, max_length=36)

    def to_dict(self):
        template_dict = {
            "uid": self.uid,
            "type": self.type.name,
            "name": self.name,
            "quantity": self.quantity,
            "set_name": self.set_name,
            "set_id": self.set_id,
            "input_interval": self.input_interval,
            "gps": "required" if self.gps else "not-required",
        }
        structure = json.loads(self.structure)
        if structure.get("notifications", None):
            template_dict["notifications"] = structure["notifications"]
        if structure.get("data", None):
            template_dict["data"] = structure["data"]
        return template_dict


class UserTemplate(models.Model):
    user = models.ForeignKey(UserProfile)
    template = models.ForeignKey(Template)


class InfoTemplate(models.Model):
    done_quantity = models.IntegerField()
    remain_quantity = models.IntegerField()
    type = models.ForeignKey(TemplateType)
    template = models.ForeignKey(Template)
