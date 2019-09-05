import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { SplashScreen } from '@ionic-native/splash-screen';
import { StatusBar } from '@ionic-native/status-bar';
import { IonicStorageModule } from '@ionic/storage';
import { SecureStorage, SecureStorageObject } from '@ionic-native/secure-storage';
import { DatePipe } from '@angular/common';
import { File } from '@ionic-native/file';
import { Geolocation } from '@ionic-native/geolocation';
import { HttpClientModule } from '@angular/common/http';
import { HTTP } from '@ionic-native/http';
import { Network } from '@ionic-native/network';
import { LocationAccuracy } from '@ionic-native/location-accuracy';
import { Diagnostic } from '@ionic-native/diagnostic';
import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';
import { FormPage } from '../pages/form/form';
import { FollowUpPage } from '../pages/followUp/followUp';
import { AgregarFormularioPage } from '../pages/agregarFormulario/agregarFormulario';
import { modalEditarFormularioPage } from '../pages/modalEditarFormulario/modalEditarFormulario';
import { AuthPage } from '../pages/auth/auth';
import { PerfilPage } from '../pages/perfil/perfil';
import { SentFormsPage } from '../pages/sentForms/sentForms';
import { FormulariosPage } from '../pages/formularios/formularios';
import { PendingFormsPage } from '../pages/pendingForms/pendingForms';
import { IntelSecurity } from '@ionic-native/intel-security';
import { DatePicker } from '@ionic-native/date-picker';
import { LocalNotifications } from '@ionic-native/local-notifications';

@NgModule({
  declarations: [
    MyApp,
    HomePage,
    FormPage,
    FollowUpPage,
    AgregarFormularioPage,
    modalEditarFormularioPage,
    AuthPage,
    PerfilPage,
    SentFormsPage,
    FormulariosPage,
    PendingFormsPage
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    IonicStorageModule.forRoot(),
    HttpClientModule

    //LongPressModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    FormPage,
    FollowUpPage,
    AgregarFormularioPage,
    modalEditarFormularioPage,
    AuthPage,
    PerfilPage,
    SentFormsPage,
    FormulariosPage,
    PendingFormsPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    HTTP,
    Network,
    SecureStorage,
    LocationAccuracy,
    Diagnostic,
    LocalNotifications,
    File,
    DatePipe,
    Geolocation,
    IntelSecurity,
    DatePicker,
    {provide: ErrorHandler, useClass: IonicErrorHandler}
  ]
})

export class AppModule {}
