const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io"); // Importăm WebSockets
require("dotenv").config();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Creăm un server HTTP pentru WebSockets
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Permite accesul de la orice client
    },
});

const corsOptions = {
  origin: ["https://fermivo.ro", "https://www.fermivo.ro"], 
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization",
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());

// ✅ Conexiune la MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Conexiune reușită la MongoDB"))
  .catch((err) => console.log("Eroare la conectarea cu MongoDB:", err));

// ✅ Importăm și folosim rutele pentru utilizatori
const userRoutes = require("./routes/Users");
app.use("/api/users", userRoutes);

const anunturiRoutes = require("./routes/Anunturi");
app.use("/api/anunturi", anunturiRoutes);

// ✅ Endpoint de test pentru backend
app.get("/", (req, res) => {
  res.send("Backend funcționează corect!");
});

// // ✅ Funcția de scraping
// const puppeteer = require("puppeteer");
// const runScraper = async () => {
//     try {
//         const browser = await puppeteer.launch({ headless: "new" });
//         const page = await browser.newPage();

//         await page.setUserAgent(
//             "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
//         );

//         const url = "https://live.euronext.com/en/products/commodities";
//         await page.goto(url, { waitUntil: "networkidle2" });

//         await page.waitForSelector("#cm-futures .table.table-hover");

//         const prices = await page.evaluate(() => {
//             const rows = document.querySelectorAll("#cm-futures .table.table-hover tbody tr");
//             return Array.from(rows).map(row => {
//                 const columns = row.querySelectorAll("td");
//                 return {
//                     name: columns[0]?.innerText.trim(),
//                     code: columns[1]?.innerText.trim(),
//                     delivery: columns[2]?.innerText.trim(),
//                     last_price: columns[3]?.innerText.trim(),
//                     change: columns[4]?.innerText.trim(),
//                     volume: columns[5]?.innerText.trim(),
//                     open: columns[6]?.innerText.trim(),
//                     high: columns[7]?.innerText.trim(),
//                     low: columns[8]?.innerText.trim(),
//                     settlement: columns[9]?.innerText.trim(),
//                     oi: columns[10]?.innerText.trim(),
//                     total_vol: columns[11]?.innerText.trim(),
//                     total_oi: columns[12]?.innerText.trim(),
//                 };
//             });
//         });

//         // ✅ Mapare nume produse în română
//         const productTranslations = {
//             "Corn / Mais": "Porumb",
//             "Milling Wheat / Ble de Meunerie": "Grâu de panificație",
//             "Rapeseed / Colza": "Rapiță",
//             "European Durum Wheat Futures": "Grâu dur european",
//             "GRAND TOTAL": "TOTAL GENERAL",
//         };

//         // ✅ Eliminăm somonul și aplicăm traducerea
//         const filteredPrices = prices.filter(product => {
//             const productName = product.name?.trim().toLowerCase(); // Curățăm și uniformizăm numele
//             const code = product.code?.trim().toLowerCase(); // Curățăm și uniformizăm codul
//             return productName !== "european salmon futures" && code !== "grand total"; // Excludem somonul
//         })
//         .map(product => ({
//                 ...product,
//                 name: productTranslations[product.name] || product.name, // Traducem numele produselor
//             }));

//         await browser.close();

//         // ✅ Trimitem datele noi către clienții WebSocket
//         io.emit("updateData", filteredPrices);

//         return filteredPrices; // Returnăm datele modificate
//     } catch (error) {
//         console.error("❌ Eroare la scraping:", error);
//     }
// };


// // ✅ Rulăm scraping-ul la fiecare 1 minut
// setInterval(runScraper, 60 * 1000);

// //✅ Endpoint API pentru a obține datele la cerere
// app.get("/scrape", async (req, res) => {
//     const data = await runScraper();
//     res.json({ success: true, data });
// });

// // ✅ WebSockets: Notificăm clienții la fiecare actualizare
// io.on("connection", (socket) => {
//     console.log("🟢 Client conectat la WebSocket");
//     socket.emit("updateData", "Bine ai venit! Așteaptă actualizările...");

