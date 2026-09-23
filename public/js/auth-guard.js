(function(){
  const publicPages = ['/login.html', '/toko.html', '/marketplace.html', '/perizinan.html', '/belajar.html'];
  const path = location.pathname;
  const isPublic = publicPages.some(p => path.endsWith(p)) || path === '/' && false;
  if (!API.token() && !isPublic){
    location.href = '/login.html';
  }
})();
