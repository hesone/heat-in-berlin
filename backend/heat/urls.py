from django.urls import path

from . import views

urlpatterns = [
    path("health", views.health),
    path("meta", views.meta),
    path("buildings", views.buildings),
    path("hexagons", views.hexagons),
    path("analyse", views.analyse_area),
]
