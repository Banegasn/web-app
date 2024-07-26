import {
  ApplicationConfig,
  provideExperimentalZonelessChangeDetection
} from '@angular/core';
import {
  provideRouter
} from '@angular/router';
import {
  routes
} from './app.routes';
import {
  provideClientHydration
} from '@angular/platform-browser';
import {
  initializeApp,
  provideFirebaseApp
} from '@angular/fire/app';
import {
  environment
} from '../environments/environment';


export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig))
  ]
};