import { Component } from '@angular/core';
import { SentFormsPage } from '../sentForms/sentForms';
import { Coordinates,Geolocation } from '@ionic-native/geolocation';
import { NavController , NavParams, AlertController } from 'ionic-angular';
import { Storage } from '@ionic/storage';

@Component({
    selector: 'page-perfil',
    templateUrl: 'perfil.html'
})

export class PerfilPage {
    sentForms;
    pendingForms;
    instalationDate;
    user;

    constructor(private geolocation: Geolocation, private storage: Storage, public navCtrl: NavController,
                public navParams:NavParams, public alertCtrl: AlertController) {
        this.storage.get('linkedUser').then((val) => {
            if(val) {
                this.user = val
            } else {
                console.log('(auth) final then get storage vinculado');
            }
        });

        this.storage.get('sentForms').then((val) => {
          if(val!=null){
            this.sentForms = val.length;
          }else{
            this.sentForms = 0;
          }
        });

        this.storage.get('pendingForms').then((val) => {
          if(val != null){
            this.pendingForms = val.length;
          }else{
            this.pendingForms = 0;
          }
        });

        this.storage.get('fechaInstalacion').then(data => {
            this.instalationDate = data;
        });
    }

    ionViewDidEnter() {}
}
