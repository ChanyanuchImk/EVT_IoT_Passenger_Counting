/* script.js
   รองรับ:
   - อัปเดต UI เฉพาะตอนที่ค่าจริง ๆ เปลี่ยน (จะไม่กระพริบเมื่อค่าเดิม)
   - รองรับ WebSocket หรือ HTTP polling (ตัวอย่างทั้งสองแบบ)
   - มีโหมดจำลองข้อมูล (simulate) สำหรับทดสอบ
*/

/* -------------------- เลือก element ที่จะอัปเดต -------------------- */
const els = {
  currentCount: document.getElementById('current-count'),
  currentTime: document.getElementById('current-time'),
  peakToday: document.getElementById('peak-today'),
  totalPassenger: document.getElementById('total-passenger'),
  busNumber: document.getElementById('bus-number'),
  busLine: document.getElementById('bus-line')
};

/* -------------------- เก็บค่าเก่าไว้เปรียบเทียบ -------------------- */
const last = {
  current: null,
  peak: null,
  total: null,
  busNumber: null,
  busLine: null
};

/* -------------------- ฟังก์ชันช่วยเหลือ -------------------- */
function formatTime(date = new Date()) {
  return date.toLocaleTimeString(); // "HH:MM:SS" ตาม locale
}

/**
 * ปรับค่าบน element เฉพาะเมื่อแตกต่างจากค่าเก่า
 * - el: DOM element
 * - newValue: ค่าใหม่ (string/number)
 * - lastValue: ค่าเก่า
 * - opts: { updateTimeOnChange: boolean }  (สำหรับ current passenger เราจะอัปเดตเวลา)
 */
function setValueIfChanged(el, newValue, lastValue, opts = {}) {
  // ถ้า undefined/null หรือ same => ไม่มีการกระพริบ/อัปเดต
  const bothUndefined = (newValue === undefined || newValue === null) && (lastValue === undefined || lastValue === null);
  if (bothUndefined) return false;

  // เปรียบเทียบแบบ strict แต่แปลงเป็น string เพื่อให้ "5" และ 5 เท่ากัน
  if (String(newValue) === String(lastValue)) {
    return false; // ไม่เปลี่ยน
  }

  // --- ถ้าถึงที่นี่ นั่นคือ "มีการเปลี่ยน" ---
  // อัปเดตตัวเลข
  el.textContent = newValue;

  // เล่น animation pop
  el.classList.add('pulse');

  // ถ้าเป็นตัวเลข ลองดูทิศทางขึ้น/ลงแล้วให้สีชั่วคราว
  const nNew = Number(newValue);
  const nOld = Number(lastValue);

  if (!isNaN(nNew) && !isNaN(nOld)) {
    if (nNew > nOld) {
      el.classList.add('delta-up');
    } else if (nNew < nOld) {
      el.classList.add('delta-down');
    }
  } else {
    
    el.classList.add('flash');
  }

  // เอา class ที่เพิ่มชั่วคราวออกหลังจากเวลาเล็กน้อย
  setTimeout(() => {
    el.classList.remove('pulse', 'delta-up', 'delta-down', 'flash');
  }, 800);
  // ถ้าต้องการให้อัปเดตเวลาเมื่อ current passenger เปลี่ยน
  if (opts.updateTimeOnChange && els.currentTime) {
    els.currentTime.textContent = `(${formatTime()})`;
  }

  return true;
}

/* -------------------- ฟังก์ชันจัดการข้อมูลที่เข้ามา -------------------- */
/**
 expected data object:
 {
   current: number,
   peak: number,
   total: number,
   busNumber: number | string,
   busLine: string
 }
*/
function handleIncomingData(data = {}) {
  // safety: ถ้าไม่มี property ให้ข้าม
  if ('current' in data) {
    const changed = setValueIfChanged(els.currentCount, data.current, last.current, { updateTimeOnChange: true });
    if (changed) last.current = data.current;
  }
  if ('peak' in data) {
    const changed = setValueIfChanged(els.peakToday, data.peak, last.peak);
    if (changed) last.peak = data.peak;
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

/* -------------------- วิธีเชื่อมต่อจริง (คำแนะนำ/ตัวอย่าง) -------------------- */

/* 1) WebSocket (แนะนำถ้าต้องการอัปเดตแบบ real-time จริง ๆ)
   ฝั่ง Raspberry Pi ให้เปิด WebSocket server แล้วส่ง JSON objects ดังรูปด้านบน
   ตัวอย่างการเชื่อม (แก้ URL ให้ตรงกับเซิร์ฟเวอร์ของคุณ) */

let ws;

function startWebSocket(wsUrl) {
  ws = new WebSocket(wsUrl); // ใช้ตัวแปร global
  ws.addEventListener('open', () => console.log('WS connected:', wsUrl));
  ws.addEventListener('message', (ev) => {
    console.log("Received:", ev.data); // ตรวจสอบว่ามี JSON ถูกส่งมาจริง
    const data = JSON.parse(ev.data);
  handleIncomingData(data);           // อัปเดตหน้าเว็บ
});

  ws.addEventListener('close', () => {
    console.log('WS closed, reconnect in 2s');
    setTimeout(() => startWebSocket(wsUrl), 2000);
  });
  ws.addEventListener('error', (err) => {
    console.error('WS error', err);
    ws.close();
  });
}

/* 2) HTTP polling (ถ้าไม่ต้องการ WebSocket) 
   API ควรคืน JSON ที่มี field ตามตัวอย่าง (current, peak, total, busNumber, busLine)
*/
/*function startPolling(apiUrl, intervalMs = 3000) {
  async function pollOnce() {
    try {
      const res = await fetch(apiUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      handleIncomingData(data);
    } catch (e) {
      console.error('Polling error', e);
    }
  }
  pollOnce();
  return setInterval(pollOnce, intervalMs);
}

 -------------------- โหมดจำลองข้อมูล (สำหรับทดสอบหน้าตา/animation) -------------------- */
/*function startSimulate(intervalMs = 5000) {
  // เริ่มด้วยค่าเริ่มต้น
  const state = { current: 0, peak: 0, total: 0};
  // update function (ทำให้บางครั้งค่าไม่เปลี่ยน เพื่อทดสอบว่า UI จะไม่กระพริบ)
  setInterval(() => {
    // สุ่มว่าจะแก้ไขจริงมั้ย (70% โอกาสค่าน่าจะแก้)
    const willChange = Math.random() > 0.3;
    if (willChange) {
      // current เปลี่ยนแบบ + / - บ้าง
      const delta = Math.floor(Math.random() * 3) - 1; // -1,0,1
      state.current = Math.max(0, state.current + delta + Math.floor(Math.random() * 2)); // เพิ่มโอกาสเพิ่ม
      state.peak = Math.max(state.peak, state.current);
      //state.total += Math.max(0, state.current - (Math.random() < 0.5 ? 0 : Math.floor(Math.random()*2)));
    }
    handleIncomingData(state);
  }, intervalMs);
}

/* -------------------- เรียกใช้งาน: เลือก 1) WebSocket  2) Polling  3) Simulate -------------------- */

/* ถ้าต้องการใช้ WebSocket: uncomment และแก้ URL */
startWebSocket('ws://localhost:5000');

/* ถ้าต้องการใช้ HTTP polling: uncomment และแก้ URL */
// const pollHandle = startPolling('http://raspberrypi.local:5000/status', 4000);

/* สำหรับทดสอบบนเครื่องนี้ (จะจำลองข้อมูลทุก ๆ 5 วินาที) */
/*startSimulate(1000);*/
