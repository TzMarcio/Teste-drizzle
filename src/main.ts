import {bootstrapApplication,  } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import {drizzle} from "drizzle-orm/sqlite-proxy";
import {driver} from "./app/core/database/database";
import { defineCustomElements as jeepSqlite} from 'jeep-sqlite/loader';

bootstrapApplication(AppComponent, {
  providers: [
    {provide: RouteReuseStrategy, useClass: IonicRouteStrategy},
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});



(async () => {
  driver.init().then(() => console.log("database initialized"));
  console.log('inicializar');
})();

//
// export type Tx = Parameters<Parameters<typeof database.transaction>[0]>[0];
