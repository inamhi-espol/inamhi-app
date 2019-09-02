import { Component } from '@angular/core';
import { NavController, MenuController, NavParams, Events, AlertController, Platform } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { DatePipe } from '@angular/common';
import uuid from 'uuid/v4';

import { HttpClient } from '@angular/common/http';
import { LocationAccuracy } from '@ionic-native/location-accuracy';
import { Diagnostic } from '@ionic-native/diagnostic';
import { FormPage } from '../form/form'

@Component({
    selector: 'page-followUp',
    templateUrl: 'followUp.html'
})

export class FollowUpPage {
    template;
    selectedTemplate;
    initialForms;
    index;
    geolocationAuth;
    formsData;
    coordinates;
    reason;
    infoTemplates = [];
    pendingForms = [];
    infoTemplateIndex;
    constructor(private diagnostic: Diagnostic,
        private events: Events,
        public navParams: NavParams,
        public menuCtrl: MenuController,
        private storage: Storage,
        public navCtrl: NavController) {

        this.menuCtrl.enable(true);
        this.storage.get('infoTemplates').then((templates) => {
            this.infoTemplates = templates;
        });

        this.initialForms = this.navParams.data.forms;
        this.template = this.navParams.data.template;
        this.coordinates = this.navParams.data.coordinates;
        this.selectedTemplate = this.navParams.data.selectedTemplate;
        this.formsData = this.navParams.data.formsData;
        this.geolocationAuth = this.navParams.data.geolocationAuth;
        this.infoTemplateIndex = this.navParams.data.infoTemplateIndex;
        this.infoTemplates = this.navParams.data.infoTemplates;
        this.reason = this.navParams.data.reason;
    }


    async selectInterviewedClick(form) {
        // Genereate an uuid for form
        this.pendingForms = await this.storage.get('pendingForms');
        let templateUuid = this.template.uuid;
        let formUuid = uuid();
        let code_form = form.code
        let currentForm = {
            uuid: formUuid,
            code: code_form,
            reason: this.reason,
            version: 0,
            name: this.template.name,
            gps: this.template.gps,
            data: {},
            type: "follow_up",
            createdDate: new Date()
        };
        if (this.template.gps == "required") {
            currentForm["coordinates"] = this.coordinates;
        }
        // let forms = Object.assign([], this.initialForms);
        let forms = this.formsData[templateUuid].slice(0);
        forms.push(currentForm);
        var pendingForms = []
        if (this.pendingForms != null && (this.pendingForms.length > 0)) {
            pendingForms = this.pendingForms.slice(0);
            pendingForms.push({
                template: templateUuid,
                setId: this.template.set_id,
                formData: currentForm,
                index: this.formsData[templateUuid].length - 1
            });
        } else {
            pendingForms = [{
                template: templateUuid,
                setId: this.template.set_id,
                formData: currentForm,
                index: 0
            }];
        }
        let templates = await this.storage.get('infoTemplates');
        for (let temp of templates){
          if (temp.uuid == templateUuid){
            this.infoTemplates = this.infoTemplates;
            this.selectedTemplate = temp.data.follow_up;
            break;
          }
        }
        this.navCtrl.push(FormPage, {
            template: this.template,
            selectedTemplate: this.selectedTemplate,
            formData: this.selectedTemplate,
            currentForm: currentForm,
            forms: forms,
            formsData: this.formsData,
            pendingForms: pendingForms,
            geolocationAuth: this.geolocationAuth,
            infoTemplates: this.infoTemplates,
            infoTemplateIndex: this.infoTemplateIndex,

        });
    }
}
