const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// 🔹 CSV-ul e in acelasi folder ca si scraperul
const csvPath = path.resolve(__dirname, 'brm_cereale_all_weeks.csv');

// 🔍 Verifica daca saptamana exista deja in CSV
function csvContainsWeek(weekString) {
  if (!fs.existsSync(csvPath)) return false;
  const existingData = fs.readFileSync(csvPath, 'utf8');
  return existingData.includes(weekString);
}

(async () => {
  try {
    const url = 'https://brm.ro/cotatii-cereale/';
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const rows = $('#tablepress-16 tr');
    let currentWeek = '';
    let currentHeaders = [];
    let newRecords = [];

    // 🔎 Extragem saptamana curenta din tabel
    rows.each((i, el) => {
      const th = $(el).find('th');
      const td = $(el).find('td');

      if (th.length && th.attr('colspan') === '9') {
        currentWeek = th.text().trim();
        return false; // break loop
      } else if (td.length === 1 && td.text().includes('SAPTAMANA')) {
        currentWeek = td.text().trim();
        return false; // break loop
      }
    });

    if (!currentWeek) {
      console.error('❌ Eroare: Nu am gasit saptamana curenta pe site!');
      return;
    }

    console.log(`🔎 Saptamana detectata: ${currentWeek}`);

    if (csvContainsWeek(currentWeek)) {
      console.log(`⚠️ Saptamana ${currentWeek} deja exista in CSV. Nu fac append.`);
      return;
    }

    console.log(`✅ Saptamana noua gasita. Extragem date...`);

    // 🔄 Extragem datele din tabel
    rows.each((i, el) => {
      const td = $(el).find('td');

      if (td.length === 9 && td.eq(0).text().toUpperCase().includes('ZONA DE LIVRARE')) {
        currentHeaders = td.map((i, cell) => $(cell).text().trim()).get();
      } else if (td.length === 9) {
        const zona = td.eq(0).text().trim();

        for (let i = 1; i < 9; i += 2) {
          const produs = currentHeaders[i] || `Produs ${i}`;
          const pret = td.eq(i).text().trim().replace(',', '.');
          const variatie = td.eq(i + 1).text().trim().replace(',', '.');

          if (zona && produs && pret) {
            newRecords.push({
              saptamana: currentWeek,
              zona,
              produs,
              pret_lei: isNaN(parseFloat(pret)) ? '-' : parseFloat(pret),
              variatie_procente: isNaN(parseFloat(variatie)) ? '-' : parseFloat(variatie)
            });
          }
        }
      }
    });

    if (newRecords.length === 0) {
      console.log('⚠️ Nu am gasit date noi de salvat.');
      return;
    }

    // 📝 Scriem datele in CSV (append)
    const csvWriter = createCsvWriter({
      path: csvPath,
      header: [
        { id: 'saptamana', title: 'saptamana' },
        { id: 'zona', title: 'zona' },
        { id: 'produs', title: 'produs' },
        { id: 'pret_lei', title: 'pret_lei' },
        { id: 'variatie_procente', title: 'variatie_procente' }
      ],
      append: fs.existsSync(csvPath)
    });

    await csvWriter.writeRecords(newRecords);
    console.log(`✅ ${newRecords.length} inregistrari salvate pentru ${currentWeek}.`);

  } catch (error) {
    console.error('❌ Eroare la scraping:', error.message);
  }
})();