//     socket.on("disconnect", () => {
//         console.log("🔴 Client deconectat");
//     });
// });








// ✅ Pornim serverul
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serverul rulează pe http://0.0.0.0:${PORT}`);
});



const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs');

async function scrapeGrauPanificatie() {
    try {
        const url = 'https://brm.ro/cotatii-cereale/';
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        let results = [];

        $('#tablepress-16 tbody tr').each((index, element) => {
            const columns = $(element).find('td');
            if (columns.length < 3) return;
        
            const zona = $(columns[0]).text().trim();
            const pret = $(columns[1]).text().trim().replace(',', '.');
            const variatie = $(columns[2]).text().trim().replace(',', '.');
        
            if (!isNaN(parseFloat(pret)) || pret === "-") {
                results.push({
                    zona,
                    pret_lei_tona: parseFloat(pret),
                    variatie_procente: parseFloat(variatie)
                });
        
                if (results.length === 4) return false; // 🛑 oprește .each()
            }
        });

        fs.writeFileSync('grau_panificatie.json', JSON.stringify({ grau_panificatie: results }, null, 2));
        //console.log('📂 Datele au fost salvate în grau_panificatie.json');
        //console.log('✅ Rezultate:', results);
    } catch (error) {
        console.error('❌ Eroare la scraping:', error);
    }
}

scrapeGrauPanificatie();


async function scrapePorumb() {
    try {
        const url = 'https://brm.ro/cotatii-cereale/';
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        let results = [];

        $('#tablepress-16 tbody tr').each((index, element) => {
            const columns = $(element).find('td');
            if (columns.length < 7) return;

            const zona = $(columns[0]).text().trim();
            const pret = $(columns[5]).text().trim().replace(',', '.'); // Porumb
            const variatie = $(columns[6]).text().trim().replace(',', '.'); // Var. %

            if (!isNaN(parseFloat(pret)) || pret === "-") {
                results.push({
                    zona,
                    pret_lei_tona: parseFloat(pret),
                    variatie_procente: parseFloat(variatie)
                });

                if (results.length === 4) return false; // doar prima săptămână
            }
        });

        fs.writeFileSync('porumb.json', JSON.stringify({ porumb: results }, null, 2));
        //console.log('📂 Datele au fost salvate în porumb.json');
        //console.log('✅ Rezultate:', results);
    } catch (error) {
        console.error('❌ Eroare la scraping PORUMB:', error);
    }
}


scrapePorumb();


async function scrapeGrauFurajer() {
    try {
        const url = 'https://brm.ro/cotatii-cereale/';
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        let results = [];

        $('#tablepress-16 tbody tr').each((index, element) => {
            const columns = $(element).find('td');
            if (columns.length < 5) return; // Asigurăm că sunt suficiente coloane

            const zona = $(columns[0]).text().trim();
            const pret = $(columns[3]).text().trim().replace(',', '.'); // Grâu furajer
            const variatie = $(columns[4]).text().trim().replace(',', '.'); // Var. %

            if (!isNaN(parseFloat(pret)) || pret === "-") {
                results.push({
                    zona,
                    pret_lei_tona: parseFloat(pret),
                    variatie_procente: parseFloat(variatie)
                });

                if (results.length === 4) return false; // Luăm doar prima săptămână
            }
        });

        fs.writeFileSync('grau_furajer.json', JSON.stringify({ grau_furajer: results }, null, 2));
        //console.log('📂 Datele au fost salvate în grau_furajer.json');
        //console.log('✅ Rezultate:', results);
    } catch (error) {
        console.error('❌ Eroare la scraping GRÂU FURAJER:', error);
    }
}

scrapeGrauFurajer();


