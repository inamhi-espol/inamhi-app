import { Component, ViewChild } from '@angular/core';
import { NavController, NavParams, Events, AlertController, LoadingController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormPage } from '../form/form';
import { Diagnostic } from '@ionic-native/diagnostic';
import { Coordinates, Geolocation } from '@ionic-native/geolocation';
import { LocationAccuracy } from '@ionic-native/location-accuracy';

@Component({
    selector: 'page-pendingForms',
    templateUrl: 'pendingForms.html'
})

export class PendingFormsPage {
    comprobandoPendientes = true;
    sendingForms = false;
    infoTemplates;
    formsData;
    geolocationAuth;
    loading;
    pendingForms = [];
    coordinates = null;
    reason = null;
    indexCurrentVersion;

    constructor(public alertCtrl: AlertController, public httpClient: HttpClient, private events: Events,
        private datePipe: DatePipe, private storage: Storage, public navCtrl: NavController,
        public navParams: NavParams, private diagnostic: Diagnostic, private locationAccuracy: LocationAccuracy,
        private geolocation: Geolocation, public loadingController: LoadingController) {
    }

    getPendingForms() {
        this.storage.get("pendingForms").then((pendingForms) => {
            if (pendingForms != null && (pendingForms.length > 0)) {
                for (let pendingForm of pendingForms) {
                    let bugs = this.getValues(pendingForm.formData.data, 'error');
                    let empty_values = this.getValues(pendingForm.formData.data, 'value');
                    let countErr = 0;
                    let countEmpty = 0;
                    for (let i = 0; i < bugs.length; i++) {
                        if (bugs[i] != '') {
                            countErr = countErr + 1;
                        }
                    }
                    for (let i = 0; i < empty_values.length; i++) {
                        if (empty_values[i] == '') {
                            countEmpty = countEmpty + 1;
                        }
                    }
                    pendingForm.formData["vacios"] = countEmpty;
                    pendingForm.formData["errores"] = countErr;
                    this.pendingForms = pendingForms;
                    this.storage.set("pendingForms", this.pendingForms);
                }
            }
        }).then(res => {
            this.comprobandoPendientes = false;
        });
        this.events.subscribe('app:envioFormularios', (status) => {
            this.sendingForms = status;
        });
    }

    ionViewWillEnter() {
      this.getPendingForms();
      this.events.subscribe('app:envioFormularios', (status) => {
          if (!status) {
              this.getPendingForms();
          }
      });
      this.storage.get('infoTemplates').then((infoTemplates) => {
          this.infoTemplates = infoTemplates;
      });
      this.storage.get("formsData").then((formsData) => {
          this.formsData = formsData;
      });
    }

    decrease_edition_quantity(template, formType) {
        if (formType == "SIMPLE") {
            template.edition_quantity -= 1;
        }
        else {
            for (let type of template.quantity) {
                if (type.type == formType)
                    type.edition_quantity -= 1;
            }
        }
        this.storage.set('infoTemplates', this.infoTemplates);
    }


    increase_remain_quantity(template, formType) {
        if (formType == "SIMPLE") {
            template.remain_quantity += 1;
        }
        else {
            for (let type of template.quantity) {
                if (type.type == formType)
                    type.remain_quantity += 1;
            }
        }
        this.storage.set('infoTemplates', this.infoTemplates);
    }

    clickEditarFormulario(form) {
        console.log(form);
        // this.events.publish('pendingForms:editarFormulario', fechaFormulario);
    }

    clickDeletePendingForm(form, index) {
        var templateUuid = form.template;
        var formIndex = form.index;
        this.formsData[templateUuid].splice(formIndex, 1);
        this.pendingForms.splice(index, 1);
        if (this.formsData[templateUuid].length == 0) {
            delete this.formsData[templateUuid];
        }
        this.storage.set("formsData", this.formsData);
        this.storage.set("pendingForms", this.pendingForms);
        for (let template of this.infoTemplates) {
            if (template.uuid == templateUuid) {
                this.decrease_edition_quantity(template, form.formData.type);
                this.increase_remain_quantity(template, form.formData.type);
            }
        }
    }

    clickSendForms() {
        const confirm = this.alertCtrl.create({
            title: '¿Seguro que quieres enviar tus formularios?',
            message: 'Al enviarlos al servidor ya no podrás acceder a ellos',
            buttons: [
                {
                    text: 'Enviar',
                    handler: () => {
                        this.events.publish('pendingForms:enviarFormularios', this.pendingForms);
                    }
                },
                {
                    text: 'Cancelar',
                    handler: () => {
                        console.log('Cancelar');
                    }
                }
            ]
        });
        confirm.present();
    }

