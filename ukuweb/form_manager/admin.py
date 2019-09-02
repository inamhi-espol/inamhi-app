from django.contrib import admin
from form_manager.models import UserProfile, UserType, Template, TemplateType
from api.models import FormData
from import_export import resources
from import_export.admin import ImportExportModelAdmin


class FormDataResource(resources.ModelResource):
    class Meta:
        model = FormData


class FormDataAdmin(ImportExportModelAdmin):
    resource_class = FormDataResource


# Register your models here.
admin.site.register(FormData, FormDataAdmin)
admin.site.register(UserType)
admin.site.register(TemplateType)
admin.site.register(UserProfile)
admin.site.register(Template)
