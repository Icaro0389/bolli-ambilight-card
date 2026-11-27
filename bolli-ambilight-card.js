/* Bolli Ambilight Card — Home Assistant custom card, v0.1.0 */
const BOLLI_VERSION = '0.1.0';
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
};
const BOLLI_LABELS = {
  it: { ready:'Connesso a HyperHDR', offline:'HyperHDR non disponibile', power:'Accensione', cinema:'Cinema', relax:'Relax', off:'Off', auto:'Auto', brightness:'Luminosità', temperature:'Temperatura', fps:'FPS desiderati', ambient:'Luminosità automatica', preview:'Anteprima LED', status:'Stato', missing:'Entità non disponibile' },
  en: { ready:'Connected to HyperHDR', offline:'HyperHDR unavailable', power:'Power', cinema:'Cinema', relax:'Relax', off:'Off', auto:'Auto', brightness:'Brightness', temperature:'Temperature', fps:'Target FPS', ambient:'Adaptive brightness', preview:'LED preview', status:'Status', missing:'Entity unavailable' }
};
const bolliEscape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

class BolliAmbilightCard extends HTMLElement {
  static getStubConfig() { return { type: 'custom:bolli-ambilight-card', name: 'Bolli Ambilight', show_preview: false }; }
  static getConfigElement() { return document.createElement('bolli-ambilight-card-editor'); }
  constructor() { super(); this.attachShadow({mode:'open'}); this._events = false; }
  setConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Configurazione non valida');
    this._config = { show_preview:false, name:'Bolli Ambilight', ...config };
    this._ids = Object.fromEntries(Object.keys(BOLLI_DEFAULTS).map(k => [k, this._config[`${k}_entity`] || BOLLI_DEFAULTS[k]]));
    this._build();
  }
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
      .preview img{display:block;width:100%;max-height:210px;object-fit:contain}.preview.show{display:flex}
      @container(max-width:315px){.mode{font-size:11px}.wrap{padding:12px;gap:12px}.modes{gap:4px}}
      @media(prefers-reduced-motion:reduce){*{transition:none!important}}
    </style><ha-card><div class="wrap">
      <div class="head"><div class="glyph"><ha-icon icon="mdi:television-classic"></ha-icon></div><div class="heading"><div class="name"></div><div class="sub"></div></div><button class="power" data-action="power" aria-label="Power"><ha-icon icon="mdi:power"></ha-icon></button></div>
      <div class="modes"></div><div class="controls"></div><div class="preview"></div><div class="meta line"></div>
    </div></ha-card>`;
    if (!this._events) {
      this.shadowRoot.addEventListener('click', e => {
        const target = e.target.closest('[data-action]'); if (!target) return;
        const a = target.dataset.action;
        if (a === 'power') this._call('switch','toggle',{entity_id:this._ids.power});
        if (a === 'mode') this._call('select','select_option',{entity_id:this._ids.mode,option:target.dataset.value});
        if (a === 'info') this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:target.dataset.id},bubbles:true,composed:true}));
      });
      this.shadowRoot.addEventListener('change', e => {
        const k=e.target.dataset.slider;
        if(k) this._call('number','set_value',{entity_id:this._ids[k],value:Number(e.target.value)});
        if(e.target.dataset.toggle==='auto') this._call('switch',e.target.checked?'turn_on':'turn_off',{entity_id:this._ids.auto});
      });
      this._events = true;
    }
    this._update();
  }
  async _call(domain,service,data){
    try { await this._hass.callService(domain,service,data); }
    catch(e) { this.dispatchEvent(new CustomEvent('hass-notification',{detail:{message:e?.message || String(e)},bubbles:true,composed:true})); }
  }
  _slider(key,label,unit){
    if(!this._valid(key))return '';
    const s=this._entity(key), a=s.attributes, val=Number(s.state);
    const min=Number.isFinite(Number(a.min))?Number(a.min):0,max=Number.isFinite(Number(a.max))?Number(a.max):100;
    const step=Number.isFinite(Number(a.step))&&Number(a.step)>0?Number(a.step):1;
    const display=this._hass.formatEntityState?.(s) || `${val} ${unit}`;
    return `<label class="slider"><div class="sliderline"><span>${bolliEscape(label)}</span><strong>${bolliEscape(display)}</strong></div><input type="range" data-slider="${key}" min="${min}" max="${max}" step="${step}" value="${val}" aria-label="${bolliEscape(label)}"></label>`;
  }
  _update(){
    if(!this.shadowRoot.querySelector('.wrap') || !this._hass)return;
    const q=s=>this.shadowRoot.querySelector(s), connected=this._value('connected')==='on';
    const on=this._value('power')==='on', mode=this._value('mode') || 'Auto';
    q('.name').textContent=this._config.name;
    q('.sub').textContent=connected?this._str('ready'):this._str('offline');
    const p=q('.power');p.classList.toggle('on',on);p.disabled=!this._valid('power');p.setAttribute('aria-pressed',String(on));
    const options=this._entity('mode')?.attributes.options || ['Auto','Cinema','Relax','Off'];
    const icons={auto:'mdi:autorenew',cinema:'mdi:movie-open',relax:'mdi:weather-sunset',off:'mdi:power-off'};
    q('.modes').innerHTML=['Auto','Cinema','Relax','Off'].map(name=>{
      const option=options.find(v=>String(v).toLowerCase()===name.toLowerCase());
      const active=String(mode).toLowerCase()===name.toLowerCase();
      return `<button class="mode ${active?'selected':''}" data-action="mode" data-value="${bolliEscape(option||name)}" aria-pressed="${active}" ${!option||!this._valid('mode')?'disabled':''}><ha-icon icon="${icons[name.toLowerCase()]}"></ha-icon>${this._str(name.toLowerCase())}</button>`;
    }).join('');
    const isRelax=String(mode).toLowerCase()==='relax';
    const activeKey=isRelax?'relax':'cinema';
    const isOff=String(mode).toLowerCase()==='off'||!on;
    const controls=isOff?[]:[this._slider(activeKey,this._str('brightness'),'%')];
    if(!isOff && isRelax)controls.push(this._slider('kelvin',this._str('temperature'),'K'));
    if(!isOff && !isRelax)controls.push(this._slider('target',this._str('fps'),'FPS'));
    if(!isOff && this._valid('auto'))controls.push(`<label class="toggle"><span>${this._str('ambient')}</span><input data-toggle="auto" type="checkbox" ${this._value('auto')==='on'?'checked':''} aria-label="${this._str('ambient')}"></label>`);
    // Keep focused slider alive while HA reports unrelated state updates.
    const box=q('.controls');if(!box.contains(this.shadowRoot.activeElement))box.innerHTML=controls.filter(Boolean).join('');
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
    if(!image || !s || !this._valid('camera'))return;
    const token=s.attributes.access_token;
    const path=s.attributes.entity_picture || (token?`/api/camera_proxy/${this._ids.camera}?token=${encodeURIComponent(token)}`:null);
    if(path){const url=this._hass.hassUrl?.(path) || path; if(image.src!==url)image.src=url;}
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
