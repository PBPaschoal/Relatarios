(function(){
  var form = document.getElementById('loginForm');
  var errorEl = document.getElementById('loginError');
  var btn = document.getElementById('loginBtn');

  form.addEventListener('submit', function(e){
    e.preventDefault();
    errorEl.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    fetch('api/auth.php?action=login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('username').value.trim(),
        password: document.getElementById('password').value
      })
    })
    .then(function(res){
      return res.json().then(function(data){ return { ok: res.ok, data: data }; });
    })
    .then(function(r){
      if(!r.ok){ throw new Error(r.data.error || 'Falha ao entrar.'); }
      window.location.href = 'index.html';
    })
    .catch(function(err){
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    })
    .finally(function(){
      btn.disabled = false;
      btn.textContent = 'Entrar';
    });
  });
})();