(function () {
  var form = document.getElementById('loginForm');
  var errorEl = document.getElementById('loginError');
  var btn = document.getElementById('loginBtn');

  form.addEventListener('submit', function (e) {
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
      .then(function (res) {
        return res.text().then(function (raw) {
          var data;
          try {
            data = raw ? JSON.parse(raw) : {};
          } catch (e) {
            throw new Error('Resposta inválida do servidor: "' + raw.slice(0, 200) + '"');
          }
          if (!res.ok) { throw new Error(data.error || ('Erro ' + res.status)); }
          return data;
        });
      })
      .then(function (data) {
        window.location.href = 'index.html';
      })
      .catch(function (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = 'Entrar';
      });
  });
})();