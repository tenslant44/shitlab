
(() => {
  'use strict';

  const GAME_ID = 'fix-click';
  const SAVE_KEY = 'click-lab-progress';
  const LOCAL_KEY = 'click_lab_standalone_v1';
  const $ = id => document.getElementById(id);

  const achievements = [
    {id:'first-click', icon:'⚡', title:'Power On', desc:'Generate energy for the first time.', test:s=>s.clicks>=1},
    {id:'hundred-energy', icon:'🔋', title:'Pocket Charge', desc:'Earn 100 total energy.', test:s=>s.total>=100},
    {id:'thousand-energy', icon:'💠', title:'Energy Rush', desc:'Earn 1,000 total energy.', test:s=>s.total>=1000},
    {id:'ten-thousand-energy', icon:'🌌', title:'Power Surge', desc:'Earn 10,000 total energy.', test:s=>s.total>=10000},
    {id:'first-upgrade', icon:'🛠️', title:'Tinkerer', desc:'Buy your first upgrade.', test:s=>s.clickUpgrade+s.auto+s.multi>=1},
    {id:'click-upgrade-5', icon:'👆', title:'Finger of Fury', desc:'Buy 5 Power Click upgrades.', test:s=>s.clickUpgrade>=5},
    {id:'auto-tapper', icon:'⏱️', title:'Never Idle', desc:'Own your first Auto Tapper.', test:s=>s.auto>=1},
    {id:'auto-fleet', icon:'🤖', title:'Automation Nation', desc:'Own 10 Auto Tappers.', test:s=>s.auto>=10},
    {id:'multiplier', icon:'✖️', title:'Double Trouble', desc:'Buy a Quantum Multiplier.', test:s=>s.multi>=1},
    {id:'multiplier-3', icon:'🌀', title:'Quantum Leap', desc:'Buy 3 Quantum Multipliers.', test:s=>s.multi>=3},
    {id:'hundred-clicks', icon:'🖱️', title:'Click Enthusiast', desc:'Click the core 100 times.', test:s=>s.clicks>=100},
    {id:'level-10', icon:'🏆', title:'Lab Legend', desc:'Reach level 10.', test:s=>1+Math.floor(s.total/100)>=10}
  ];

  const defaults = () => ({
    energy:0,
    total:0,
    clicks:0,
    clickUpgrade:0,
    auto:0,
    multi:0,
    unlocked:[],
    lastTick:Date.now()
  });

  let state = readLocal();
  let sdk = null;
  let connected = false;
  let busy = false;
  let saveTimer = null;

  function readLocal() {
    try {
      return clean(Object.assign(defaults(), JSON.parse(localStorage.getItem(LOCAL_KEY)||'{}')));
    } catch {
      return defaults();
    }
  }

  function clean(input) {
    const d = defaults();
    for (const k of ['energy','total','clicks','clickUpgrade','auto','multi']) {
      const n = Number(input[k]);
      d[k] = Number.isFinite(n) && n >= 0 ? Math.min(Math.floor(n),1e12) : 0;
    }
    d.unlocked = Array.isArray(input.unlocked)
      ? input.unlocked.filter(x => achievements.some(a => a.id === x))
      : [];
    d.lastTick = Date.now();
    return d;
  }

  function saveLocal() {
    try {
      localStorage.setItem(LOCAL_KEY,JSON.stringify(state));
    } catch {}
  }

  const fmt = n => Math.floor(n).toLocaleString();
  const clickPower = () => (1+state.clickUpgrade)*Math.pow(2,state.multi);
  const perSecond = () => state.auto*Math.pow(2,state.multi);

  const costs = () => ({
    click:Math.floor(25*Math.pow(1.65,state.clickUpgrade)),
    auto:Math.floor(60*Math.pow(1.7,state.auto)),
    multi:Math.floor(150*Math.pow(3.1,state.multi))
  });

  function render() {
    const c = costs();
    $('energy').textContent = fmt(state.energy);
    $('total').textContent = fmt(state.total);
    $('power').textContent = fmt(clickPower());
    $('eps').textContent = fmt(perSecond());
    $('level').textContent = fmt(1+Math.floor(state.total/100));
    $('click-owned').textContent = state.clickUpgrade;
    $('auto-owned').textContent = state.auto;
    $('multi-owned').textContent = state.multi;
    $('click-cost').textContent = fmt(c.click)+' ⚡';
    $('auto-cost').textContent = fmt(c.auto)+' ⚡';
    $('multi-cost').textContent = fmt(c.multi)+' ⚡';
    $('buy-click').disabled = state.energy<c.click;
    $('buy-auto').disabled = state.energy<c.auto;
    $('buy-multi').disabled = state.energy<c.multi;

    const p = state.total%100;
    $('progress-label').textContent = fmt(p)+' / 100 XP';
    $('progress').style.width = p+'%';
    $('achievement-count').textContent = state.unlocked.length+' / '+achievements.length;
    $('achievement-progress').style.width = (state.unlocked.length/achievements.length*100)+'%';

    $('achievement-grid').innerHTML = achievements.map(a => {
      const on = state.unlocked.includes(a.id);
      return `<article class="achievement ${on?'unlocked':''}"><div class="badge-icon">${a.icon}</div><h3>${a.title}</h3><p>${a.desc}</p><span class="unlocked-label">${on?'✓ UNLOCKED':'◇ LOCKED'}</span></article>`;
    }).join('');

    $('connect').textContent = connected ? 'Tenslant ID Connected ✓' : 'Connect Tenslant ID';
    $('connect').disabled = connected;
    $('sync').disabled = !connected || busy;
  }

  function status(message,kind='') {
    const e = $('status');
    e.textContent = message;
    e.className = 'status '+kind;
  }

  function floater(amount) {
    const host = $('floaters');
    const el = document.createElement('span');
    el.className = 'floater';
    el.textContent = '+'+fmt(amount)+' ⚡';
    el.style.left = (32+Math.random()*38)+'%';
    el.style.top = (38+Math.random()*22)+'%';
    host.appendChild(el);
    setTimeout(() => el.remove(),950);
  }

  function earn(amount,click) {
    if (!Number.isFinite(amount)||amount<=0) return;
    state.energy = Math.min(1e12,state.energy+amount);
    state.total = Math.min(1e12,state.total+amount);
    if (click) state.clicks++;
    checkAchievements();
    saveLocal();
    render();
    if (connected) scheduleSave();
  }

  function buy(type) {
    const c = costs()[type];
    if (state.energy<c) return;
    state.energy-=c;
    if (type==='click') state.clickUpgrade++;
    if (type==='auto') state.auto++;
    if (type==='multi') state.multi++;
    checkAchievements();
    saveLocal();
    render();
    if (connected) scheduleSave();
  }

  function checkAchievements() {
    for (const a of achievements) {
      if (!state.unlocked.includes(a.id)&&a.test(state)) {
        state.unlocked.push(a.id);
        if (connected&&sdk) {
          sdk.unlockAchievement(
            a.id,
            a.title,
            {totalEnergy:Math.floor(state.total),clicks:state.clicks}
          ).catch(()=>{});
        }
        status('Achievement unlocked: '+a.title+'!','good');
      }
    }
  }

  function makeSdk() {
    const cfg = window.CLICK_LAB_CONFIG||{};
    if (!cfg.apiBase||cfg.apiBase.includes('YOUR-TENSLANT-ID-WORKER')) {
      throw new Error('Set apiBase in config.js to your Tenslant ID Worker URL first.');
    }

    return new window.TenslantID({
      apiBase:cfg.apiBase,
      clientId:GAME_ID,
      redirectUri:cfg.redirectUri||location.origin+location.pathname
    });
  }

  async function connect() {
    try {
      sdk = makeSdk();
      await sdk.authorize([
        'profile',
        'saves:read',
        'saves:write',
        'stats:write',
        'achievements:write'
      ]);
    } catch(e) {
      status(
        (e.message||'Could not start Tenslant ID authorization.')+
        ' Check that Click Lab is registered in Tenslant ID with this exact site URL.',
        'error'
      );
    }
  }

  function markConnected(user) {
    connected = true;
    $('account-title').textContent = 'Connected as '+(user.username||'Tenslant ID player');
    $('account-subtitle').textContent = 'Cloud saves and achievements enabled.';
    status('Connected to Tenslant ID. Your progress can sync.','good');
    checkAchievements();
    render();
  }

  function mergeRemote(remote) {
    const d = remote&&(remote.data||remote.save&&remote.save.data);
    if (!d||typeof d!=='object') return false;
    const incoming = clean(d);

    if (incoming.total>=state.total) {
      state = incoming;
    } else {
      state.unlocked = [...new Set([...state.unlocked,...incoming.unlocked])];
    }

    saveLocal();
    checkAchievements();
    render();
    return true;
  }

  async function syncCloud() {
    if (!connected||!sdk||busy) return;
    busy = true;
    render();
    status('Loading cloud save…');

    try {
      const remote = await sdk.load(SAVE_KEY);
      mergeRemote(remote);
      status('Cloud save loaded.','good');
    } catch(e) {
      if (/save_not_found|not_found/i.test(e.message||'')) {
        status('No cloud save yet. Your local progress is ready to upload.','good');
      } else {
        status('Cloud load failed: '+(e.message||'unknown error'),'error');
      }
    } finally {
      busy = false;
      render();
    }
  }

  async function uploadCloud() {
    if (!connected||!sdk||busy) return;
    busy = true;
    render();

    try {
      await sdk.save(SAVE_KEY,state);
      sdk.setStat('total-energy',Math.floor(state.total)).catch(()=>{});
      sdk.setStat('core-clicks',state.clicks).catch(()=>{});
      status('Progress synced to Tenslant ID.','good');
    } catch(e) {
      status('Cloud save failed: '+(e.message||'unknown error'),'error');
    } finally {
      busy = false;
      render();
    }
  }

  function scheduleSave() {
    if (!connected||saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      uploadCloud();
    },3000);
  }

  async function init() {
    $('core').addEventListener('click',e => {
      const p = clickPower();
      earn(p,true);
      floater(p);
    });

    $('buy-click').addEventListener('click',()=>buy('click'));
    $('buy-auto').addEventListener('click',()=>buy('auto'));
    $('buy-multi').addEventListener('click',()=>buy('multi'));
    $('connect').addEventListener('click',connect);
    $('sync').addEventListener('click',uploadCloud);

    $('reset').addEventListener('click',()=>{
      if (confirm('Reset your local Click Lab progress? This does not delete your Tenslant ID cloud save.')) {
        state = defaults();
        saveLocal();
        render();
        status('Local progress reset. Your cloud save was not changed.');
      }
    });

    checkAchievements();
    render();

    if (!window.TenslantID) {
      status('SDK unavailable. Local play still works.','error');
      return;
    }

    try {
      sdk = makeSdk();
      const returned = await sdk.handleCallback();

      if (returned) {
        const info = await sdk.me();
        markConnected(info.user||{});
        await syncCloud();
        return;
      }

      const token = sessionStorage.getItem('tenslant_id_token_'+GAME_ID);

      if (token) {
        try {
          const info = await sdk.me();
          markConnected(info.user||{});
        } catch {
          status('Your Tenslant ID session expired. Reconnect to sync.','error');
        }
      }
    } catch(e) {
      if (!/Set apiBase/.test(e.message||'')) {
        status(e.message||'Tenslant ID is not connected.','error');
      }
    }
  }

  setInterval(()=>{
    if (state.auto>0) earn(perSecond(),false);
  },1000);

  window.addEventListener('beforeunload',saveLocal);
  init();
})();
