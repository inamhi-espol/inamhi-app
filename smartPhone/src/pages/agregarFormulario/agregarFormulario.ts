import { Component } from '@angular/core';
import { NavController, MenuController, Events ,ViewController,NavParams} from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { HttpClient } from '@angular/common/http';
import { LocationAccuracy } from '@ionic-native/location-accuracy';
import { Diagnostic } from '@ionic-native/diagnostic';

@Component({
    selector: 'page-agregarFormulario',
    templateUrl: 'agregarFormulario.html'
})

export class AgregarFormularioPage {
    formUserData = {};
    formularios = [];
    formularioExiste = false;
    constructor(public navParams:NavParams, public viewCtrl: ViewController, private diagnostic: Diagnostic,
                private locationAccuracy: LocationAccuracy, public httpClient:HttpClient, private events: Events,
                public menuCtrl: MenuController, private storage: Storage, public navCtrl: NavController) {
        this.formularios = this.navParams.data.formularios;
        console.log(this.formularios);
    }

    closeModal() {
        this.viewCtrl.dismiss();
    }

    changeSelect() {
        console.log(this.formUserData);
    }

    getObjects(obj, key, val) {
        var objects = [];
        for(var i in obj) {
            if(!obj.hasOwnProperty(i)) continue;
            if(typeof obj[i] == 'object') {
                objects = objects.concat(this.getObjects(obj[i], key, val));
            } else
            //if key matches and value matches or if key matches and value is not passed (eliminating the case where key matches but passed value does not)
            if(i == key && obj[i] == val || i == key && val == '') { //
                objects.push(obj);
            } else if(obj[i] == val && key == '') {
                //only add if the object is not already in the array
                if(objects.lastIndexOf(obj) == -1) {
                    objects.push(obj);
                }
            }
        }
        return objects;
    }

    changeInputNombreFormulario($event) {
        if(this.formUserData['formName'] != '') {
            let result = null;
            result = this.getObjects(this.formularios, 'nombre', this.formUserData['formName']);
            if(result.length > 0) {
                this.formularioExiste = true;
            } else {
                this.formularioExiste = false;
                //$event.currentTarget.setAttribute('class', 'errorInputFormularioExiste');
            }
        }
    }

    crearFormulario() {
        console.log(this.formUserData['formDescription']);
        this.formularios.push({
            nombre:this.formUserData['formName'],
            plantilla:this.formUserData['formTemplate'],
            descripcion:this.formUserData['formDescription']
        });
        this.viewCtrl.dismiss();
    }
}
