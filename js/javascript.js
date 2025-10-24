/* -------------------- Element selectors -------------------- */
const els = {
  currentCount: document.getElementById('current-count'),
  currentTime: document.getElementById('current-time'),
  peakToday: document.getElementById('peak-today'),
  totalPassenger: document.getElementById('total-passenger'),
  busNumber: document.getElementById('bus-number'),
  busLine: document.getElementById('bus-line')
};

const last = { current: null, peak: null, total: null, busNumber: null, busLine: null };

/* -------------------- Utility functions -------------------- */
function formatTime(date = new Date()) { return date.toLocaleTimeString(); }

function setValueIfChanged(el, newValue, lastValue, opts = {}) {
  const bothUndefined = (newValue == null) && (lastValue == null);
  if (bothUndefined) return false;
  if (String(newValue) === String(lastValue)) return false;

  el.textContent = newValue;
  el.classList.add('pulse');

  const nNew = Number(newValue);
  const nOld = Number(lastValue);
  if (!isNaN(nNew) && !isNaN(nOld)) {
    if (nNew > nOld) el.classList.add('delta-up');
    else if (nNew < nOld) el.classList.add('delta-down');
  } else {
    el.classList.add('flash');
  }

  setTimeout(() => el.classList.remove('pulse','delta-up','delta-down','flash'), 800);

  if (opts.updateTimeOnChange && els.currentTime) {
    els.currentTime.textContent = `(${formatTime()})`;
  }
  return true;
}

/* -------------------- Data handler -------------------- */
function handleIncomingData(data = {}) {
  if ('current' in data) {
    const changed = setValueIfChanged(els.currentCount, data.current, last.current, { updateTimeOnChange: true });
    if (changed) last.current = data.current;
  }

  if ('peak' in data) {
    const newPeak = Number(data.peak);
    const oldPeak = Number(last.peak ?? 0);
    if (!isNaN(newPeak) && newPeak > oldPeak) {
      const changed = setValueIfChanged(els.peakToday, newPeak, oldPeak);
      if (changed) last.peak = newPeak;
    }
  }

  if ('total' in data) {
    const changed = setValueIfChanged(els.totalPassenger, data.total, last.total);
    if (changed) last.total = data.total;
  }

  if ('busNumber' in data) {
    const changed = setValueIfChanged(els.busNumber, data.busNumber, last.busNumber);
    if (changed) last.busNumber = data.busNumber;
  }

  if ('busLine' in data) {
    const changed = setValueIfChanged(els.busLine, data.busLine, last.busLine);
    if (changed) last.busLine = data.busLine;
  }
}

/* -------------------- WebSocket connection -------------------- */
(function connectWS() {
  const wsUrl = `ws://${location.hostname}:${location.port || 80}`;
  const ws = new WebSocket(wsUrl);

  ws.addEventListener('open', () => console.log('🖥️ WS connected:', wsUrl));
  ws.addEventListener('message', (ev) => {
    try {
      const data = JSON.parse(ev.data);
      handleIncomingData(data);
    } catch (e) {
      console.error('Invalid WS data', e, ev.data);
    }
  });
  ws.addEventListener('close', () => {
    console.log('WS closed. Reconnect in 2s...');
    setTimeout(connectWS, 2000);
  });
  ws.addEventListener('error', (err) => {
    console.error('WS error', err);
    ws.close();
  });
})();
