import { Component, ViewChild, Injector } from '@angular/core';
import { NavController, MenuController, ViewController, NavParams, Events, AlertController, Platform, LoadingController, Navbar } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { Coordinates, Geolocation } from '@ionic-native/geolocation';
import { LocationAccuracy } from '@ionic-native/location-accuracy';
import { Diagnostic } from '@ionic-native/diagnostic';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
    selector: 'page-form',
    templateUrl: 'form.html'
})

export class FormPage {
    template;
    formData;
    formsData = {};
    selectedTemplate;
    currentForm;
    forms;
    pendingForms;
    geolocationAuth;
    coordinates;
    templateUuid;
    funciones = [];
    infoTemplates = [];
    loading;
    reason;
    infoTemplateIndex;
    indexCurrentVersion;
    timerId = null;

    @ViewChild(Navbar) navbarName: Navbar;

    constructor(
        private diagnostic: Diagnostic,
        public alertCtrl: AlertController,
        public navParams: NavParams,
        private events: Events,
        public menuCtrl: MenuController,
        private storage: Storage,
        private geolocation: Geolocation,
        private locationAccuracy: LocationAccuracy,
        public loadingController: LoadingController,
        public navCtrl: NavController,
        public platform: Platform,
        public viewCtrl: ViewController) {

        this.menuCtrl.enable(true);
        this.template = this.navParams.data.template;
        this.formData = this.navParams.data.formData;
        this.selectedTemplate = this.navParams.data.selectedTemplate;
        this.currentForm = this.navParams.data.currentForm;
        this.templateUuid = this.template.uuid;
        this.infoTemplateIndex = this.navParams.data.infoTemplateIndex;
        this.forms = this.navParams.data.forms;
        this.coordinates = null;
        this.reason = this.navParams.data.reason;
        this.indexCurrentVersion = this.navParams.data.indexCurrentVersion;
        if (this.navParams.data.formsData != null) {
            this.formsData = this.navParams.data.formsData;
        } else {
            this.storage.get("formsData").then((formsData) => {
                if (formsData != null && this.indexCurrentVersion != -1) {
                    this.formsData = formsData;
                    for(let form of this.formsData[this.template.uuid]) {
                        if(form.uuid == this.currentForm.uuid) {
                            this.navParams.data.indexCurrentVersion = form.versions.length;
                            this.indexCurrentVersion = form.versions.length;
                        }
                    }
                }
            })
        }
        this.geolocationAuth = this.navParams.data.geolocationAuth;
        this.pendingForms = this.navParams.data.pendingForms;
        this.infoTemplates = this.navParams.data.infoTemplates;
        this.storage.get('calculos').then((calculos) => {
            for (let calc of calculos.calculos) {
                this.funciones[calc.name] = eval('var a;a=' + calc.structure);
            }
        }).catch(error => {
            console.log(JSON.stringify(error, Object.getOwnPropertyNames(error)));
        });
    }

    ionViewDidEnter() {
        this.navbarName.backButtonClick = () => {
            if(this.indexCurrentVersion != -1) {
                var array = Array.from(document.querySelectorAll("ion-datetime, ion-input, ion-list, ion-checkbox, ion-select"));
                var elementos = [];
                var errores = 0;

                for (var el of array) {
                    if (el.id) {
                        elementos.push(el.id);
                    }
                }

                var params = this.mappingParametros(elementos);
                for (var pa of params) {
                    errores += this.validateBlurFunction("", pa.blurFunction);
                }
                if (errores == 0) {
                    this.navCtrl.pop();
                }
            } else {
                this.navCtrl.pop();
            }
        }
        this.restartTimeout();          
    }

    ionViewWillLeave() {
        if(this.indexCurrentVersion != -1) {
            clearTimeout(this.timerId);
        }
    }

    restartTimeout() {
        if(this.indexCurrentVersion != -1) {
            if(this.timerId != null) {
                clearTimeout(this.timerId);
            } 
            this.timerId = setTimeout(() => {
                this.timerId = null;
                if(this.currentForm.versions.length > this.indexCurrentVersion) {
                    this.navParams.data.indexCurrentVersion = this.navParams.data.indexCurrentVersion + 1;
                    this.indexCurrentVersion = this.navParams.data.indexCurrentVersion + 1;
                }
            }, 600000);
        }
    }  

