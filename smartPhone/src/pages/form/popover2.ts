import { ViewController } from 'ionic-angular';
import { Component, Injector } from '@angular/core';

@Component({
    templateUrl: 'popover2.html'
})

export class PopoverPage2 {
    constructor(public viewCtrl: ViewController) {}

    close() {
        this.viewCtrl.dismiss();
    }
}