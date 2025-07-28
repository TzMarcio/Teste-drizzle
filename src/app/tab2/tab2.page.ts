import {Component, OnInit} from '@angular/core';
import {IonContent, IonHeader, IonTitle, IonToolbar} from '@ionic/angular/standalone';
import {ExploreContainerComponent} from '../explore-container/explore-container.component';
import {database} from "../../main";
import {user} from "../core/database/schemas/user.schema";

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, ExploreContainerComponent]
})
export class Tab2Page implements OnInit {

  constructor() {
  }

  ngOnInit(): void {
    this.inicializar();
  }

  private inicializar(): void {
    try {

      setTimeout(async () => {

        for(let x = 0; x < 1000; x++) {

          await database.transaction(async (tx) => {

            await tx.delete(user);

            console.time('SELECT ALL')
            const data = await tx.select().from(user);
            console.log('Dados do usuário:', data);
            console.timeEnd('SELECT ALL')

            const entidades:any[] = [];
            for(let x = 1; x <= 16500; x++) {
              entidades.push({
                id: x,
                name: 'John Doe',
                email: `teste${x}@example.com`,
                image: 'https://example.com/image.jpg',
                knowledge: 'Basic',
                objective: 'Fitness',
              });
            }

            console.time('INSERT ALL')
            try {
              await tx.insert(user).values(entidades);
            }catch (e){
              console.error(e);
            }finally {
              console.timeEnd('INSERT ALL')
            }


            console.time('SELECT ALL')
            const data3 = await tx.select().from(user);
            console.log('Dados do usuário 3:', data3);
            console.timeEnd('SELECT ALL')

            console.time('DELETE ALL')
            await tx.delete(user);
            console.log('Dados do usuário deletados');
            console.timeEnd('DELETE ALL')

            const data4 = await tx.select().from(user);
            console.log('Dados do usuário 4444:', data4);

          })


       }

      })

    }catch (e) {
      console.error('Erro ao inicializar:', e);
    }
  }

}