    increase_edition_quantity(template, formType, index) {
        if (formType == "SIMPLE") {
            template.edition_quantity += 1;
        } else {
            for (let type of template.quantity) {
                if (type.type == formType)
                    type.edition_quantity += 1;
            }
        }
        this.infoTemplates[index] = this.template;
        this.storage.set('infoTemplates', this.infoTemplates);
    }   

    decrease_remain_quantity(template, formType, index) {
        if (formType == "SIMPLE") {
            template.remain_quantity -= 1;
        } else {
            for (let type of template.quantity) {
                if (type.type == formType)
                    type.remain_quantity -= 1;
            }
        }
        this.infoTemplates[index] = this.template;
        this.storage.set('infoTemplates', this.infoTemplates);
    }

    //index: indice del formulario que estoy haciendo
    save(index, pending_form_index) {
        let formD = JSON.parse(JSON.stringify(this.formData));
        this.geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 12000
        }).then((res) => {
            this.geolocationAuth = "GRANTED";
            this.coordinates = {
                latitude: res.coords.latitude,
                longitude: res.coords.longitude
            };
            this.saveCoordinates(formD, this.coordinates, index, pending_form_index);
        }).catch((error) => {
            console.log(JSON.stringify(error, Object.getOwnPropertyNames(error)));
            this.saveCoordinates(formD, null, index, pending_form_index);
        });
    }

    async saveForm() {
        if(this.indexCurrentVersion != -1) {
            let formsDataIsNull = this.formsData == null;
            let formDataExists = (this.formsData != null &&
                this.formsData.hasOwnProperty(this.templateUuid));
            let currentFormExists = false;
            let pending_form_index = this.pendingForms.length - 1;
            if (formsDataIsNull || !formDataExists) {
                this.decrease_remain_quantity(this.template,
                    this.currentForm.type,
                    this.infoTemplateIndex);
                this.increase_edition_quantity(this.template,
                    this.currentForm.type,
                    this.infoTemplateIndex);
                this.save(this.forms.length - 1, pending_form_index);
            } else {
                let index = 0;
                for (let form of this.formsData[this.templateUuid]) {
                    if (form.uuid == this.currentForm.uuid) {
                        currentFormExists = true;
                        break;
                    } else {
                        index += 1;
                    }
                }
                pending_form_index = 0;
                for (let pendingForm of this.pendingForms) {
                    if (pendingForm.formData.uuid == this.currentForm.uuid) {
                        break;
                    } else {
                        pending_form_index += 1;
                    }
                }

                if (!currentFormExists) {
                    //CREATE
                    this.storage.set("pendingForms", this.pendingForms);
                    this.decrease_remain_quantity(this.template,
                        this.currentForm.type,
                        this.infoTemplateIndex);
                    this.increase_edition_quantity(this.template,
                        this.currentForm.type,
                        this.infoTemplateIndex);
                    this.save(this.forms.length - 1, pending_form_index);
                } else {
                    //EDIT
                    this.save(index, pending_form_index);
                }
            }
        }
    }

    saveCoordinates(formD, coordinates, index, pending_form_index) {
        if(this.currentForm.versions.length == 0 || this.indexCurrentVersion>(this.currentForm.versions.length - 1)) {
            let currentVersion = {};
            let ver = this.currentForm.versions.length + 1;
            let fecha = new Date();
            currentVersion = {
                saveDate: fecha,
                version: ver,
                data: formD,
                coordinates: coordinates,
                reason: this.reason
            };
            this.currentForm.versions.push(currentVersion);
        } else {
            this.currentForm.versions[this.indexCurrentVersion].saveDate = new Date();
            this.currentForm.versions[this.indexCurrentVersion].data = formD;
            this.currentForm.versions[this.indexCurrentVersion].coordinates = coordinates;
            this.currentForm.versions[this.indexCurrentVersion].reason = this.reason;
        }        
        this.forms[index] = this.currentForm;
        this.formsData[this.templateUuid] = this.forms;
        this.storage.set("formsData", this.formsData);
        this.pendingForms[pending_form_index].formData = this.currentForm;
        this.storage.set("pendingForms", this.pendingForms);
    }

    mappingParametros(parameters) {
        let parametrosMapeados = [];
        for (let i = 0; i < parameters.length; i++) {
            parametrosMapeados.push(this.getObjects(this.formData, 'id', parameters[i])[0]);
        }
        return parametrosMapeados;
    }

    construirFuncionDinamicaString(stringFuncion, stringParametros, lengthParametros) {
        let funcionString = stringFuncion + '(';
        for (let i = 0; i < lengthParametros; i++) {
            if (i == lengthParametros - 1) {
                funcionString = `${funcionString}${stringParametros}[${i}])`;
            }
            else {
                funcionString = `${funcionString}${stringParametros}[${i}],`;
            }
        }
        return funcionString;
    }

    triggerFunction(functionName) {
        try {
            let funcion = this.funciones[functionName];
            let args = this.getArgs(funcion);
            let parametrosMapeados = this.mappingParametros(args);
            let stringFuncionMapeada = this.construirFuncionDinamicaString('funcion', 'parametrosMapeados', parametrosMapeados.length);
            eval(stringFuncionMapeada);
        }
        catch (err) {
            console.log(JSON.stringify(err, Object.getOwnPropertyNames(err)));
            let alert = this.alertCtrl.create({
                title: "Error",
                subTitle: "La funcion de calculo tiene un error interno",
                buttons: ["ok"]
            });
            alert.present();
        }
    }

    getObjects(obj, key, val) {
        var objects = [];
        for (var i in obj) {
            if (!obj.hasOwnProperty(i)) continue;
            if (typeof obj[i] == 'object') {
                objects = objects.concat(this.getObjects(obj[i], key, val));
            } else
                //if key matches and value matches or if key matches and
                //value is not passed (eliminating the case where key
                // matches but passed value does not)
                if (i == key && obj[i] == val || i == key && val == '') { //
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

    triggerFunctionValidation(nombre_funcion, args) {
        try {
            let funcion = this.funciones[nombre_funcion];
            let parametrosMapeados = this.mappingParametros(args);
            let stringFuncionMapeada = this.construirFuncionDinamicaString('funcion', 'parametrosMapeados', parametrosMapeados.length);
            var valor = eval(stringFuncionMapeada);
            return valor;
        }
        catch (err) {
            console.log(JSON.stringify(err, Object.getOwnPropertyNames(err)));
            let alert = this.alertCtrl.create({
                title: "Error",
                subTitle: "La funcion de calculo tiene un error interno",
                buttons: ["ok"]
            });
            alert.present();
        }
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

    clickCollapseButton(index, id, $event) {
        let buttonElement = $event.currentTarget;
        let collapse = document.getElementById(id);
        if (collapse.getAttribute('class') == "collapse") {
            buttonElement.getElementsByTagName('ion-icon')[0].setAttribute('class', 'icon icon-md ion-md-arrow-dropdown item-icon');
        } else if (collapse.getAttribute('class') == "collapse show") {
            buttonElement.getElementsByTagName('ion-icon')[0].setAttribute('class', 'icon icon-md ion-md-arrow-dropright item-icon');
        }
    }

    clickNextPage(item2) {
        let param = this.navParams.data;
        param.selectedTemplate = item2;
        //param.indexCurrentVersion = this.indexCurrentVersion;
        this.navCtrl.push(FormPage, param);
    }

    keyupFunction($event, functionName) {
        if (functionName) {
            this.triggerFunction(functionName);
        }
        this.saveForm();
    }

    validateBlurFunction($event, functionName) {
        var valores = 0;
        if (functionName != '') {
            let funcion = JSON.parse(functionName);
            for (let key in funcion) {
                let value = funcion[key];
                valores += this.triggerFunctionValidation(key, value); //KEY: NOMBRE DE LA FUNCIÓN, VALUE: LISTA DE ARGUMENTOS
            }
        }
        return valores;
    }

    blurFunction($event, functionName) {
        if(this.indexCurrentVersion != -1) {
            var valores = this.validateBlurFunction($event,functionName);
            return valores;
        }
        return 0;
    }

    clickFunction($event, functionName) {
        if(this.indexCurrentVersion != -1) {
            if (functionName) {
                this.triggerFunction(functionName);
            }
            this.saveForm();
        }
    }

    readOnly() {
        if(this.indexCurrentVersion == -1) {
            return 1;
        }
        return 0;
    }

}