    getObjects(obj, key, val) {
        var objects = [];
        for (var i in obj) {
            if (!obj.hasOwnProperty(i)) continue;
            if (typeof obj[i] == 'object') {
                objects = objects.concat(this.getObjects(obj[i], key, val));
                //if key matches and value matches or if key matches and value is not passed (eliminating the case where key matches but passed value does not)
            } else if (i == key && obj[i] == val || i == key && val == '') { //
                objects.push(obj);
            } else if (obj[i] == val && key == '') {
                //only add if the object is not already in the array
                if (objects.lastIndexOf(obj) == -1) {
                    objects.push(obj);
                }
            }
        }
        return objects;
    }

    getValues(obj, key) {
        var objects = [];
        for (var i in obj) {
            if (!obj.hasOwnProperty(i)) continue;
            if (typeof obj[i] == 'object') {
                objects = objects.concat(this.getValues(obj[i], key));
            } else if (i == key) {
                objects.push(obj[i]);
            }
        }
        return objects;
    }

    async clickEditForm(i) {
        try{
            let pendingForms = await this.storage.get("pendingForms");
            let pendingForm = pendingForms[i];
            let currentF = pendingForm.formData;
            let templateUuid = pendingForm.template;
            let version = currentF.versions.length;
            let template;
            let selectedTemplate;
            let infoTemplateIndex;
            let formsData = await this.storage.get("formsData");
            let forms = formsData[templateUuid];
            let currentForm;
            for (let form of forms){
              if(form.uuid == currentF.uuid){
                currentForm = form;
                break;
              }
            }
            let infoTemplates = await this.storage.get("infoTemplates");
            for (let k = 0; k < infoTemplates.length; k++) {
                let temp = infoTemplates[k];
                if (temp.uuid == templateUuid) {
                    template = temp;
                    infoTemplateIndex = k;
                    break;
                }
            }
            template.data = JSON.parse(JSON.stringify(currentForm.versions[currentForm.versions.length - 1].data));
            selectedTemplate = JSON.parse(JSON.stringify(currentForm.versions[currentForm.versions.length - 1].data)); 

            this.requestLocationAuthorization(template, templateUuid);
            if (template.gps == "required") {
                this.navCtrl.push(FormPage, {
                    template: template,
                    selectedTemplate: selectedTemplate,
                    formData: selectedTemplate,
                    currentForm: currentForm,
                    forms: forms,
                    formsData: formsData,
                    pendingForms: pendingForms,
                    geolocationAuth: "GRANTED",
                    infoTemplates: infoTemplates,
                    infoTemplateIndex: infoTemplateIndex,
                    coordinates: this.coordinates,
                    reason: this.reason,
                    indexCurrentVersion: version
                });
            } else {
                this.navCtrl.push(FormPage, {
                    template: template,
                    selectedTemplate: selectedTemplate,
                    formData: selectedTemplate,
                    currentForm: currentForm,
                    forms: forms,
                    formsData: formsData,
                    pendingForms: pendingForms,
                    geolocationAuth: "GRANTED",
                    infoTemplates: infoTemplates,
                    infoTemplateIndex: infoTemplateIndex,
                    indexCurrentVersion: version
                });
            }
        }catch (err) {
            console.log(JSON.stringify(err, Object.getOwnPropertyNames(err)));
        }
    }

    requestLocationAuthorization(template, templateUuid) {
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
                                //IR A LA EDICION DE FORMULARIO
                            }).catch((error) => {
                                this.loading.dismiss();
                                let alert = this.alertCtrl.create({
                                    title: "Error",
                                    subTitle: "No pudimos acceder a tu ubicación.",
                                    buttons: ["ok"]
                                });
                                //IR A LA EDICION DE FORMULARIO
                            });
                        }).catch(err => {
                            this.geolocationAuth = "DENIED";
                            this.requireReason();
                        });
                } else {
                    this.requireReason();
                }
            }).catch(err => {
                console.log(JSON.stringify(err));
                this.requireReason();
            });
        }).catch(err => {
            console.log(JSON.stringify(err));
        });
    }

    requireReason() {
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
                            //GUARDAR EL MOTIVO Y ABRIR LA EDICIÓN DEL FORMULARIO
                            this.reason = data.reason;
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

}