async function scrapeOrz() {
    try {
        const url = 'https://brm.ro/cotatii-cereale/';
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        let results = [];

        $('#tablepress-16 tbody tr').each((index, element) => {
            const columns = $(element).find('td');
            if (columns.length < 9) return; // Asigurăm că sunt suficiente coloane

            const zona = $(columns[0]).text().trim();
            const pret = $(columns[7]).text().trim().replace(',', '.'); // Orz
            const variatie = $(columns[8]).text().trim().replace(',', '.'); // Var. %

            if (!isNaN(parseFloat(pret)) || pret === "-") {
                results.push({
                    zona,
                    pret_lei_tona: parseFloat(pret),
                    variatie_procente: parseFloat(variatie)
                });

                if (results.length === 4) return false; // Luăm doar prima săptămână
            }
            
        });

        fs.writeFileSync('orz.json', JSON.stringify({ orz: results }, null, 2));
        //console.log('📂 Datele au fost salvate în orz.json');
        //console.log('✅ Rezultate:', results);
    } catch (error) {
        console.error('❌ Eroare la scraping ORZ:', error);
    }
}

scrapeOrz();





async function scrapeOrzFurajer() {
    try {
        const url = 'https://brm.ro/cotatii-cereale/';
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        let results = [];
        let i = 0;

        $('#tablepress-16 tbody tr').each((index, element) => {
            const columns = $(element).find('td');
            if (columns.length < 9) return; // Asigurăm că sunt suficiente coloane

            const zona = $(columns[0]).text().trim();
            const pret = $(columns[1]).text().trim().replace(',', '.'); // Orz
            const variatie = $(columns[2]).text().trim().replace(',', '.'); // Var. %

            i++;

            if(i>5){
            if (!isNaN(parseFloat(pret)) || pret === "-") {
                results.push({
                    zona,
                    pret_lei_tona: parseFloat(pret),
                    variatie_procente: parseFloat(variatie)
                });

                if (results.length === 4) return false; // Luăm doar prima săptămână
            }
        }
        });

        fs.writeFileSync('orz_furajer.json', JSON.stringify({ orz_furajer: results }, null, 2));
        //console.log('📂 Datele au fost salvate în orz_furajer.json');
        //console.log('✅ Rezultate:', results);
    } catch (error) {
        console.error('❌ Eroare la scraping ORZ:', error);
    }
}

scrapeOrzFurajer();


async function scrapeFloareaSoarelui() {
    try {
        const url = 'https://brm.ro/cotatii-cereale/';
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        let results = [];
        let i = 0;

        $('#tablepress-16 tbody tr').each((index, element) => {
            const columns = $(element).find('td');
            if (columns.length < 9) return; // Asigurăm că sunt suficiente coloane

            const zona = $(columns[0]).text().trim();
            const pret = $(columns[3]).text().trim().replace(',', '.'); // Orz
            const variatie = $(columns[4]).text().trim().replace(',', '.'); // Var. %

            i++;

            if(i>5){
            if (!isNaN(parseFloat(pret)) || pret === "-") {
                results.push({
                    zona,
                    pret_lei_tona: parseFloat(pret),
                    variatie_procente: parseFloat(variatie)
                });

                if (results.length === 4) return false; // Luăm doar prima săptămână
            }
        }
        });

        fs.writeFileSync('floarea_soarelui.json', JSON.stringify({ orz: results }, null, 2));
        //console.log('📂 Datele au fost salvate în floarea_soarelui.json');
        //console.log('✅ Rezultate:', results);
    } catch (error) {
        console.error('❌ Eroare la scraping ORZ:', error);
    }
}

scrapeFloareaSoarelui();


async function scrapeRapita() {
    try {
        const url = 'https://brm.ro/cotatii-cereale/';
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        let results = [];
        let i = 0;

        $('#tablepress-16 tbody tr').each((index, element) => {
            const columns = $(element).find('td');
            if (columns.length < 9) return; // Asigurăm că sunt suficiente coloane

            const zona = $(columns[0]).text().trim();
            const pret = $(columns[5]).text().trim().replace(',', '.'); // Orz
            const variatie = $(columns[6]).text().trim().replace(',', '.'); // Var. %

            i++;

            if(i>5){
            if (!isNaN(parseFloat(pret)) || pret === "-") {
                results.push({
                    zona,
                    pret_lei_tona: parseFloat(pret),
                    variatie_procente: parseFloat(variatie)
                });

                if (results.length === 4) return false; // Luăm doar prima săptămână
            }
        }
        });

        fs.writeFileSync('rapita.json', JSON.stringify({ orz: results }, null, 2));
        //console.log('📂 Datele au fost salvate în rapita.json');
        //console.log('✅ Rezultate:', results);
    } catch (error) {
        console.error('❌ Eroare la scraping ORZ:', error);
    }
}

