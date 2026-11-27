/* Bolli Ambilight Card — Home Assistant custom card, v0.2.2 */
const BOLLI_VERSION = '0.2.2';
const BOLLI_DEFAULTS = {
  power: 'switch.bolli_ambilight_power', mode: 'select.bolli_ambilight_mode',
  status: 'sensor.bolli_ambilight_status', fps: 'sensor.bolli_ambilight_actual_fps',
  connected: 'binary_sensor.bolli_ambilight_hyperhdr_connected',
  cinema: 'number.bolli_ambilight_cinema_brightness',
  relax: 'number.bolli_ambilight_relax_brightness',
  kelvin: 'number.bolli_ambilight_temperature',
  target: 'number.bolli_ambilight_target_fps',
  auto: 'switch.bolli_ambilight_auto_brightness',
  camera: 'camera.tv_ambilight_led_preview',
  lux:'sensor.zigbee2cube_1001e0b3e4_illuminance', tv:'media_player.samsung_q60_series',
  leds:'sensor.tv_ambilight_led_count', source:'sensor.tv_ambilight_visible_priority',
  gamma:'number.tv_ambilight_gamma', saturation:'number.tv_ambilight_saturation_gain',
  luminance:'number.tv_ambilight_luminance_gain', threshold:'number.tv_ambilight_backlight_threshold',
  smoothing:'switch.tv_ambilight_smoothing', border:'switch.tv_ambilight_blackborder_detection',
  hdr:'select.tv_ambilight_hdr_tone_mapping', priority:'select.tv_ambilight_priority_source',
};
const BOLLI_LABELS = {
  it: { ready:'Connesso a HyperHDR', offline:'HyperHDR non disponibile', power:'Accensione', cinema:'Cinema', relax:'Relax', off:'Off', auto:'Auto', brightness:'Luminosità', temperature:'Temperatura', fps:'FPS desiderati', ambient:'Luminosità automatica', preview:'Anteprima LED', status:'Stato', missing:'Entità non disponibile' },
  en: { ready:'Connected to HyperHDR', offline:'HyperHDR unavailable', power:'Power', cinema:'Cinema', relax:'Relax', off:'Off', auto:'Auto', brightness:'Brightness', temperature:'Temperature', fps:'Target FPS', ambient:'Adaptive brightness', preview:'LED preview', status:'Status', missing:'Entity unavailable' }
};
const bolliEscape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

