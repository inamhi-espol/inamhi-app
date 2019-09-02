from django.conf.urls import url
from . import views

urlpatterns = [
    url(r"^validate_user/", views.validate_user, name="validate"),
    url(r"^send_form/", views.save_form_data, name="save"),
    url(
        r"^user/(?P<uid>[a-zA-Z0-9_\-]{1,36})/templates/",
        views.get_templates,
        name="get-templates",
    ),
]