scrapeRapita();

const INTERVAL_MINUTE = 5; // Intervalul de actualizare în minute

setInterval(() => {
    console.log("🔄 Actualizare automată a datelor...");
    scrapeGrauPanificatie();
    scrapePorumb();
    scrapeGrauFurajer();
    scrapeOrz();
    scrapeOrzFurajer();
    scrapeFloareaSoarelui();
    scrapeRapita();
}, INTERVAL_MINUTE * 60 * 1000);

app.get("/scrape/brm", async (req, res) => {
    try {
        const grau_panificatie = JSON.parse(fs.readFileSync('grau_panificatie.json'));
        const porumb = JSON.parse(fs.readFileSync('porumb.json'));
        const grau_furajer = JSON.parse(fs.readFileSync('grau_furajer.json'));
        const orz = JSON.parse(fs.readFileSync('orz.json'));
        const orz_furajer = JSON.parse(fs.readFileSync('orz_furajer.json'));
        const floarea_soarelui = JSON.parse(fs.readFileSync('floarea_soarelui.json'));
        const rapita = JSON.parse(fs.readFileSync('rapita.json'));

        res.json({
            success: true,
            grau_panificatie: grau_panificatie.grau_panificatie,
            porumb: porumb.porumb,
            grau_furajer: grau_furajer.grau_furajer,
            orz: orz.orz,
            orz_furajer: orz_furajer.orz_furajer,
            floarea_soarelui: floarea_soarelui.orz,
            rapita: rapita.orz,
        });
    } catch (error) {
        console.error("❌ Eroare la citirea fișierelor JSON:", error);
        res.status(500).json({ success: false, message: "Eroare la preluarea datelor" });
    }
});



const cron = require("node-cron");
const { exec } = require("child_process");

// Rulează scrape.js o dată pe saptamana, luni la ora 6 dimineața
cron.schedule("0 6 * * 1", () => {
    exec("node data/scrape.js", (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Eroare la scraper: ${error.message}`);
          return;
        }
        console.log(`✅ Scraper OK:\n${stdout}`);
      
        // După scraper, rulez predictorul
        exec("python data/brm_predictor.py", (error2, stdout2, stderr2) => {
          if (error2) {
            console.error(`❌ Eroare la predictor: ${error2.message}`);
            return;
          }
          console.log(`✅ Predictor OK:\n${stdout2}`);
        });
      });
      
});

const predictiiRoutes = require('./routes/predictii');
app.use('/api', predictiiRoutes);


app.get('/api/validate-cui/:cui', async (req, res) => {
    const { cui } = req.params;
  
    try {
      const response = await axios.get(`https://api.infocui.ro/firma/${cui}`, {
        headers: {
          'Authorization': `Bearer ${process.env.INFOCUI_API_KEY}`,
        },
      });
  
      res.json(response.data);
    } catch (error) {
      console.error('❌ Eroare API InfoCUI:', error.response?.data || error.message);
      res.status(500).json({ success: false, message: 'Eroare la validare CUI' });
    }
  });


const conversatiiRoutes = require("./routes/Conversatii.js");
app.use("/api/conversatii", conversatiiRoutes);
const User = require("./models/User");

const reportRoutes = require("./routes/Reports");
app.use("/api/reports", reportRoutes);

const blockedRoutes = require("./routes/BlockedUsers");
app.use("/api/blocked", blockedRoutes);

const paymentsPremiumRoutes = require('./routes/PaymentsPremium');
app.use('/api/payments-premium', paymentsPremiumRoutes);

const trackerRoutes = require("./routes/Trackers");
app.use("/api/trackers", trackerRoutes);
