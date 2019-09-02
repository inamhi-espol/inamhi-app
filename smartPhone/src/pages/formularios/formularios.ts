import { Component } from '@angular/core';
import { NavController, MenuController, Events ,ViewController,NavParams} from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { SentFormsPage } from '../sentForms/sentForms';
import { PendingFormsPage } from '../pendingForms/pendingForms';
import { HttpClient } from '@angular/common/http';
import { LocationAccuracy } from '@ionic-native/location-accuracy';
import { Diagnostic } from '@ionic-native/diagnostic';

@Component({
    selector: 'page-formularios',
    templateUrl: 'formularios.html'
})

export class FormulariosPage {
    tabSentForms = SentFormsPage;
    tabPendingForms = PendingFormsPage;
    constructor(public navParams:NavParams, public viewCtrl: ViewController, private diagnostic: Diagnostic,
                private locationAccuracy: LocationAccuracy, public httpClient:HttpClient,
                private events: Events, public menuCtrl: MenuController, private storage: Storage,
                public navCtrl: NavController) {}
}
