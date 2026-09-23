const API = {
  base: '',
  token(){ return localStorage.getItem('umkm_token'); },
  user(){ try { return JSON.parse(localStorage.getItem('umkm_user') || 'null'); } catch(e){ return null; } },
  setSession(token, user){
    localStorage.setItem('umkm_token', token);
    localStorage.setItem('umkm_user', JSON.stringify(user));
  },
  clearSession(){
    localStorage.removeItem('umkm_token');
    localStorage.removeItem('umkm_user');
  },
  async call(method, path, body){
    const headers = { 'Content-Type': 'application/json' };
    const t = this.token();
    if (t) headers['Authorization'] = 'Bearer ' + t;
    let res, data;
    try{
      res = await fetch(this.base + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      data = await res.json().catch(() => ({}));
    }catch(e){
      throw { network: true, error: 'Tidak ada koneksi internet. Data akan disimpan lokal dulu jika memungkinkan.' };
    }
    if (!res.ok){
      if (res.status === 401){ API.clearSession(); location.href = '/login.html'; }
      throw data;
    }
    return data;
  },
  get(path){ return this.call('GET', path); },
  post(path, body){ return this.call('POST', path, body); },
  put(path, body){ return this.call('PUT', path, body); },
  del(path){ return this.call('DELETE', path); }
};

function toast(msg, ms = 2600){
  let el = document.querySelector('.toast');
  if (!el){ el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}

function rupiah(n){
  return 'Rp' + Number(n || 0).toLocaleString('id-ID');
}

function updateOfflineBadge(){
  let el = document.querySelector('.badge-offline');
  if (!el){
    el = document.createElement('div');
    el.className = 'badge-offline';
    el.textContent = '⚠️ Mode offline — data tersimpan lokal';
    document.body.appendChild(el);
  }
  el.classList.toggle('show', !navigator.onLine);
}
window.addEventListener('online', () => { updateOfflineBadge(); if (window.OfflineSync) OfflineSync.syncAll(); });
window.addEventListener('offline', updateOfflineBadge);
document.addEventListener('DOMContentLoaded', updateOfflineBadge);
