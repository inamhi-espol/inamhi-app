import { Component, ViewChild } from '@angular/core';
import { NavController, NavParams, Events, AlertController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormPage } from '../form/form';

@Component({
    selector: 'page-pendingForms',
    templateUrl: 'pendingForms.html'
})

export class PendingFormsPage {
    comprobandoPendientes = true;
    sendingForms = false;
    infoTemplates;
    formsData;
    pendingForms = [];

    constructor(public alertCtrl: AlertController, public httpClient: HttpClient, private events: Events,
        private datePipe: DatePipe, private storage: Storage, public navCtrl: NavController,
        public navParams: NavParams) {
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

    decrease_done_quantity(template, formType) {
        if (formType == "SIMPLE") {
            template.done_quantity -= 1;
        }
        else {
            for (let type of template.quantity) {
                if (type.type == formType)
                    type.done_quantity -= 1;
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
                this.decrease_done_quantity(template, form.formData.type);
                this.increase_remain_quantity(template, form.formData.type);
            }
        }
    }

    clickSendForms() {
        const confirm = this.alertCtrl.create({
            title: 'Seguro que quieres enviar tus formularios?',
            message: 'Al enviarlas ya no podras acceder a ellas',
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
        let pendingForms = await this.storage.get("pendingForms");
        let pendingForm = pendingForms[i];
        let currentF = pendingForm.formData;
        let templateUuid = pendingForm.template;
        let version = currentF.version;
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
        for (let i = 0; i < infoTemplates.length; i++) {
            let temp = infoTemplates[i];
            if (temp.uuid == templateUuid) {
                template = temp;
                infoTemplateIndex = i;
                break;
            }
        }
        currentForm.version = version + 1;
        this.navCtrl.push(FormPage, {
            template: template,
            selectedTemplate: currentForm.data,
            formData: currentForm.data,
            currentForm: currentForm,
            forms: forms,
            formsData: formsData,
            pendingForms: pendingForms,
            geolocationAuth: "GRANTED",
            infoTemplates: infoTemplates,
            infoTemplateIndex: infoTemplateIndex
        });
    }
}
