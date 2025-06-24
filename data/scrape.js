const axios = require('axios'); // Importăm axios pentru a face cereri HTTP
const cheerio = require('cheerio'); // Importăm cheerio pentru a parsa HTML
const fs = require('fs'); // Importăm fs pentru a lucra cu fișiere
const path = require('path'); // Importăm path pentru a gestiona căile fișierelor
const createCsvWriter = require('csv-writer').createObjectCsvWriter; // Importăm csv-writer pentru a scrie în fișiere CSV
const csvPath = path.resolve(__dirname, 'brm_cereale_all_weeks.csv'); // Calea către fișierul CSV unde vom salva datele
function csvContainsWeek(weekString) { // Funcție pentru a verifica dacă săptămâna există deja în fișierul CSV
  if (!fs.existsSync(csvPath)) return false; // Verificăm dacă fișierul CSV există
  const existingData = fs.readFileSync(csvPath, 'utf8'); // Citim conținutul fișierului CSV
  return existingData.includes(weekString); // Verificăm dacă săptămâna există în conținutul fișierului
}

(async () => {
  try {
    const url = 'https://brm.ro/cotatii-cereale/'; // URL-ul de unde vom extrage datele
    const { data } = await axios.get(url); // Facem o cerere GET pentru a obține conținutul paginii
    const $ = cheerio.load(data); // Încărcăm conținutul paginii în cheerio pentru a putea naviga și extrage datele
    const rows = $('#tablepress-16 tr'); // Selectăm toate rândurile din tabelul cu id-ul "tablepress-16"
    let currentWeek = ''; // Variabilă pentru a stoca săptămâna curentă
    let currentHeaders = []; // Variabilă pentru a stoca anteturile curente ale tabelului
    let newRecords = []; // Variabilă pentru a stoca noile înregistrări extrase din tabel
    //   Extragem saptamana curenta din tabel 
    rows.each((i, el) => { 
      const th = $(el).find('th'); // Căutăm celulele de antet (th) în rând
      const td = $(el).find('td'); // Căutăm celulele de date (td) în rând
      if (th.length && th.attr('colspan') === '9') { // Verificăm dacă th are colspan 9, ceea ce indică o săptămână
        currentWeek = th.text().trim(); // Extragem textul din antet și îl curățăm de spații
        return false; // Oprim iterația dacă am găsit săptămâna curentă
      } else if (td.length === 1 && td.text().includes('SAPTAMANA')) { // Verificăm dacă td conține textul "SAPTAMANA"
        currentWeek = td.text().trim(); // Extragem textul din celula de date și îl curățăm de spații
        return false; // Oprim iterația dacă am găsit săptămâna curentă
      }
    });
    if (!currentWeek) { // Verificăm dacă am găsit săptămâna curentă
      console.error('Eroare: Nu am gasit saptamana curenta pe site!'); // Dacă nu am găsit săptămâna, afișăm un mesaj de eroare
      return; // Oprim execuția scriptului
    }
    console.log(`Saptamana detectata: ${currentWeek}`);

    if (csvContainsWeek(currentWeek)) { // Verificăm dacă săptămâna curentă există deja în fișierul CSV
      console.log(`Saptamana ${currentWeek} deja exista in CSV. Nu fac append.`); // Dacă săptămâna există deja, afișăm un mesaj și oprim execuția
      return; // Oprim execuția scriptului
    }

    console.log(`Saptamana noua gasita. Extragem date...`);

    //Extragem datele din tabel
    rows.each((i, el) => { // Iterăm prin fiecare rând din tabel
      const td = $(el).find('td'); // Căutăm celulele de date (td) în rând
      if (td.length === 9 && td.eq(0).text().toUpperCase().includes('ZONA DE LIVRARE')) { // Verificăm dacă rândul are 9 celule și prima celulă conține textul "ZONA DE LIVRARE"
        currentHeaders = td.map((i, cell) => $(cell).text().trim()).get(); // Extragem anteturile din celulele de date și le curățăm de spații
      } else if (td.length === 9) { // Verificăm dacă rândul are 9 celule
        const zona = td.eq(0).text().trim(); // Extragem zona de livrare din prima celulă și o curățăm de spații
        for (let i = 1; i < 9; i += 2) { // Iterăm prin celulele de date, începând de la a doua celulă și sărind peste fiecare două celule
          const produs = currentHeaders[i] || `Produs ${i}`; // Extragem produsul din antetul corespunzător sau folosim un nume generic dacă nu există
          const pret = td.eq(i).text().trim().replace(',', '.'); // Extragem prețul din celula corespunzătoare și înlocuim virgula cu punctul pentru a putea converti la număr
          const variatie = td.eq(i + 1).text().trim().replace(',', '.'); // Extragem variația din celula următoare și înlocuim virgula cu punctul
          if (zona && produs && pret) { // Verificăm dacă zona, produsul și prețul sunt definite
            newRecords.push({ // Adăugăm o nouă înregistrare în lista de înregistrări noi
              saptamana: currentWeek, // Săptămâna curentă
              zona, // Zona de livrare
              produs, // Numele produsului
              pret_lei: isNaN(parseFloat(pret)) ? '-' : parseFloat(pret), // Prețul în lei, convertit la număr sau '-' dacă nu este un număr valid
              variatie_procente: isNaN(parseFloat(variatie)) ? '-' : parseFloat(variatie) // Variația în procente, convertită la număr sau '-' dacă nu este un număr valid
            });
          }
        }
      }
    });
    if (newRecords.length === 0) { // Verificăm dacă nu am găsit înregistrări noi
      console.log('Nu s-au gasit date noi de salvat.'); // Dacă nu am găsit înregistrări noi, afișăm un mesaj și oprim execuția
      return; // Oprim execuția scriptului
    }

    //Scriem datele in CSV (append)
    const csvWriter = createCsvWriter({ // Creăm un csvWriter pentru a scrie în fișierul CSV
      path: csvPath, // Calea către fișierul CSV
      header: [ // Definim anteturile pentru fișierul CSV
        { id: 'saptamana', title: 'saptamana' }, // Săptămâna curentă
        { id: 'zona', title: 'zona' }, // Zona
        { id: 'produs', title: 'produs' }, // Numele produsului
        { id: 'pret_lei', title: 'pret_lei' }, // Prețul în lei
        { id: 'variatie_procente', title: 'variatie_procente' } // Variația în procente
      ],
      append: fs.existsSync(csvPath) // Verificăm dacă fișierul CSV există deja
    });
    await csvWriter.writeRecords(newRecords); // Scriem noile înregistrări în fișierul CSV
    console.log(`${newRecords.length} inregistrari salvate pentru ${currentWeek}.`); // Afișăm un mesaj cu numărul de înregistrări salvate și săptămâna curentă
  } catch (error) { // Gestionăm erorile
    console.error('Eroare la scraping:', error.message); // Afișăm un mesaj de eroare dacă a apărut o problemă la scraping
  }
})();
