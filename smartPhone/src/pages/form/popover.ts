import { ViewController } from 'ionic-angular';
import { Component, Injector } from '@angular/core';

@Component({
    templateUrl: 'popover.html'
})

export class PopoverPage {
    constructor(public viewCtrl: ViewController) {}

    close() {
        this.viewCtrl.dismiss();
    }
}