import pandas as pd #Importă biblioteca pandas pentru manipularea datelor
from prophet import Prophet #Importă biblioteca Prophet pentru prognozarea seriilor temporale
import re #Importă biblioteca re pentru expresii regulate
from datetime import datetime, timedelta #Importă clasele datetime și timedelta pentru manipularea datelor și timpului
import os #Importă biblioteca os pentru manipularea căilor de fișiere
data_path = os.path.join(os.path.dirname(__file__), 'brm_cereale_all_weeks.csv') # Definește calea către fișierul CSV cu datele de intrare
predictii_output = os.path.join(os.path.dirname(__file__), 'brm_predictii_saptamana_viitoare.csv') # Definește calea către fișierul CSV pentru salvarea predicțiilor


df = pd.read_csv(data_path) # Citește datele din fișierul CSV într-un DataFrame pandas
df['pret_lei'] = pd.to_numeric(df['pret_lei'], errors='coerce') # Convertește coloana 'pret_lei' în numere, înlocuind valorile invalide cu NaN
def extract_start_date(s): # Funcție pentru extragerea datei de început dintr-un șir de caractere
    match = re.search(r'(\d{1,2})\s*-\s*\d{1,2}\s+(\w+)\s+(\d{4})', s) # Caută un model specific în șirul de caractere
    if match: # Dacă se găsește o potrivire
        day, month_str, year = match.groups() # Extrage ziua, luna și anul din potrivire
        months = {'ianuarie':1, 'februarie':2, 'martie':3, 'aprilie':4, 'mai':5, 'iunie':6,
                  'iulie':7, 'august':8, 'septembrie':9, 'octombrie':10, 'noiembrie':11, 'decembrie':12}
        month = months.get(month_str.lower()) # Convertește numele lunii în numărul corespunzător
        if month: # Dacă luna este validă
            return pd.Timestamp(year=int(year), month=month, day=int(day))  # Returnează un obiect Timestamp cu data formatată
    return pd.NaT # Dacă nu se găsește o potrivire, returnează NaT (Not a Time)
df['date'] = df['saptamana'].apply(extract_start_date) # Aplică funcția de extragere a datei pe coloana 'saptamana' și creează o nouă coloană 'date'
df = df.dropna(subset=['pret_lei', 'date']) # Elimină rândurile cu valori NaN în coloanele 'pret_lei' și 'date'

# Calculez data pentru următoarea luni reală
today = datetime.today() # Obține data curentă
days_until_next_monday = (7 - today.weekday()) % 7 # Calculează numărul de zile până la următoarea zi de luni
if days_until_next_monday == 0: # Dacă astăzi este luni, setează numărul de zile la 7 pentru a prognoza pentru săptămâna următoare
    days_until_next_monday = 7 # Setează numărul de zile la 7 pentru a prognoza pentru săptămâna următoare
future_date = today + timedelta(days=days_until_next_monday) # Calculează data pentru următoarea zi de luni

# Pregătim predictiile
results = [] # Inițializează o listă pentru a stoca rezultatele predicțiilor
for produs in df['produs'].unique(): # Iterează prin fiecare produs unic din coloana 'produs'
    for zona in df['zona'].unique(): # Iterează prin fiecare zonă unică din coloana 'zona'
        subset = df[(df['produs'] == produs) & (df['zona'] == zona)].copy() # Creează un subset al DataFrame-ului pentru produsul și zona curente
        if subset.shape[0] < 2: # Verifică dacă există suficiente date pentru a face o predicție
            print(f"Putine date pentru {produs} - {zona} (doar {subset.shape[0]} puncte)") # Dacă nu există suficiente date, afișează un mesaj și treci la următorul produs/zona
        prophet_df = subset[['date', 'pret_lei']].rename(columns={'date': 'ds', 'pret_lei': 'y'}) # Pregătește DataFrame-ul pentru Prophet, redenumind coloanele conform cerințelor
        try: 
            model = Prophet() # Creează un model Prophet
            model.fit(prophet_df) # Antrenează modelul pe datele pregătite
            future = pd.DataFrame({'ds': [future_date]}) # Creează un DataFrame cu data pentru care se dorește predicția
            forecast = model.predict(future) # Face predicția pentru data specificată
            predicted_price = forecast['yhat'].values[0] # Extrage valoarea prezisă din predicție
            results.append({ # Adaugă rezultatul predicției în lista de rezultate
                'saptamana': f"Predictie {future_date.strftime('%d-%m-%Y')}", # Formatează săptămâna pentru afișare
                'zona': zona, # Zona pentru care s-a făcut predicția
                'produs': produs, # Produsul pentru care s-a făcut predicția
                'pret_lei_predictie': round(predicted_price, 2) # Rotunjește prețul prezis la două zecimale
            }) 
        except Exception as e: # În caz de eroare la antrenarea modelului sau la predicție, afișează un mesaj de eroare
            print(f"Eroare la model {produs} - {zona}: {e}") 

# Salvez predictiile
results_df = pd.DataFrame(results) # Creează un DataFrame din lista de rezultate
results_df.to_csv(predictii_output, index=False) # Salvează DataFrame-ul cu predicțiile într-un fișier CSV fără index

print(f"✅ Predictii salvate in {predictii_output} ({len(results_df)} randuri).")
