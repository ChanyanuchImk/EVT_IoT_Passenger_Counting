const WEBSOCKET_URL = "wss://a36wvzhds26ihu-ats.iot.us-east-1.amazonaws.com/mqtt";
const FETCH_API_URL = "https://6f6hkuxixg.execute-api.us-east-1.amazonaws.com/IoT-dashboard/data";

/* -------------------- Element selectors -------------------- */
const els = {
  currentCount: document.getElementById('current-count'),
  currentTime: document.getElementById('current-time'),
  peakToday: document.getElementById('peak-today'),
  totalPassenger: document.getElementById('total-passenger'),
  busNumber: document.getElementById('bus-number'),
  busLine: document.getElementById('bus-line')
};

// เก็บค่าก่อนหน้าไว้เช็คว่ามีการเปลี่ยนแปลงไหม
const last = { current: null, peak: null, total: null, busNumber: null, busLine: null };

/* ==========================================================
   CAMERA CONNECTION (เชื่อมกล้อง → Dashboard)
   ========================================================== */
function connectCameraWS() {
  const isLocal = window.location.hostname === "localhost";
  const cameraWS = new WebSocket(
    isLocal
      ? "ws://localhost:8081" // กล้องในเครื่อง
      : WEBSOCKET_URL // กล้องส่งผ่าน AWS API Gateway
  );
};

/* -------------------- เช็คสถานะการเชื่อมต่อกล้อง -------------------- */
const camStatusEl = document.getElementById('cam-status');

const cameraWS = new WebSocket('ws://localhost:8081');

cameraWS.onopen = () => {
  camStatusEl.textContent = "CAM ● Connected";
  camStatusEl.className = "cam-status cam-connected";
  console.log('Camera WS connected');
};

cameraWS.onmessage = (ev) => {
  try {
    const data = JSON.parse(ev.data);
    handleIncomingData(data);
  } catch (e) {
    console.error('Invalid WS data from Camera', e, ev.data);
  }
};

cameraWS.onclose = () => {
  camStatusEl.textContent = "CAM ● Disconnected";
  camStatusEl.className = "cam-status cam-disconnected";
  console.log('Camera WS disconnected');
};

cameraWS.onerror = (err) => {
  camStatusEl.textContent = "CAM ● Error";
  camStatusEl.className = "cam-status cam-error";
  console.error('Camera WS error', err);
};

/* ==========================================================
   DASHBOARD CONNECTION (AWS WebSocket → Browser)
   ========================================================== */
(function connectDashboardWS() {
  const isLocal = window.location.hostname === "localhost";
  const wsUrl = isLocal
    ? "ws://localhost:8080" // ถ้ารัน dashboard บน local
    : WEBSOCKET_URL; // ถ้า host บน S3/CloudFront

  const dashboardWS = new WebSocket(wsUrl);

  dashboardWS.addEventListener("open", () => {
    console.log("Dashboard WS connected:", wsUrl);
  });

  dashboardWS.addEventListener("message", (ev) => {
    try {
      const data = JSON.parse(ev.data);
      handleIncomingData(data);
    } catch (e) {
      console.error("Invalid WS data from Dashboard", e, ev.data);
    }
  });

  dashboardWS.addEventListener("close", () => {
    console.warn("Dashboard WS closed. Reconnecting in 3s...");
    setTimeout(connectDashboardWS, 3000);
  });

  dashboardWS.addEventListener("error", (err) => {
    console.error("Dashboard WS error", err);
    dashboardWS.close();
  });
})();

/* ==========================================================
   OPTIONAL: FETCH INITIAL DATA (HTTP API → DynamoDB)
   ========================================================== */
async function loadInitialData(cameraId = "127") {
  try {
    const url = `${FETCH_API_URL}?camera_id=${cameraId}`;
    const res = await fetch(url);
    const data = await res.json();

    console.log("Loaded last 10 records:", data);

    // ถ้ามีข้อมูลล่าสุด → แสดงบน dashboard
    if (Array.isArray(data) && data.length > 0) {
      const latest = data[0];
      handleIncomingData(latest);
    }
  } catch (err) {
    console.error("Error loading initial data:", err);
  }
}

// โหลดข้อมูลย้อนหลังเมื่อเริ่มหน้าเว็บ
loadInitialData();

/* -------------------- Utility functions -------------------- */
function formatTime(date = new Date()) { 
  return date.toLocaleTimeString(); }

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

/* -------------------- Dashboard WebSocket --------------------
(function connectDashboardWS() {
  //const wsUrl = "wss://pbdh9wg6f3.execute-api.us-east-1.amazonaws.com/production"; // เปลี่ยนเป็น WSS URL จริง
  const dashboardWS = new WebSocket(wsUrl);

  dashboardWS.addEventListener('open', () => console.log('Dashboard WS connected:', wsUrl));
  dashboardWS.addEventListener('message', (ev) => {
    try {
      const data = JSON.parse(ev.data);
      handleIncomingData(data);
    } catch (e) {
      console.error('Invalid WS data from Dashboard', e, ev.data);
    }
  });

  dashboardWS.addEventListener('close', () => {
    console.log('Dashboard WS closed. Reconnect in 2s...');
    setTimeout(connectDashboardWS, 2000);
  });

  dashboardWS.addEventListener('error', (err) => {
    console.error('Dashboard WS error', err);
    dashboardWS.close();
  });
})(); */