import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import {drizzle} from "drizzle-orm/sqlite-proxy";
import {db} from "./app/core/database/database";
// import {initDatabase} from "./app/core/database/database";

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});


let database: ReturnType<typeof drizzle> = db;

// (async () => {
//   database = await initDatabase();
//   console.log('inicializar');
// })();
//
export {database};
//
// export type Tx = Parameters<Parameters<typeof database.transaction>[0]>[0];
