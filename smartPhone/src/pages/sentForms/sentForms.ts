import { Component } from '@angular/core';
import { NavController, NavParams, Events, AlertController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { DatePipe } from '@angular/common';
import { FormPage } from '../form/form';

@Component({
    selector: 'page-sentForms',
    templateUrl: 'sentForms.html'
})

export class SentFormsPage {
    sentForms = [];
    arreglo = [];
    deletingSentForms = false;
    formsData;

    constructor(public alertCtrl: AlertController,
        private events: Events,
        private datePipe: DatePipe,
        private storage: Storage,
        public navCtrl: NavController,
        public navParams: NavParams) {
        this.arreglo['f2'] = new Function("a", "b", "return a * b");
        this.arreglo['f3'] = function(a, b) { return a * b };
        this.arreglo['f4'] = function calcular(a, b) { return a * b };
        this.getSentForms();
        this.events.subscribe('app:envioFormularios', (status) => {
            if (!status) {
                this.getSentForms();
            }
        });

        this.storage.get('formsData').then((formsData) => {
            this.formsData = formsData;
        });
    }

    getSentForms() {
        this.storage.get('sentForms').then((sentForms) => {
            if (sentForms) {
                this.sentForms = sentForms;
            }
        });
    }

    getArgs(func) {
        // First match everything inside the function argument parens.
        var args = func.toString().match(/function\s.*?\(([^)]*)\)/)[1];
        // Split the arguments string into an array comma delimited.
        return args.split(',').map(function(arg) {
            // Ensure no inline comments are parsed and trim the whitespace.
            return arg.replace(/\/\*.*\*\//, '').trim();
        }).filter(function(arg) {
            // Ensure no undefined values are added.
            return arg;
        });
    }

    clickDeleteSentForm(index) {
        this.sentForms.splice(index, 1);
        this.storage.set("sentForms", this.sentForms);
    }

    deleteSentForms() {
        this.deletingSentForms = true;
        this.sentForms = []
        this.storage.set("sentForms", this.sentForms);
        this.deletingSentForms = false;
    }

    clickDeleteSentForms() {
        const confirm = this.alertCtrl.create({
            message: '¿Seguro que quieres eliminar tus formularios enviados?',
            buttons: [
                {
                    text: 'Eliminar',
                    handler: () => {
                        this.deleteSentForms();
                    }
                },
                {
                    text: 'Cancelar',
                    handler: () => { }
                }
            ]
        });
        confirm.present();
    }

    clickCollapseButton(index, collapseId, $event) {
        let buttonElement = $event.currentTarget;
        let element = document.getElementById(collapseId);
        if (element.getAttribute('class') == "collapse") {
            buttonElement.getElementsByTagName('ion-icon')[0].setAttribute('class', 'icon icon-md ion-md-arrow-dropdown item-icon');
        } else if (element.getAttribute('class') == "collapse show") {
            buttonElement.getElementsByTagName('ion-icon')[0].setAttribute('class', 'icon icon-md ion-md-arrow-dropright item-icon');
        }
    }

    clickSeeForm(templateUuid, formUuid) {
        this.storage.get("infoTemplates").then((infoTemplates) => {
            let template, selectedTemplate, currentForm;
            for(let forminfo of infoTemplates) {
                if(forminfo.uuid == templateUuid) {
                    template = forminfo;
                    break;
                }
            }    

            let forms = this.formsData[templateUuid];
            for (let form of forms){
                if(form.uuid == formUuid){
                    currentForm = form;
                    break;
                }
            }       

            template.data = JSON.parse(JSON.stringify(currentForm.versions[currentForm.versions.length - 1].data));
            selectedTemplate = JSON.parse(JSON.stringify(currentForm.versions[currentForm.versions.length - 1].data));

            this.navCtrl.push(FormPage, {
                template: template,
                selectedTemplate: selectedTemplate,
                formData: null,
                currentForm: null,
                forms: null,
                formsData: null,
                pendingForms: null,
                geolocationAuth: null,
                infoTemplates: null,
                infoTemplateIndex: null,
                coordinates: null,
                reason: null,
                indexCurrentVersion: -1
            });
        })
    }

}