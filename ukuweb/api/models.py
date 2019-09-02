# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models
from form_manager.models import UserProfile, TemplateType, Template
import dateutil.parser
import datetime
import uuid
import ast


class FormDataManager(models.Manager):
    def create(self, formData):
        """
        "template": {
            "uuid": "f245dec6-1997-1242-2de3-c12f8d58d1ec",
            "setId": "0cfc0e05-8e4c-435a-893b-5d12ede68f0f"
        }
        "formData": {
            "code": "00001"
            "createdDate": Sat Jul 20 2019 12:51:34 GMT-0500 (hora de Ecuador)
            "data": {}
            "name": "Nutrición - Puyo"
            "type": "initial"
            "uuid": "e471fda6-1590-4341-9cf4-a29e9d59b0ae",
            "gps": false,
            "coordinates": null,
            "reason": ""
        },
        "user": {
            "username": "user example",
            "uid": "e779204e-acd5-4c31-8e0b-4527f2f5dcc2"
            }
        """
        form = formData["formData"]
        temp_type = form.get("type").upper()
        if temp_type == "INITIAL":
            temp_type = "INICIAL"
        elif temp_type == "FOLLOW_UP":
            temp_type = "SEGUIMIENTO"

        type = TemplateType.objects.filter(name=temp_type) if form.get("type") else None
        if type and type.exists():
            type = type.get()
        else:
            type = TemplateType.objects.get(name="SIMPLE")

        created_date = dateutil.parser.parse(form.get("createdDate"))
        coordinates = form.get("coordinates", None)
        form_data = self.model(
            uid=form.get("uuid"),
            type=type,
            name=form.get("name"),
            coordinates=form.get("coordinates", None),
            data=form.get("data"),
            created_date=created_date,
            send_date=datetime.datetime.now(),
            include_gps=True if form.get("gps") == "required" else False,
            code=form.get("code", None),
        )
        form_data.reason = form.get("reason", None)
        templateUuid = formData["formData"].get("uuid")
        template = Template.objects.filter(uid=templateUuid)
        if template.exists():
            form_data.template = template
        user = formData.get("user", None)
        if user:
            user = UserProfile.objects.get(uid=user.get("uid"))
            form_data.user = user
        return form_data


class FormData(models.Model):
    uid = models.CharField(default=uuid.uuid4, editable=False, max_length=36)
    name = models.CharField(max_length=500, blank=True)
    type = models.ForeignKey(TemplateType, null=True)
    coordinates = models.CharField(max_length=100, null=True)
    data = models.TextField()
    created_date = models.DateTimeField(null=True, blank=True)
    send_date = models.DateTimeField(null=True, blank=True)
    include_gps = models.BooleanField(default=False)
    objects = FormDataManager()
    user = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True)
    template = models.ForeignKey(Template, on_delete=models.SET_NULL, null=True)
    code = models.CharField(max_length=15, null=True, blank=True)
    reason = models.CharField(max_length=500, null=True, blank=True)

    def coordinates_name(self):
        coordinates = self.coordinates
        if coordinates:
            if not type(coordinates) is dict:
                coordinates = ast.literal_eval(coordinates)
            return "{0}, {1}".format(
                coordinates.get("latitude"), coordinates.get("longitude")
            )
        else:
            return "No se pudo determinar"

    def to_dict(self):
        return {
            "uid": self.uid,
            "name": self.name if self.name else "",
            "type": self.type.name if self.type else "",
            "coordinates": self.coordinates_name(),
            "data": self.data,
            "created_date": self.created_date,
            "send_date": self.send_date,
            "include_gps": self.include_gps,
            "code": self.code if self.code else "",
            "user": self.user.user.username if self.user else None,
            "reason": self.reason if self.user else None,
        }
