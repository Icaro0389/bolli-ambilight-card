# Bolli Ambilight Card

Custom card Lovelace per il controllo di Bolli Ambilight e HyperHDR. Versione sperimentale `0.1.0`.

## Installazione tramite HACS

1. In **HACS → menu ⋮ → Repository personalizzati**, aggiungi `https://github.com/Icaro0389/bolli-ambilight-card` come categoria **Dashboard**.
2. Cerca **Bolli Ambilight Card** in HACS e installala.
3. Ricarica la pagina di Home Assistant. Se la risorsa non compare automaticamente, aggiungi `/hacsfiles/bolli-ambilight-card/bolli-ambilight-card.js` come **Modulo JavaScript** nelle risorse della dashboard.
4. Nell'editor della sola vista Ambilight, sostituisci **solo la vecchia scheda Ambilight**, non la dashboard, con:

   ```yaml
   type: custom:bolli-ambilight-card
   name: Bolli Ambilight
   show_preview: false
   ```

Per l'installazione manuale, invece, segui i passaggi successivi.

## Installazione manuale

1. Copia `bolli-ambilight-card.js` in `/config/www/bolli-ambilight-card/` su Home Assistant.
2. Vai a **Impostazioni → Dashboard → Risorse** e aggiungi la risorsa `/local/bolli-ambilight-card/bolli-ambilight-card.js` come **Modulo JavaScript** (se non è già presente).
3. Ricarica il browser o l'app Home Assistant.
4. Nell'editor della sola vista Ambilight, sostituisci **solo la vecchia scheda Ambilight**, non la dashboard, con:

   ```yaml
   type: custom:bolli-ambilight-card
   name: Bolli Ambilight
   show_preview: false
   ```

Imposta `show_preview: true` per provare l'anteprima camera HyperHDR. Dipende dalla disponibilità dell'endpoint immagine dell'integrazione.

La card usa direttamente le entità Home Assistant esistenti: nessun contatto con il server HyperHDR e nessuna modifica all'addon Kodi. Le azioni usano `switch.toggle`, `select.select_option` e `number.set_value`.

### Entità personalizzabili

Le entità predefinite sono quelle del progetto Bolli. Puoi sovrascriverle nel YAML usando `power_entity`, `mode_entity`, `status_entity`, `fps_entity`, `connected_entity`, `cinema_entity`, `relax_entity`, `kelvin_entity`, `target_entity`, `auto_entity`, `camera_entity`.

### Limitazioni della versione sperimentale

- L'anteprima HyperHDR è una singola immagine: per un flusso aggiornato continuamente occorrerà aggiungere un metodo di refresh verificato con l'integrazione effettiva.
- Il selettore modalità richiede che l'entità `select.bolli_ambilight_mode` offra le opzioni Auto, Cinema, Relax, Off.
- Test visivo in Home Assistant reale ancora necessario prima di considerarla una release stabile.