class BolliAmbilightCard extends HTMLElement {
  static getStubConfig() { return { type: 'custom:bolli-ambilight-card', name: 'Bolli Ambilight', show_preview: false }; }
  static getConfigElement() { return document.createElement('bolli-ambilight-card-editor'); }
  constructor() { super(); this.attachShadow({mode:'open'}); this._events = false; this._pending = new Map(); this._drag = null; }
  setConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Configurazione non valida');
    this._config = { show_preview:false, name:'Bolli Ambilight', ...config };
    this._ids = Object.fromEntries(Object.keys(BOLLI_DEFAULTS).map(k => [k, this._config[`${k}_entity`] || BOLLI_DEFAULTS[k]]));
    this._build();
  }
  connectedCallback(){ if(!this._cameraTimer)this._cameraTimer=setInterval(()=>{this._updateCamera();if(this._pending.size)this._update();},1000); }
  disconnectedCallback(){clearInterval(this._cameraTimer);this._cameraTimer=null;}
  getCardSize() { return this._config?.show_preview ? 7 : 5; }
  getGridOptions() { return { columns:12, min_columns:6 }; }
  set hass(hass) {
    const old = this._hass; this._hass = hass;
    if (!this._config) return;
    if (!old || old.themes !== hass.themes || old.locale !== hass.locale || Object.values(this._ids).some(id => old.states[id] !== hass.states[id])) this._update();
  }
  get hass() { return this._hass; }
  _str(key) { const lang = (this._hass?.locale?.language || this._hass?.language || 'it').split('-')[0]; return (BOLLI_LABELS[lang] || BOLLI_LABELS.en)[key] || key; }
  _entity(key) { return this._hass?.states[this._ids[key]]; }
  _valid(key) { const s = this._entity(key)?.state; return s !== undefined && !['unknown','unavailable',''].includes(s); }
  _value(key) { return this._valid(key) ? this._entity(key).state : null; }
  _build() {
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;--bolli-accent:var(--orange-color,var(--accent-color,#ff9800));font-family:var(--ha-font-family-body,Roboto,sans-serif)}
      ha-card{height:100%;overflow:hidden;color:var(--primary-text-color)}
      .wrap{container-type:inline-size;padding:var(--ha-space-4,16px);display:grid;gap:var(--ha-space-4,16px)}
      .head{display:flex;align-items:center;gap:var(--ha-space-3,12px)}
      .glyph{width:46px;height:46px;flex:none;display:grid;place-items:center;border-radius:var(--ha-tile-icon-border-radius,16px);background:color-mix(in srgb,var(--bolli-accent) 18%,transparent);color:var(--bolli-accent)}
      .glyph ha-icon{--mdc-icon-size:27px}.heading{min-width:0;flex:1}.name{font-size:var(--ha-font-size-l,16px);font-weight:var(--ha-font-weight-medium,500)}
      .sub{font-size:var(--ha-font-size-s,12px);color:var(--secondary-text-color);margin-top:3px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
      button{font:inherit;cursor:pointer;color:inherit;border:0}button:focus-visible,input:focus-visible{outline:2px solid var(--bolli-accent);outline-offset:2px}
      .power{width:46px;height:46px;border-radius:50%;background:color-mix(in srgb,var(--disabled-color,#888) 20%,transparent);display:grid;place-items:center}
      .power.on{color:var(--bolli-accent);background:color-mix(in srgb,var(--bolli-accent) 19%,transparent)}
      .power ha-icon{--mdc-icon-size:24px}.modes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--ha-space-2,8px)}
      .mode{height:47px;display:flex;flex-direction:column;gap:3px;align-items:center;justify-content:center;border-radius:var(--ha-card-features-border-radius,12px);background:color-mix(in srgb,var(--disabled-color,#888) 14%,transparent);font-size:var(--ha-font-size-s,12px)}
      .mode ha-icon{--mdc-icon-size:20px}.mode.selected{color:var(--bolli-accent);background:color-mix(in srgb,var(--bolli-accent) 19%,transparent);box-shadow:inset 0 0 0 1px var(--bolli-accent)}
      .mode:disabled,.power:disabled{opacity:.45;cursor:not-allowed}.controls{display:grid;gap:var(--ha-space-3,12px)}
      .slider{display:grid;gap:var(--ha-space-2,8px)}.sliderline{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:var(--ha-font-size-m,14px)}
      .sliderline strong{font-size:var(--ha-font-size-m,14px);font-variant-numeric:tabular-nums;color:var(--bolli-accent)}
      input[type=range]{width:100%;margin:0;accent-color:var(--bolli-accent);height:22px;cursor:pointer}
      .line{border-top:1px solid var(--divider-color);padding-top:var(--ha-space-3,12px)}
      .meta{display:flex;flex-wrap:wrap;gap:var(--ha-space-2,8px)}.chip{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--divider-color);border-radius:var(--ha-border-radius-pill,999px);padding:6px 9px;font-size:var(--ha-font-size-s,12px);color:var(--secondary-text-color)}
      .chip ha-icon{--mdc-icon-size:15px}.chip.good ha-icon{color:var(--success-color)}.chip.bad ha-icon{color:var(--error-color)}
      .toggle{display:flex;align-items:center;gap:10px;padding:3px 0;font-size:var(--ha-font-size-m,14px)}.toggle span{flex:1}.toggle input{accent-color:var(--bolli-accent);width:19px;height:19px}
      .preview{display:none;border-radius:var(--ha-border-radius-lg,12px);overflow:hidden;background:var(--secondary-background-color);min-height:90px;align-items:center;justify-content:center}
      .preview img{display:block;width:100%;max-height:210px;object-fit:contain}.preview.show{display:flex;aspect-ratio:16/9;background:#000}.preview.black img{visibility:hidden}
      @container(max-width:315px){.mode{font-size:11px}.wrap{padding:12px;gap:12px}.modes{gap:4px}}
      @media(prefers-reduced-motion:reduce){*{transition:none!important}}
      :host{--bolli-accent:var(--primary-color,#38bde5)}
      ha-card{border-radius:22px;background:linear-gradient(145deg,color-mix(in srgb,var(--card-background-color) 94%,#64748b),var(--card-background-color));border:1px solid var(--divider-color)}
      .wrap{gap:12px;padding:14px}.glyph{width:36px;height:36px;border-radius:12px}.power{width:38px;height:38px}
      .mode{height:48px;border:1px solid color-mix(in srgb,var(--secondary-text-color) 22%,transparent);--mode-color:#9b83df}
      .mode[data-value="Cinema"]{--mode-color:#38bde5}.mode[data-value="Relax"]{--mode-color:#d8a456}.mode[data-value="Off"]{--mode-color:#e87988}
      .mode.selected{color:var(--mode-color);background:color-mix(in srgb,var(--mode-color) 16%,transparent);box-shadow:inset 0 0 0 1px var(--mode-color)}
      .preview img{max-height:none;aspect-ratio:16/9;object-fit:contain}.preview{position:relative}
      .stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.stat{background:color-mix(in srgb,var(--secondary-text-color) 7%,transparent);border:1px solid var(--divider-color);border-radius:10px;padding:9px;text-align:center}.stat b{display:block;font-size:16px}.stat small{font-size:10px;color:var(--secondary-text-color)}
      .controls{gap:8px}.slider{gap:2px}.sliderline{font-size:12px}.sliderline strong{font-size:12px}.slider input{height:18px;accent-color:var(--bolli-accent)}
      .section{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--secondary-text-color);margin:4px 0}
      details{border:1px solid var(--divider-color);border-radius:11px;padding:10px;background:color-mix(in srgb,var(--secondary-text-color) 4%,transparent)}summary{cursor:pointer;font-size:13px;font-weight:500}details .inside{display:grid;gap:10px;margin-top:12px}
      .toggle input{appearance:none;width:34px;height:19px;border-radius:20px;background:var(--disabled-color,#777);position:relative;cursor:pointer}.toggle input:checked{background:var(--bolli-accent)}.toggle input:before{content:'';position:absolute;top:3px;left:3px;width:13px;height:13px;border-radius:50%;background:white}.toggle input:checked:before{left:18px}
      .toggle{font-size:12px}.selectrow{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px}.selectrow select{max-width:55%;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:6px;padding:5px}.notice{font-size:12px;color:var(--error-color);overflow-wrap:anywhere}.notice:empty{display:none}.diagnostic{font-size:12px;overflow-wrap:anywhere;color:var(--secondary-text-color)}
    /* Keep expanded calibration controls inside the available card width. */
      :host{min-width:0;max-width:100%}
      *,*::before,*::after{box-sizing:border-box}
      ha-card{width:100%;min-width:0;max-width:100%}
      .wrap{width:100%;min-width:0;grid-template-columns:minmax(0,1fr)}
      .wrap>*{min-width:0;max-width:100%}
      .controls,details .inside,.slider{min-width:0;grid-template-columns:minmax(0,1fr)}
      details,details .inside>*{min-width:0;max-width:100%}
      .selectrow{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);overflow-wrap:anywhere}
      .selectrow select{width:100%;min-width:0;max-width:100%;text-overflow:ellipsis}
      .slider input[type=range]{display:block;min-width:0;max-width:100%}
      .sliderline span,.toggle span{min-width:0;overflow-wrap:anywhere}
      .sliderline strong,.toggle input{flex-shrink:0}
      .preview img{min-width:0;max-width:100%}
      .stat{min-width:0;overflow-wrap:anywhere}
    /* Use a single vertical flex layout, independent of intrinsic grid sizing. */
      :host{display:block;width:100%;min-width:0;max-width:100%;contain:inline-size}
      ha-card{display:block;width:100%;min-width:0;max-width:100%}
      .wrap{display:flex;flex-direction:column;align-items:stretch;container-type:normal;width:auto;min-width:0;max-width:100%;padding:14px}
      .wrap>*{width:100%;min-width:0;max-width:100%}
      .controls,details .inside,.slider{display:flex;flex-direction:column;align-items:stretch;min-width:0;width:100%;max-width:100%}
      details{display:block;width:100%;min-width:0;max-width:100%}
      details:not([open])>.inside{display:none}
      .selectrow{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;min-width:0;width:100%}
      .selectrow select{display:block;flex:1 1 120px;width:0;min-width:0;max-width:100%}
      .preview{width:100%;min-width:0;aspect-ratio:16/9}
      .preview img{width:100%;height:100%;min-width:0;max-width:100%;object-fit:contain}
      .sliderline{min-width:0;width:100%}
      .slider input[type=range]{width:100%;min-width:0;max-width:100%}
      .mode,.stat{min-width:0;padding-inline:4px}
      .head .heading{min-width:0;flex:1 1 0}
      .power{flex:none}
    </style><ha-card><div class="wrap">
      <div class="head"><div class="glyph"><ha-icon icon="mdi:television-classic"></ha-icon></div><div class="heading"><div class="name"></div><div class="sub"></div></div><button class="power" data-action="power" aria-label="Power"><ha-icon icon="mdi:power"></ha-icon></button></div>
      <div class="preview"></div><div class="stats"></div><div class="modes"></div><div class="controls"></div><details><summary>Calibrazione HyperHDR</summary><div class="inside calibration"></div></details><details><summary>Diagnostica</summary><div class="inside diagnostic"></div></details><div class="notice" role="alert"></div><div class="meta line"></div>
    </div></ha-card>`;
    if (!this._events) {
      this.shadowRoot.addEventListener('click', e => {
        const target = e.target.closest('[data-action]'); if (!target) return;
        const a = target.dataset.action;
        if (a === 'power') this._call('switch','toggle',{entity_id:this._ids.power});
        if (a === 'mode') this._call('select','select_option',{entity_id:this._ids.mode,option:target.dataset.value});
        if (a === 'info') this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:target.dataset.id},bubbles:true,composed:true}));
      });
      this.shadowRoot.addEventListener('pointerdown',e=>{if(e.target.dataset.slider)this._drag=e.target.dataset.slider;});
      this.shadowRoot.addEventListener('pointercancel',()=>{this._drag=null;this._update();});
      this.shadowRoot.addEventListener('input',e=>{if(e.target.dataset.slider)e.target.closest('.slider').querySelector('strong').textContent=e.target.value+' '+e.target.dataset.unit;});
      this.shadowRoot.addEventListener('change',e=>{
        const k=e.target.dataset.slider;
        if(k){const value=Number(e.target.value);this._drag=null;this._pending.set(k,{value,until:Date.now()+5000});this._call('number','set_value',{entity_id:this._ids[k],value},k);}
        const t=e.target.dataset.toggle;if(t)this._call('switch',e.target.checked?'turn_on':'turn_off',{entity_id:this._ids[t]});
        const sel=e.target.dataset.select;if(sel)this._call('select','select_option',{entity_id:this._ids[sel],option:e.target.value});
      });
      this.shadowRoot.addEventListener('pointerup',()=>{this._drag=null;});
      this._events = true;
    }
    this._update();
  }
  async _call(domain,service,data,key){
    try { this.shadowRoot.querySelector('.notice').textContent=''; await this._hass.callService(domain,service,data); }
    catch(e) { if(key)this._pending.delete(key);this.shadowRoot.querySelector('.notice').textContent=e?.message||String(e);this._update();this.dispatchEvent(new CustomEvent('hass-notification',{detail:{message:e?.message || String(e)},bubbles:true,composed:true})); }
  }
  _slider(key,label,unit){
    if(!this._valid(key))return '';
    const s=this._entity(key), a=s.attributes, val=Number(s.state);
    const min=Number.isFinite(Number(a.min))?Number(a.min):0,max=Number.isFinite(Number(a.max))?Number(a.max):100;
    const step=Number.isFinite(Number(a.step))&&Number(a.step)>0?Number(a.step):1;
    const display=this._hass.formatEntityState?.(s) || `${val} ${unit}`;
    return `<label class="slider"><div class="sliderline"><span>${bolliEscape(label)}</span><strong>${bolliEscape(display)}</strong></div><input type="range" data-slider="${key}" data-unit="${unit}" min="${min}" max="${max}" step="${step}" value="${val}" aria-label="${bolliEscape(label)}"></label>`;
  }
  _update(){
    if(!this.shadowRoot.querySelector('.wrap') || !this._hass)return;
    const q=s=>this.shadowRoot.querySelector(s), connected=this._value('connected')==='on';
    const on=this._value('power')==='on', mode=this._value('mode') || 'Auto';
    q('.name').textContent=this._config.name;
    q('.sub').textContent=this._value('power')==='off'||String(mode).toLowerCase()==='off'?'Standby':connected?this._str('ready'):this._str('offline');
    const p=q('.power');p.classList.toggle('on',on);p.disabled=!this._valid('power');p.setAttribute('aria-pressed',String(on));
    const options=this._entity('mode')?.attributes.options || ['Auto','Cinema','Relax','Off'];
    const icons={auto:'mdi:autorenew',cinema:'mdi:movie-open',relax:'mdi:weather-sunset',off:'mdi:power-off'};
    q('.modes').innerHTML=['Auto','Cinema','Relax','Off'].map(name=>{
      const option=options.find(v=>String(v).toLowerCase()===name.toLowerCase());
      const active=String(mode).toLowerCase()===name.toLowerCase();
      return `<button class="mode ${active?'selected':''}" data-action="mode" data-value="${bolliEscape(option||name)}" aria-pressed="${active}" ${!option||!this._valid('mode')?'disabled':''}><ha-icon icon="${icons[name.toLowerCase()]}"></ha-icon>${this._str(name.toLowerCase())}</button>`;
    }).join('');
    const toggle=(k,label)=>this._valid(k)?'<label class="toggle"><span>'+label+'</span><input type="checkbox" data-toggle="'+k+'" aria-label="'+label+'"></label>':'';
    const select=(k,label)=>this._valid(k)?'<label class="selectrow">'+label+'<select data-select="'+k+'">'+(this._entity(k).attributes.options||[]).map(v=>'<option value="'+bolliEscape(v)+'">'+bolliEscape(v)+'</option>').join('')+'</select></label>':'';
    const controls=['<div class="section">Cinema</div>',this._slider('cinema','Luminosità Cinema','%'),this._slider('target','FPS desiderati','FPS'),'<div class="section">Relax</div>',this._slider('relax','Luminosità Relax','%'),this._slider('kelvin','Temperatura colore','K'),'<div class="section">Ambiente</div>',toggle('auto','Luminosità adattiva')];
    const calibration=[this._slider('gamma','Gamma',''),this._slider('saturation','Saturazione',''),this._slider('luminance','Luminanza',''),this._slider('threshold','Soglia retroilluminazione',''),toggle('smoothing','Smoothing'),toggle('border','Rilevamento bande nere'),select('hdr','HDR tone mapping'),select('priority','Sorgente')];
    for(const [selector,items] of [['.controls',controls],['.calibration',calibration]]){
      const box=q(selector),html=items.filter(Boolean).join('');
      const signature=html.replace(/(<input[^>]*?) value="[^"]*"/g,'$1').replace(/<strong>.*?<\/strong>/g,'<strong></strong>');
      if(box._signature!==signature&&!box.contains(this.shadowRoot.activeElement)&&!this._drag){box.innerHTML=html;box._signature=signature;}
      for(const input of box.querySelectorAll('[data-slider]')){
        const k=input.dataset.slider;if(this._drag===k||(this.shadowRoot.activeElement===input&&!this._pending.has(k)))continue;
        const actual=Number(this._value(k)),pending=this._pending.get(k);
        if(pending&&(actual===pending.value||Date.now()>pending.until))this._pending.delete(k);
        const value=this._pending.get(k)?.value??actual;
        if(Number.isFinite(value)){input.value=value;input.closest('.slider').querySelector('strong').textContent=value+' '+input.dataset.unit;}
      }
      for(const input of box.querySelectorAll('[data-toggle]'))input.checked=this._value(input.dataset.toggle)==='on';
      for(const input of box.querySelectorAll('[data-select]'))if(this.shadowRoot.activeElement!==input)input.value=this._value(input.dataset.select);
    }
    q('.stats').innerHTML=[['FPS',this._value('fps')],['LED',this._value('leds')],['LUX',this._value('lux')]].map(([l,v])=>'<div class="stat"><b>'+bolliEscape(v??'—')+'</b><small>'+l+'</small></div>').join('');
    q('.diagnostic').textContent='TV: '+(this._value('tv')??'—')+' · Sorgente: '+(this._value('source')??'—')+' · Target FPS: '+(this._value('target')??'—');
    const status=this._value('status')||this._str('missing');
    const fps=this._value('fps');
    q('.meta').innerHTML=`<span class="chip ${connected?'good':'bad'}"><ha-icon icon="${connected?'mdi:lan-connect':'mdi:lan-disconnect'}"></ha-icon>HyperHDR</span><span class="chip"><ha-icon icon="mdi:information-outline"></ha-icon>${bolliEscape(status)}</span>${fps!==null?`<span class="chip"><ha-icon icon="mdi:speedometer"></ha-icon>${bolliEscape(fps)} FPS</span>`:''}`;
    const preview=q('.preview');preview.classList.toggle('show',Boolean(this._config.show_preview));
    if(this._config.show_preview && !preview.firstChild){preview.innerHTML=`<img alt="${this._str('preview')}">`;}
    this._updateCamera();
  }
  _updateCamera(){
    if(!this._config?.show_preview)return;
    const image=this.shadowRoot.querySelector('.preview img'), s=this._entity('camera');
    if(!image)return;
    const off=this._value('power')==='off'||String(this._value('mode')).toLowerCase()==='off'||String(this._value('status')).toUpperCase()==='OFF';
    const preview=image.parentElement;
    preview.classList.toggle('black',off||!s||!this._valid('camera'));
    if(off||!s||!this._valid('camera')){image.removeAttribute('src');this._cameraLast=0;return;}
    if(document.hidden||!this.isConnected||Date.now()-(this._cameraLast||0)<950)return;
    const token=s.attributes.access_token;
    const path=s.attributes.entity_picture || (token?`/api/camera_proxy/${this._ids.camera}?token=${encodeURIComponent(token)}`:null);
    if(path){const url=this._hass.hassUrl?.(path) || path; this._cameraLast=Date.now();image.src=url+(url.includes('?')?'&':'?')+'_bolli='+this._cameraLast;}
  }
}

class BolliAmbilightCardEditor extends HTMLElement {
  constructor(){super();this.attachShadow({mode:'open'});}
  setConfig(config){this._config={...config};this._render();}
  set hass(hass){this._hass=hass;this._render();}
  _render(){
    if(!this._config)return;
    this.shadowRoot.innerHTML=`<div style="display:grid;gap:14px;padding:12px;color:var(--primary-text-color)"><label>Nome<br><input data-key="name" value="${bolliEscape(this._config.name||'Bolli Ambilight')}" style="width:95%;padding:10px"></label><label><input type="checkbox" data-key="show_preview" ${this._config.show_preview?'checked':''}> Mostra anteprima HyperHDR</label><small>Le entità predefinite sono quelle di Bolli Ambilight. Puoi sovrascriverle nel YAML con power_entity, mode_entity, ecc.</small></div>`;
    this.shadowRoot.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{
      const key=input.dataset.key;this._config[key]=input.type==='checkbox'?input.checked:input.value;
      this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:{...this._config}},bubbles:true,composed:true}));
    }));
  }
}

function registerBolli(){
  const r=window.customElements;
  if(!r.get('bolli-ambilight-card'))r.define('bolli-ambilight-card',BolliAmbilightCard);
  if(!r.get('bolli-ambilight-card-editor'))r.define('bolli-ambilight-card-editor',BolliAmbilightCardEditor);
}
if(window.customElements.get('home-assistant')||window.customElements.get('hc-main'))registerBolli();
else Promise.race([window.customElements.whenDefined('home-assistant'),window.customElements.whenDefined('hc-main'),new Promise(r=>setTimeout(r,30000))]).then(registerBolli);
window.customCards ||= [];
if(!window.customCards.some(c=>c.type==='bolli-ambilight-card'))window.customCards.push({type:'bolli-ambilight-card',name:'Bolli Ambilight',description:'Cinema, Relax e HyperHDR',preview:true});
console.info(`Bolli Ambilight Card ${BOLLI_VERSION}`);
