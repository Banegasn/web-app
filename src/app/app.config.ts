import {
  ApplicationConfig,
  provideExperimentalZonelessChangeDetection,
  provideZoneChangeDetection
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
  getAuth,
  provideAuth
} from '@angular/fire/auth';
import {
  getAnalytics,
  provideAnalytics,
  ScreenTrackingService,
  UserTrackingService
} from '@angular/fire/analytics';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  provideAppCheck,
  ReCaptchaV3Provider
} from '@angular/fire/app-check';
import {
  getFirestore,
  provideFirestore
} from '@angular/fire/firestore';
import {
  getDatabase,
  provideDatabase
} from '@angular/fire/database';
import {
  getFunctions,
  provideFunctions
} from '@angular/fire/functions';
import {
  getMessaging,
  provideMessaging
} from '@angular/fire/messaging';
import {
  getPerformance,
  providePerformance
} from '@angular/fire/performance';
import {
  getStorage,
  provideStorage
} from '@angular/fire/storage';
import {
  getRemoteConfig,
  provideRemoteConfig
} from '@angular/fire/remote-config';
import {
  getVertexAI,
  provideVertexAI
} from '@angular/fire/vertexai-preview';
import {
  environment
} from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => getAuth()),
    provideAnalytics(() => getAnalytics()),
    ScreenTrackingService,
    UserTrackingService,
    provideAppCheck(() => {
      return initializeAppCheck(undefined, {
        provider: new ReCaptchaV3Provider('6LdqRxkqAAAAAGMz68iASWKbF-WybGZhy7hj6aoS'),
        isTokenAutoRefreshEnabled: true
      });
    }),
    provideFirestore(() => getFirestore()),
    provideDatabase(() => getDatabase()),
    provideFunctions(() => getFunctions()),
    provideMessaging(() => getMessaging()),
    providePerformance(() => getPerformance()),
    provideStorage(() => getStorage()),
    provideRemoteConfig(() => getRemoteConfig()),
    provideVertexAI(() => getVertexAI())
  ]
};