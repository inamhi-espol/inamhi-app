import { Component, ViewChild, Injector } from '@angular/core';
import { NavController, MenuController, ViewController, NavParams, Events, AlertController, Platform, LoadingController, Navbar, PopoverController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { Coordinates, Geolocation } from '@ionic-native/geolocation';
import { LocationAccuracy } from '@ionic-native/location-accuracy';
import { Diagnostic } from '@ionic-native/diagnostic';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { PopoverPage } from './popover';
import { PopoverPage2 } from './popover2';

@Component({
    selector: 'page-form',
    templateUrl: 'form.html'
})
export class FormPage extends PopoverPage {
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
    infoTemplateIndex;

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
        public popoverCtrl: PopoverController,
        public viewCtrl: ViewController) {
        super(viewCtrl);

        this.menuCtrl.enable(true);
        this.template = this.navParams.data.template;
        this.formData = this.navParams.data.formData;
        this.selectedTemplate = this.navParams.data.selectedTemplate;
        this.currentForm = this.navParams.data.currentForm;
        this.templateUuid = this.template.uuid;
        this.infoTemplateIndex = this.navParams.data.infoTemplateIndex;
        this.forms = this.navParams.data.forms;
        if (this.navParams.data.formsData != null) {
            this.formsData = this.navParams.data.formsData;
        } else {
            this.storage.get("formsData").then((formsData) => {
                if (formsData != null) {
                    this.formsData = formsData;
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
        }
    }

    increase_done_quantity(template, formType, index) {
        if (formType == "SIMPLE") {
            template.done_quantity += 1;
        } else {
            for (let type of template.quantity) {
                if (type.type == formType)
                    type.done_quantity += 1;
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

    verPorciones(evento) {
        let popover = this.popoverCtrl.create(PopoverPage);
        popover.present({
            ev: evento
        });
    }

    verDeposiciones(evento) {
        let popover = this.popoverCtrl.create(PopoverPage2);
        popover.present({
            ev: evento
        });
    }

    save(index, pending_form_index) {
        this.currentForm.saveDate = new Date();
        this.currentForm.data = this.formData;
        this.forms[index] = this.currentForm;
        this.formsData[this.templateUuid] = this.forms;
        this.storage.set("formsData", this.formsData);
        this.pendingForms[pending_form_index].formData = this.currentForm;
        this.storage.set("pendingForms", this.pendingForms);
    }

    async saveForm() {
        let formsDataIsNull = this.formsData == null;
        let formDataExists = (this.formsData != null &&
            this.formsData.hasOwnProperty(this.templateUuid));
        let currentFormExists = false;
        let pending_form_index = this.pendingForms.length - 1;
        if (formsDataIsNull || !formDataExists) {
            this.decrease_remain_quantity(this.template,
                this.currentForm.type,
                this.infoTemplateIndex);
            this.increase_done_quantity(this.template,
                this.currentForm.type,
                this.infoTemplateIndex);
            this.save(this.forms.length - 1, pending_form_index);
        }
        else {
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
                this.increase_done_quantity(this.template,
                    this.currentForm.type,
                    this.infoTemplateIndex);
                this.save(this.forms.length - 1, pending_form_index);
            } else {
                //EDIT
                this.save(index, pending_form_index);
            }
        }



    }

    editForm(index) {
        this.currentForm.data = this.formData;
        this.forms[index] = this.currentForm;
        this.storage.set(this.templateUuid, this.forms);
    }

    saveCoordinates() {
        this.currentForm.coordinates = this.coordinates;
        let index = this.forms.length - 1;
        this.forms[index] = this.currentForm;
        this.formsData[this.templateUuid] = this.forms;
        this.storage.set("formsData", this.formsData);

        this.pendingForms[this.pendingForms.length - 1].formData = this.currentForm;
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
            console.log(err.message);
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
        var valores = this.validateBlurFunction($event,functionName);
        this.saveForm();
        return valores;
    }

    clickFunction($event, functionName) {
        if (functionName) {
            this.triggerFunction(functionName);
        }
        this.saveForm();
    }

    requestLocationAuthorization() {
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
                                this.geolocationAuth = "GRANTED";
                                this.loading.dismiss();
                                this.coordinates = {
                                    latitude: res.coords.latitude,
                                    longitude: res.coords.longitude
                                };
                                this.saveCoordinates();

                            }).catch((error) => {
                                this.loading.dismiss();
                                console.log(JSON.stringify(error, Object.getOwnPropertyNames(error)));
                                let alert = this.alertCtrl.create({
                                    title: "Error",
                                    subTitle: "No pudimos acceder a tu ubicación.",
                                    buttons: ["ok"]
                                });
                                alert.present();
                            });
                        }).catch(err => {
                            this.geolocationAuth = "DENIED";
                            console.log(JSON.stringify(err, Object.getOwnPropertyNames(err)));
                        }).catch(err => {
                            console.log(JSON.stringify(err, Object.getOwnPropertyNames(err)));
                        });
                }
            }).catch(err => {
                console.log(JSON.stringify(err, Object.getOwnPropertyNames(err)));
            });
        });

    }
}