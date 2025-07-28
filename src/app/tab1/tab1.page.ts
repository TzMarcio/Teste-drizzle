import {Component} from '@angular/core';
import {IonButton, IonCol, IonContent, IonHeader, IonRow, IonTitle, IonToolbar} from '@ionic/angular/standalone';


@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonRow, IonCol, IonButton],
})
export class Tab1Page {

  constructor() {}

  // private uint8ArrayToBase64(uint8Array: Uint8Array): string {
  //   let binary = '';
  //   uint8Array.forEach(byte => (binary += String.fromCharCode(byte)));
  //   return btoa(binary);
  // }
  //
  // public blobToBase64(blob: Blob): Promise<string> {
  //   return new Promise((resolve, reject) => {
  //     const reader = new FileReader();
  //     reader.readAsDataURL(blob);
  //     reader.onloadend = () => resolve(reader.result as string);
  //     reader.onerror = reject;
  //   });
  // }
  //
  // public async abrir() {
  //   const filePath = 'file:///storage/emulated/0/Android/data/io.ionic.starter/files/meuArquivo.pdf';
  //
  //   this.fileOpener.open(filePath, 'application/pdf')
  //     .then(() => console.log('PDF aberto com sucesso!'))
  //     .catch(error => console.error('Erro ao abrir PDF:', error));
  // }
  //
  // public gerarPDF():void {
  //
  //   setTimeout(async () => {
  //
  //     try {
  //       // Criar um novo documento PDF
  //       const pdfDoc = await PDFDocument.create();
  //       const page = pdfDoc.addPage([595, 842]); // Define tamanho da página
  //
  //       // Adicionar texto ao PDF
  //       const { width, height } = page.getSize();
  //       page.drawText('Olá, este é um PDF gerado no Ionic!', {
  //         x: 50,
  //         y: height - 100,
  //         size: 20,
  //         color: rgb(0, 0, 0),
  //       });
  //
  //       // Salvar como bytes
  //       const pdfBytes = await pdfDoc.save();
  //       const pdfBase64 = this.uint8ArrayToBase64(pdfBytes);
  //
  //       // Definir nome do arquivo
  //       const fileName = `meuArquivo.pdf`;
  //
  //       console.log('A')
  //
  //       // Salvar no dispositivo
  //       const result= await Filesystem.writeFile({
  //         path: fileName,
  //         data: pdfBase64,
  //         directory: Directory.External, // Usa a pasta de documentos do dispositivo
  //       });
  //
  //       console.log('B', result)
  //
  //       console.log('PDF gerado com sucesso:', fileName);
  //
  //     } catch (error) {
  //       console.error('Erro ao gerar PDF:', error);
  //     }
  //
  //   }, 0);
  // }
  //
  // public base64ToArrayBuffer(base64: string): ArrayBuffer {
  //   try {
  //     const binaryString = atob(base64);
  //     const length = binaryString.length;
  //     const bytes = new Uint8Array(length);
  //     for (let i = 0; i < length; i++) {
  //       bytes[i] = binaryString.charCodeAt(i);
  //     }
  //     console.log("ArrayBuffer gerado com sucesso! Tamanho:", bytes.byteLength);
  //     return bytes.buffer;
  //   } catch (error) {
  //     console.error("Erro ao converter Base64 para ArrayBuffer:", error);
  //     return new ArrayBuffer(0);
  //   }
  // }

}
