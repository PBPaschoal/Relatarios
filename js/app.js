(function(){
  var ENTRIES_API = '/api/entries.php';
  var AUTH_API = '/api/auth.php';

  var state = { date: new Date(), entries: [], user: null };
  var editingId = null;
  var currentOpenEntry = null;
  var lampTimer = null;
  var toastTimer = null;

  function pad(n){ return String(n).padStart(2,'0'); }
  function dateKey(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function isToday(d){ return dateKey(d) === dateKey(new Date()); }
  function nowHHMM(){ var n = new Date(); return pad(n.getHours())+':'+pad(n.getMinutes()); }
  function minutesOf(hhmm){ var p = hhmm.split(':'); return parseInt(p[0],10)*60 + parseInt(p[1],10); }
  function fmtHHMM(totalMin){
    totalMin = ((totalMin % 1440) + 1440) % 1440;
    return pad(Math.floor(totalMin/60)) + ':' + pad(totalMin % 60);
  }
  function dateLabelText(d){
    return d.toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'short' }).replace('.', '');
  }
  function escapeHTML(s){ var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function apiCall(url, opts){
    opts = opts || {};
    return fetch(url, {
      method: opts.method || 'GET',
      credentials: 'same-origin',
      headers: Object.assign({ 'Content-Type':'application/json' }, opts.headers || {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function(res){
      return res.json().catch(function(){ return {}; }).then(function(data){
        if(!res.ok){ throw new Error(data.error || ('Erro ' + res.status)); }
        return data;
      });
    });
  }

  var els = {};
  ['toastBanner','manageUsersBtn','logoutBtn','dateLabel','subtitle','prevDay','nextDay',
   'lampBanner','lampDot','lampLabel','lampActivity','lampElapsed','lampStopBtn',
   'ledger','emptyState','addOverlay','sheetTitle','entryText','entryTime','entryEndTime','clearEnd',
   'deleteEntry','cancelEntry','saveEntry','openAdd','openReport','reportOverlay','reportPreview',
   'closeReport','copyReport','pdfReport','toast','usersOverlay','newName','newUsername','newPassword',
   'newRole','newUserMsg','closeUsers','createUserBtn']
   .forEach(function(id){ els[id] = document.getElementById(id); });

  function showToast(msg, isError){
    els.toastBanner.textContent = msg;
    els.toastBanner.className = 'toast-banner' + (isError ? ' toast-error' : '');
    els.toastBanner.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ els.toastBanner.hidden = true; }, 3500);
  }

  function sortedEntries(){
    return state.entries.slice().sort(function(a,b){ return minutesOf(a.time) - minutesOf(b.time); });
  }
  function computeSpans(list){
    return list.map(function(e, i){
      var endLabel, open;
      if(e.end){ endLabel = e.end; open = false; }
      else if(list[i+1]){ endLabel = list[i+1].time; open = false; }
      else if(isToday(state.date)){ endLabel = null; open = true; }
      else { endLabel = 'sem encerramento registrado'; open = false; }
      return { entry: e, endLabel: endLabel, open: open };
    });
  }

  function refreshFromServer(){
    return apiCall(ENTRIES_API + '?action=list&date=' + dateKey(state.date)).then(function(list){
      state.entries = list;
      render();
    }).catch(function(err){
      showToast('Não foi possível carregar os dados: ' + err.message, true);
    });
  }

  function render(){
    els.dateLabel.textContent = dateLabelText(state.date);
    var who = state.user ? state.user.name : '';
    els.subtitle.textContent = (isToday(state.date) ? 'hoje · ' : '') + 'registro de atividades — ' + who;
    els.nextDay.disabled = isToday(state.date);

    var list = sortedEntries();
    var spans = computeSpans(list);
    els.ledger.innerHTML = '';
    els.emptyState.hidden = list.length > 0;
    els.ledger.style.display = list.length > 0 ? 'block' : 'none';

    var groups = { manha: [], tarde: [] };
    spans.forEach(function(s){ (minutesOf(s.entry.time) < 720 ? groups.manha : groups.tarde).push(s); });

    function addDivider(label){
      var div = document.createElement('div');
      div.className = 'ledger-divider';
      div.textContent = label;
      els.ledger.appendChild(div);
    }
    function addRow(s){
      var spanLabel = s.entry.time + ' – ' + (s.open ? 'em andamento' : s.endLabel);
      var row = document.createElement('div');
      row.className = 'ledger-row';
      row.innerHTML =
        '<div class="ledger-time">'+s.entry.time+'</div>' +
        '<div class="ledger-text">'+escapeHTML(s.entry.text)+'<span class="ledger-span">'+spanLabel+'</span></div>';
      row.addEventListener('click', function(){ openSheet(s.entry); });
      els.ledger.appendChild(row);
    }

    if(groups.manha.length){ addDivider('Manhã'); groups.manha.forEach(addRow); }
    if(groups.tarde.length){ addDivider('Tarde'); groups.tarde.forEach(addRow); }

    renderLamp(spans);
  }

  function renderLamp(spans){
    if(lampTimer){ clearInterval(lampTimer); lampTimer = null; }
    var openSpan = spans.find(function(s){ return s.open; });
    if(!openSpan){ els.lampBanner.hidden = true; currentOpenEntry = null; return; }
    var entry = openSpan.entry;
    currentOpenEntry = entry;
    els.lampBanner.hidden = false;
    els.lampActivity.textContent = entry.text;

    function tick(){
      var elapsed = minutesOf(nowHHMM()) - minutesOf(entry.time);
      if(elapsed < 0) elapsed += 1440;
      var color, label;
      if(elapsed <= 90){ color = 'var(--lamp-calm)'; label = 'EM ANDAMENTO'; }
      else if(elapsed <= 180){ color = 'var(--lamp-warn)'; label = 'EM ANDAMENTO'; }
      else { color = 'var(--lamp-alert)'; label = 'AINDA NESSA ATIVIDADE?'; }
      els.lampDot.style.background = color;
      els.lampLabel.style.color = color;
      els.lampLabel.textContent = label;
      els.lampElapsed.textContent = 'iniciada às ' + entry.time + ' · há ' + elapsed + ' min';
    }
    tick();
    lampTimer = setInterval(tick, 30000);
  }

  function openSheet(entry){
    editingId = entry ? entry.id : null;
    els.sheetTitle.textContent = entry ? 'Editar atividade' : 'Nova atividade';
    els.entryText.value = entry ? entry.text : '';
    els.entryTime.value = entry ? entry.time : nowHHMM();
    els.entryEndTime.value = entry && entry.end ? entry.end : '';
    els.deleteEntry.hidden = !entry;
    els.addOverlay.hidden = false;
    els.entryText.focus();
  }
  function closeSheet(){ els.addOverlay.hidden = true; editingId = null; }

  els.openAdd.addEventListener('click', function(){ openSheet(null); });
  els.cancelEntry.addEventListener('click', closeSheet);
  els.addOverlay.addEventListener('click', function(e){ if(e.target === els.addOverlay) closeSheet(); });

  els.lampStopBtn.addEventListener('click', function(){
    if(!currentOpenEntry) return;
    apiCall(ENTRIES_API + '?action=save', { method:'POST', body:{
      id: currentOpenEntry.id, date: dateKey(state.date),
      time: currentOpenEntry.time, end: nowHHMM(), text: currentOpenEntry.text
    }}).then(refreshFromServer).catch(function(err){
      showToast('Erro ao encerrar: ' + err.message, true);
    });
  });

  document.querySelectorAll('.quick-adjust .qa-start').forEach(function(btn){
    btn.addEventListener('click', function(){
      var min = parseInt(btn.getAttribute('data-min'),10);
      els.entryTime.value = fmtHHMM(minutesOf(nowHHMM()) + min);
    });
  });
  document.querySelectorAll('.quick-adjust .qa-end').forEach(function(btn){
    btn.addEventListener('click', function(){
      var min = parseInt(btn.getAttribute('data-min'),10);
      els.entryEndTime.value = fmtHHMM(minutesOf(nowHHMM()) + min);
    });
  });
  els.clearEnd.addEventListener('click', function(){ els.entryEndTime.value = ''; });

  els.saveEntry.addEventListener('click', function(){
    var text = els.entryText.value.trim();
    var time = els.entryTime.value;
    var end = els.entryEndTime.value || '';
    if(!text){ els.entryText.focus(); return; }
    if(!time){ els.entryTime.focus(); return; }
    var payload = { date: dateKey(state.date), time: time, end: end, text: text };
    if(editingId) payload.id = editingId;
    els.saveEntry.disabled = true;
    apiCall(ENTRIES_API + '?action=save', { method:'POST', body: payload })
      .then(function(){ closeSheet(); return refreshFromServer(); })
      .catch(function(err){ showToast('Erro ao salvar: ' + err.message, true); })
      .finally(function(){ els.saveEntry.disabled = false; });
  });

  els.deleteEntry.addEventListener('click', function(){
    if(!editingId) return;
    apiCall(ENTRIES_API + '?action=delete', { method:'POST', body:{ id: editingId } })
      .then(function(){ closeSheet(); return refreshFromServer(); })
      .catch(function(err){ showToast('Erro ao excluir: ' + err.message, true); });
  });

  function goToDay(offset){
    var d = new Date(state.date);
    d.setDate(d.getDate() + offset);
    if(offset > 0 && d > new Date()) return;
    state.date = d;
    refreshFromServer();
  }
  els.prevDay.addEventListener('click', function(){ goToDay(-1); });
  els.nextDay.addEventListener('click', function(){ goToDay(1); });

  function buildReportText(){
    var list = sortedEntries();
    var spans = computeSpans(list);
    var who = state.user ? state.user.name : '';
    var lines = ['DIÁRIO DE BORDO — ' + who, dateLabelText(state.date), ''];
    spans.forEach(function(s){
      var endLabel = s.open ? 'em andamento' : s.endLabel;
      lines.push(s.entry.time + ' até ' + endLabel);
      lines.push(s.entry.text);
      lines.push('');
    });
    lines.push('Total de atividades: ' + list.length);
    return lines.join('\n');
  }

  els.openReport.addEventListener('click', function(){
    els.reportPreview.textContent = buildReportText();
    els.toast.hidden = true;
    els.reportOverlay.hidden = false;
  });
  els.closeReport.addEventListener('click', function(){ els.reportOverlay.hidden = true; });
  els.reportOverlay.addEventListener('click', function(e){ if(e.target === els.reportOverlay) els.reportOverlay.hidden = true; });

  els.copyReport.addEventListener('click', function(){
    var text = els.reportPreview.textContent;
    function showLocalToast(){ els.toast.hidden = false; els.toast.textContent = 'Copiado!'; setTimeout(function(){ els.toast.hidden = true; }, 1800); }
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(showLocalToast).catch(function(){
        els.toast.hidden = false; els.toast.textContent = 'Não foi possível copiar — selecione o texto manualmente.';
      });
    } else {
      els.toast.hidden = false; els.toast.textContent = 'Selecione o texto acima para copiar.';
    }
  });

  els.pdfReport.addEventListener('click', function(){
    var list = sortedEntries();
    var spans = computeSpans(list);
    var who = state.user ? state.user.name : '';
    var doc = new jspdf.jsPDF({ unit:'mm', format:'a4' });
    var pageW = doc.internal.pageSize.getWidth();
    var marginX = 14;
    var y;

    function drawHeader(){
      doc.setFillColor(11,34,64);
      doc.rect(0,0,pageW,26,'F');
      doc.setTextColor(243,236,220);
      doc.setFont('helvetica','bold'); doc.setFontSize(15);
      doc.text('DIÁRIO DE BORDO', marginX, 13);
      doc.setFont('helvetica','normal'); doc.setFontSize(10);
      doc.text(who + ' · ' + dateLabelText(state.date), marginX, 20);
      y = 36;
    }
    drawHeader();

    doc.setTextColor(27,42,61);
    spans.forEach(function(s, i){
      var endLabel = s.open ? 'em andamento' : s.endLabel;
      var span = s.entry.time + ' – ' + endLabel;
      doc.setFont('courier','bold'); doc.setFontSize(10.5);
      doc.setTextColor(192,138,40);
      doc.text(span, marginX, y);

      doc.setFont('helvetica','normal'); doc.setFontSize(11);
      doc.setTextColor(27,42,61);
      var lines = doc.splitTextToSize(s.entry.text, pageW - marginX - 50);
      doc.text(lines, marginX + 38, y);

      var blockHeight = Math.max(lines.length * 5, 6) + 6;
      y += blockHeight;
      doc.setDrawColor(220,207,175);
      doc.line(marginX, y - 3, pageW - marginX, y - 3);

      if(y > 270 && i < spans.length - 1){
        doc.addPage();
        drawHeader();
      }
    });

    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.setTextColor(140,140,140);
    doc.text('Total de atividades: ' + list.length, marginX, 285);

    doc.save('diario-de-bordo-' + dateKey(state.date) + '.pdf');
  });

  els.manageUsersBtn.addEventListener('click', function(){
    els.newUserMsg.textContent = '';
    els.newName.value = '';
    els.newUsername.value = '';
    els.newPassword.value = '';
    els.newRole.value = 'user';
    els.usersOverlay.hidden = false;
  });
  els.closeUsers.addEventListener('click', function(){ els.usersOverlay.hidden = true; });
  els.usersOverlay.addEventListener('click', function(e){ if(e.target === els.usersOverlay) els.usersOverlay.hidden = true; });

  els.createUserBtn.addEventListener('click', function(){
    var payload = {
      name: els.newName.value.trim(),
      username: els.newUsername.value.trim(),
      password: els.newPassword.value,
      role: els.newRole.value
    };
    els.createUserBtn.disabled = true;
    apiCall(AUTH_API + '?action=create_user', { method:'POST', body: payload })
      .then(function(){
        els.newUserMsg.style.color = 'var(--lamp-calm)';
        els.newUserMsg.textContent = 'Usuário criado com sucesso!';
        els.newName.value = ''; els.newUsername.value = ''; els.newPassword.value = '';
      })
      .catch(function(err){
        els.newUserMsg.style.color = 'var(--lamp-alert)';
        els.newUserMsg.textContent = err.message;
      })
      .finally(function(){ els.createUserBtn.disabled = false; });
  });

  els.logoutBtn.addEventListener('click', function(){
    apiCall(AUTH_API + '?action=logout', { method:'POST' }).finally(function(){
      window.location.href = 'login.html';
    });
  });

  function boot(){
    apiCall(AUTH_API + '?action=me').then(function(user){
      state.user = user;
      els.manageUsersBtn.hidden = (user.role !== 'admin');
      return refreshFromServer();
    }).catch(function(){
      window.location.href = 'login.html';
    });
  }

  boot();
})();