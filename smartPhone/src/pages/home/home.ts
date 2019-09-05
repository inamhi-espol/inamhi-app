import { Component, ElementRef, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { NavController, MenuController, Events, AlertController, Platform, LoadingController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { AuthPage } from '../auth/auth';
import { DatePipe } from '@angular/common';
import { HTTP } from '@ionic-native/http';
import { HttpClient } from '@angular/common/http';
import { LocationAccuracy } from '@ionic-native/location-accuracy';
import { Diagnostic } from '@ionic-native/diagnostic';
import { Coordinates, Geolocation } from '@ionic-native/geolocation';
import { FormPage } from '../form/form';
import { FollowUpPage } from '../followUp/followUp';
import { LocalNotifications } from '@ionic-native/local-notifications';
import uuid from 'uuid/v4';

@Component({
    selector: 'page-home',
    templateUrl: 'home.html'
})

export class HomePage {
    sentForms;
    templates;
    infoTemplates = [];
    pendingForms = [];
    formsData = {};
    geolocationAuth;
    coordinates = null;
    loading;
    selectedSection;
    select_tipo_compuesta;
    select_tipo_multiform;
    linkedUser;
    notifications;
    id;
    urlFunctions = "http://150.136.213.20/dataset/0cfc0e05-8e4c-435a-893b-5d12ede68f0f/resource/d0173624-db8d-4487-929e-e69872e5c840/download/calculos.json";

    constructor(private diagnostic: Diagnostic,
        private events: Events,
        private platform: Platform,
        public menuCtrl: MenuController,
        private locationAccuracy: LocationAccuracy,
        private geolocation: Geolocation,
        private storage: Storage,
        public alertCtrl: AlertController,
        public loadingController: LoadingController,
        public navCtrl: NavController,
        public http: HTTP,
        public httpClient: HttpClient,
        private localNotifications: LocalNotifications) {

        this.menuCtrl.enable(true);

        this.storage.get('sentForms').then((sentForms) => {
            this.sentForms = sentForms;
        });

        this.storage.get('templates').then((templates) => {
            this.templates = templates;
        });

        this.storage.get('linkedUser').then((linkedUser) => {
            this.linkedUser = linkedUser;
        });

        this.storage.get('pendingForms').then((pendingForms) => {
            this.pendingForms = pendingForms;
        });

        this.storage.get('infoTemplates').then((templates) => {
            this.infoTemplates = templates;
            this.selectedSection = templates[0];
        });

        this.storage.get('linkedUser').then((linkedUser) => {
            var url = "http://150.136.230.16/api/user/" + linkedUser.uid + "/templates/";
            this.http.get(url, {}, {}).then(res => {
                this.storage.set("templates", JSON.parse(res.data).templates);
            }).catch(error => {
                console.log("error", error);

                //loader.dismiss();
                /*if (error.status == 403) {
                    const alert = this.alertCtrl.create({
                        subTitle: 'Hubo un problema de conexión. Intentelo más tarde',
                        buttons: ['OK']
                    });
                    alert.present();
                } else {
                    const alert = this.alertCtrl.create({
                        subTitle: 'Hubo un error',
                        buttons: ['OK']
                    });
                    alert.present();
                }*/
            });
        });

        /*this.storage.get('templates').then((templates) => {
            if(templates.name == "Nutrición") {
                var url_calculos = "http://150.136.213.20/dataset/0cfc0e05-8e4c-435a-893b-5d12ede68f0f/resource/98c97425-d342-4aa7-9f8f-fe7f5df7dec4/download/calculos_nutricion.json";
            } else if(templates.name == "INHAMI") {
                var url_calculos = "http://150.136.213.20/dataset/5cf2b424-a092-4d55-b955-0d9f2942ed4f/resource/d1aadedb-295f-460b-b462-d069dc87b8d6/download/calculos_inhami.json";
            }

            this.http.get(url_calculos, {}, {})
                .then(res => {
                    this.storage.set('calculos', res);
                })
                .catch(error => {
                    console.log("error", error);

                    if (error.status == 403) {
                        const alert = this.alertCtrl.create({
                            subTitle: 'Hubo un problema de conexión. Intentelo más tarde',
                            buttons: ['OK']
                        });
                        alert.present();
                    }else if(error.status == 500){
                      const alert = this.alertCtrl.create({
                          subTitle: 'Lo sentimos, hubo un problema en el servidor. Intentelo más tarde',
                          buttons: ['OK']
                      });
                      alert.present();
                    }
                    else {
                        const alert = this.alertCtrl.create({
                            subTitle: 'Usuario o contraseña incorrectos home',
                            buttons: ['OK']
                        });
                        alert.present();
                    }
            });
        });*/

        this.httpClient.get(this.urlFunctions).subscribe(res => {
            this.storage.set('calculos', res);
        }, err => {
            console.log('error no puede conectarse al servidor para descarga de calculos');
            console.log(err);
            this.httpClient.get('./assets/calculos/calculos.json').subscribe(res => {
                this.storage.set('calculos', res);
            }, err => {
                console.log('Hubo un error al obtener los cálculos');
                console.log(err);
            });
        });

        this.storage.get("formsData").then((formsData) => {
            if (formsData != null && (Object.keys(formsData).length > 0)) {
                this.formsData = formsData;
            }
        });

        this.setNotificaciones();
    }

    ionViewWillEnter(){
        this.storage.get('infoTemplates').then((templates) => {
          this.infoTemplates = templates;
          this.selectedSection = templates[0];
        });
    }

    getType(type) {
        if (type.type == 'initial') {
            return 'INICIAL';
        } else if (type.type == 'follow_up') {
            return 'SEGUIMIENTO';
        }
    }

    getQuantities(template, select, quantity) {
        if (quantity == "done") {
            return template.quantity.find(cantidad => cantidad.type === select).done_quantity;
        } else if (quantity == "remain") {
            return template.quantity.find(cantidad => cantidad.type === select).remain_quantity;
        }
        return 0;
    }

    setNotificaciones() {
        this.storage.get('notifications').then((notifications) => {
            if(notifications) {
                this.notifications = notifications;
            } else {
                this.notifications = {};
            }
            this.id = 0;
        });
        this.storage.get('templates').then((templates) => {
            for (let template of templates) {
                if(this.notifications[template.name]) {
                    this.localNotifications.cancel(this.notifications[template.name]);
                }
                this.notifications[template.name] = new Array();
                if (template.notifications) {
                    for (let noti of template.notifications) {
                        var nombre = template.name;
                        var tipo = template.type;

                        if (noti.type == 'SIMPLE') {
                            for (let no of noti.children) {
                                var fecha = no.date.split('-');
                                var hora = no.time.split(':');
                                this.localNotifications.schedule({
                                    id: this.id,
                                    icon: 'file://assets/imgs/logo_notification.png',
                                    title: 'NUEVO FORMULARIO',
                                    text: 'Tiene un nuevo formulario llamado ' + nombre + ' de tipo ' + tipo + ' por realizar',
                                    trigger: { at: new Date(fecha[0], fecha[1] - 1, fecha[2], hora[0], hora[1], 0) },
                                    led: 'FF0000'
                                });
                                this.notifications[template.name].push(this.id);
                                this.id++;
                            }
                        } else if (noti.type == 'PERIÓDICA') {
                            var interval_type = noti.interval_type;
                            var interval_value = noti.interval_value;
                            var fecha_noti;

                            for (let no of noti.children) {
                                var fecha = no.date.split('-');
                                var hora = no.time.split(':');
                                if (no.type == 'start') {
                                    var fecha_inicio = new Date(fecha[0], fecha[1] - 1, fecha[2], hora[0], hora[1], 0);
                                } else {
                                    var fecha_fin = new Date(fecha[0], fecha[1] - 1, fecha[2], hora[0], hora[1], 0);
                                }
                            }

                            fecha_noti = new Date(fecha_inicio.getFullYear(), fecha_inicio.getMonth(), fecha_inicio.getDate(), fecha_inicio.getHours(), fecha_inicio.getMinutes(), 0);

                            do {
                                this.localNotifications.schedule({
                                    id: this.id,
                                    icon: 'file://assets/imgs/logo_notification.png',
                                    title: 'NUEVO FORMULARIO',
                                    text: 'Tiene un nuevo formulario llamado ' + nombre + ' de tipo ' + tipo + ' por realizar',
                                    trigger: { at: new Date(fecha_noti.getFullYear(), fecha_noti.getMonth(), fecha_noti.getDate(), fecha_noti.getHours(), fecha_noti.getMinutes(), 0) },
                                    led: 'FF0000'
                                });

                                this.notifications[template.name].push(this.id);

                                if (interval_type == 'minute') {
                                    fecha_noti.setTime(fecha_noti.getTime() + (interval_value * 60 * 1000));
                                } else if (interval_type == 'hour') {
                                    fecha_noti.setTime(fecha_noti.getTime() + (interval_value * 60 * 60 * 1000));
                                } else if (interval_type == 'day') {
                                    fecha_noti.setTime(fecha_noti.getTime() + (interval_value * 24 * 60 * 60 * 1000));
                                } else if (interval_type == 'week') {
                                    fecha_noti.setTime(fecha_noti.getTime() + (interval_value * 7 * 24 * 60 * 60 * 1000));
                                } else if (interval_type == 'month') {
                                    fecha_noti.setTime(fecha_noti.getTime() + (interval_value * 30 * 24 * 60 * 60 * 1000));
                                }

                                this.id++;

                            } while (fecha_noti.getTime() <= fecha_fin.getTime());
                        } else if(noti.type == 'PERIÓDICA_HORA_FIJA') {
                            var interval_type = noti.interval_type;
                            var interval_value = noti.interval_value;
                            var fecha_noti, fecha;
                            var dias = [];
                            var f2, f1;
                            var fecha_i = noti.dates[0];
                            var fecha_fi = noti.dates[noti.dates.length - 1];
                            var temp = fecha_fi.split('-');
                            var fecha_f = new Date(temp[0], temp[1] - 1, temp[2], 0, 0);

                            do {
                                dias.push(fecha_i);
                                f1 = fecha_i.split('-');
                                f1 = new Date(f1[0], f1[1] - 1, f1[2], 0, 0);
                                f2 = new Date(f1.getTime() + (interval_value * 24 * 60 * 60 * 1000));
                                fecha_i = f2.getFullYear() + '-' + (f2.getMonth()+1) + '-' + f2.getDate();
                            } while(f2.getTime() <= fecha_f.getTime());

                            for(let fe of dias) {
                                fecha = fe.split('-');

                                for(let ti of noti.times) {
                                    var hora = ti.split(':');
                                    fecha_noti = new Date(fecha[0], fecha[1] - 1, fecha[2], hora[0], hora[1], 0);

                                    this.localNotifications.schedule({
                                        id: this.id,
                                        icon: 'file://assets/imgs/logo_notification.png',
                                        title: 'NUEVO FORMULARIO',
                                        text: 'Tiene un nuevo formulario llamado ' + nombre + ' de tipo ' + tipo + ' por realizar',
                                        trigger: {at: new Date(fecha_noti.getFullYear(), fecha_noti.getMonth(), fecha_noti.getDate(), fecha_noti.getHours(), fecha_noti.getMinutes(), 0)},
                                        led: 'FF0000'
                                    });

                                    this.notifications[template.name].push(this.id);
                                    this.id++;
                                }
                            }
                        }
                    }
                }
            }
            this.notifications['totalQuantity'] = this.id;
            this.storage.set('notifications', this.notifications);
        });
    }

    pad(num, size) {
        var s = "00000" + num;
        return s.substr(s.length - size);
    }

    async startFollowUpForm(template, selectedTemplate, templateUuid, index, reason) {
        this.formsData = await this.storage.get("formsData");
        let forms;
        if (this.formsData != null && (Object.keys(this.formsData).length > 0)) {
            forms = this.formsData[templateUuid];
            let initialForms = [];
            for (let form of forms) {
                if (form.type == "initial")
                    initialForms.push(form);
            }
            this.storage.get('pendingForms').then((pendingForms) => {
                this.pendingForms = pendingForms;
                this.navCtrl.push(FollowUpPage, {
                    template: template,
                    coordinates: this.coordinates,
                    geolocationAuth: this.geolocationAuth,
                    selectedTemplate: selectedTemplate,
                    forms: initialForms,
                    formsData: this.formsData,
                    pendingForms: this.pendingForms,
                    infoTemplates: this.infoTemplates,
                    infoTemplateIndex: index,
                    reason: reason
                });
            });
        } else {
            let alert = this.alertCtrl.create({
                subTitle: "No existen formularios iniciales.",
                buttons: ["cerrar"]
            });
            alert.present();
        }
    }

    startInitialForm(template, selectedTemplate, templateUuid, formUuid, type, index, code, reason) {
        // Generate a code for Interviewed
        this.storage.get('formsData').then((formsData) => {
            this.formsData = formsData;
            let currentForm = {};
            let forms;
            if (this.formsData != null && (Object.keys(this.formsData).length > 0) && this.formsData.hasOwnProperty(templateUuid)) {
                forms = this.formsData[templateUuid].slice(0);
            }
            if (forms != null && (forms.length > 0)) {
                let form = forms[forms.length - 1];
                let code_number = parseInt(form.code) + 1;
                currentForm = {
                    uuid: formUuid,
                    code: code,
                    reason: reason,
                    version: 0,
                    type: type,
                    name: template.name,
                    gps: template.gps,
                    data: {},
                    createdDate: new Date()
                };
                if (template.gps == "required") {
                    currentForm["coordinates"] = this.coordinates;
                }
                forms.push(currentForm);
            }
            else {
                currentForm = {
                    uuid: formUuid,
                    code: code,
                    reason: reason,
                    version: 0,
                    type: type,
                    name: template.name,
                    gps: template.gps,
                    data: {},
                    createdDate: new Date()
                };
                if (template.gps == "required") {
                    currentForm["coordinates"] = this.coordinates;
                }
                forms = [currentForm];
            }
            var pendingForms = []
            this.storage.get('pendingForms').then((pendingForms) => {
                this.pendingForms = pendingForms;
                if (this.pendingForms != null && (this.pendingForms.length > 0)) {
                    pendingForms = this.pendingForms.slice(0);
                    let idx = 0;
                    if (this.formsData != null && this.formsData[templateUuid] != null) {
                        idx = this.formsData[templateUuid].length;
                    }
                    pendingForms.push({
                        template: templateUuid,
                        setId: template.set_id,
                        formData: currentForm,
                        index: idx
                    });
                } else {
                    pendingForms = [{
                        template: templateUuid,
                        setId: template.set_id,
                        formData: currentForm,
                        index: 0
                    }];
                }
                this.navCtrl.push(FormPage, {
                    template: template,
                    selectedTemplate: selectedTemplate,
                    formData: selectedTemplate,
                    currentForm: currentForm,
                    forms: forms,
                    formsData: this.formsData,
                    pendingForms: pendingForms,
                    geolocationAuth: this.geolocationAuth,
                    infoTemplates: this.infoTemplates,
                    infoTemplateIndex: index
                });
            });
        });
    }

    startSimpleForm(template, selectedTemplate, templateUuid, formUuid, type, index, reason) {
        // Generate a code for Interviewed
        this.storage.get('formsData').then((formsData) => {
            this.formsData = formsData;
            let currentForm = {};
            let forms;
            if (this.formsData != null && (Object.keys(this.formsData).length > 0) && this.formsData.hasOwnProperty(templateUuid)) {
                forms = this.formsData[templateUuid].slice(0);
            }
            if (forms != null && (forms.length > 0)) {
                let form = forms[forms.length - 1];
                let code_number = parseInt(form.code) + 1;
                currentForm = {
                    uuid: formUuid,
                    code: "",
                    reason: reason,
                    version: 0,
                    type: type,
                    name: template.name,
                    gps: template.gps,
                    data: {},
                    createdDate: new Date()
                };
                if (template.gps == "required") {
                    currentForm["coordinates"] = this.coordinates;
                }
                forms.push(currentForm);
            }
            else {
                currentForm = {
                    uuid: formUuid,
                    code: "",
                    reason: reason,
                    version: 0,
                    type: type,
                    name: template.name,
                    gps: template.gps,
                    data: {},
                    createdDate: new Date()
                };
                if (template.gps == "required") {
                    currentForm["coordinates"] = this.coordinates;
                }
                forms = [currentForm];
            }
            var pendingForms = []
            this.storage.get('pendingForms').then((pendingForms) => {
                this.pendingForms = pendingForms;
                if (this.pendingForms != null && (this.pendingForms.length > 0)) {
                    pendingForms = this.pendingForms.slice(0);
                    let idx = 0;
                    if (this.formsData != null && this.formsData[templateUuid] != null) {
                        idx = this.formsData[templateUuid].length;
                    }
                    pendingForms.push({
                        template: templateUuid,
                        setId: template.set_id,
                        formData: currentForm,
                        index: idx
                    });
                } else {
                    pendingForms = [{
                        template: templateUuid,
                        setId: template.set_id,
                        formData: currentForm,
                        index: 0
                    }];
                }
                this.navCtrl.push(FormPage, {
                    template: template,
                    selectedTemplate: selectedTemplate,
                    formData: selectedTemplate,
                    currentForm: currentForm,
                    forms: forms,
                    formsData: this.formsData,
                    pendingForms: pendingForms,
                    geolocationAuth: this.geolocationAuth,
                    infoTemplates: this.infoTemplates,
                    infoTemplateIndex: index
                });
            });
        });
    }

    requireReason(template, templateUuid, type, index) {
        let alert = this.alertCtrl.create({
            title: 'Ingrese un motivo',
            cssClass: 'alert-title',
            inputs: [
                {
                    name: 'reason',
                    type: 'text',
                }
            ],
            buttons: [
                {
                    text: 'Continuar',
                    handler: data => {
                        if (data && data.reason.length > 1) {
                            this.chooseFormTypeToInit(
                                template,
                                templateUuid,
                                type,
                                index,
                                data.reason
                            );
                        } else {
                            const alert = this.alertCtrl.create({
                                title: 'Ingrese un motivo',
                                cssClass: 'alert-title',
                                buttons: ['OK']
                            });
                            alert.present();
                            return false;
                        }
                    }
                },
                {
                    text: 'Cancelar',
                    handler: () => { }
                }
            ]
        });
        alert.present();
    }

    requestLocationAuthorization(template, templateUuid, type, index) {
        this.diagnostic.requestLocationAuthorization().then(res => {
            this.geolocationAuth = res;
            this.locationAccuracy.canRequest().then((canRequest: boolean) => {
                if (canRequest) {
                    this.locationAccuracy.request(this.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY).then(
                        () => {
                            this.loading = this.loadingController.create({
                                content: 'Obteniendo ubicación ...',
                            });
                            this.loading.present();
                            this.geolocation.getCurrentPosition({
                                enableHighAccuracy: true,
                                timeout: 12000
                            }).then((res) => {
                                this.loading.dismiss();
                                this.coordinates = {
                                    latitude: res.coords.latitude,
                                    longitude: res.coords.longitude
                                };
                                this.chooseFormTypeToInit(
                                    template,
                                    templateUuid,
                                    type,
                                    index, null);

                            }).catch((error) => {
                                this.loading.dismiss();
                                let alert = this.alertCtrl.create({
                                    title: "Error",
                                    subTitle: "No pudimos acceder a tu ubicación.",
                                    buttons: ["ok"]
                                });
                                alert.present();
                                this.chooseFormTypeToInit(
                                    template,
                                    templateUuid,
                                    type,
                                    index, null);
                            });
                        }).catch(err => {
                            this.geolocationAuth = "DENIED";
                            this.requireReason(
                                template,
                                templateUuid,
                                type,
                                index);
                        });
                } else {
                    this.requireReason(
                        template,
                        templateUuid,
                        type,
                        index);
                }
            }).catch(err => {
                console.log(JSON.stringify(err));
                this.requireReason(
                    template,
                    templateUuid,
                    type,
                    index);
            });

        }).catch(err => {
            console.log(JSON.stringify(err));
            this.chooseFormTypeToInit(
                template,
                templateUuid,
                type,
                index,
                null);
        });
    }

    chooseFormTypeToInit(template, templateUuid, type, index, reason) {
        if (type == "follow_up") {
            this.startFollowUpForm(template, template.data.follow_up, templateUuid, index, reason);
        } else if (type == "initial") {
            let alert = this.alertCtrl.create({
                title: 'Ingrese una identificación',
                cssClass: 'alert-title',
                inputs: [
                    {
                        name: 'identification',
                        placeholder: 'Código, cédula, ..',
                        type: 'text',
                    }
                ],
                buttons: [
                    {
                        text: 'Continuar',
                        handler: data => {
                            if (data && data.identification.length >= 5 && data.identification.length <= 15) {
                                let formUuid = uuid();
                                this.startInitialForm(template, template.data.initial, templateUuid, formUuid, type, index, data.identification, reason);
                            } else {
                                const alert = this.alertCtrl.create({
                                    title: 'Identificación incorrecta!',
                                    cssClass: 'alert-title',
                                    subTitle: 'Debe contener entre 5 a 15 caracteres',
                                    buttons: ['OK']
                                });
                                alert.present();
                                return false;
                            }
                        }
                    },
                    {
                        text: 'Cancelar',
                        handler: () => { }
                    }
                ]
            });
            alert.present();
        } else if (type == "SIMPLE") {
            let formUuid = uuid();
            this.startSimpleForm(template, template.data.simple, templateUuid, formUuid, type, index, reason);
        }
    }

    async startForm(template, type, index) {
        // Genereate an uuid for form
        let templateUuid = template.uuid;
        this.storage.get('infoTemplates').then((templates) => {
            for (let temp of templates) {
                if (temp.uuid == template.uuid) {
                    template = temp;
                    break;
                }
            }
            if (template.gps == "required") {
                this.requestLocationAuthorization(template, templateUuid, type, index);
            } else {
                this.chooseFormTypeToInit(template, templateUuid, type, index, null)
            }
        });
    }
}