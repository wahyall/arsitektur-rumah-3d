#!/bin/bash
# Uji interaktif lanjutan: outliner pilih genteng, edit harga, cek RAB, toggle hide/unhide.
cd /home/z/my-project
mkdir -p shots4
setsid bash -c 'cd /home/z/my-project && exec bun run dev >/dev/null 2>&1' </dev/null >/dev/null 2>&1 &
for i in $(seq 1 120); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 5)
  [ "$code" = "200" ] && break
  sleep 2
done
echo "server-up:$code"
ab() { agent-browser "$@" 2>&1; }

ab open "http://localhost:3000?fresh=2" | tail -1
ab wait --load networkidle | tail -1
ab wait 6000
echo "=== ERRORS-AFTER-LOAD ==="
ab errors | head -3

echo "=== OUTLINER-ROW-GENTENG (via eval click) ==="
ab eval "(() => { const rows = [...document.querySelectorAll('div[role=button]')]; const row = rows.find(d => d.textContent.includes('Genteng & nok')); if (!row) return 'ROW-NOT-FOUND'; row.click(); return 'ROW-CLICKED'; })()" | tail -1
ab wait 1500
ab screenshot shots4/03-genteng.png | tail -1
ab eval "document.querySelector('[role=dialog]')?.getAttribute('aria-label') || 'NO-DIALOG'" | tail -1

echo "=== PANEL-RP-LINES-BEFORE ==="
ab eval "(document.querySelector('[role=dialog]')?.innerText.split('\n').filter(l=>l.includes('Rp')).join(' || ') || 'NONE')" | tail -1

echo "=== EDIT-HARGA-GENTENG (60000 -> 40000) ==="
ab eval "(() => { const inp = document.querySelectorAll('[role=dialog] input[type=number]')[0]; if(!inp) return 'NO-INPUT'; const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(inp, 40000); inp.dispatchEvent(new Event('input',{bubbles:true})); return 'SET-40000'; })()" | tail -1
ab wait 1500
echo "=== PANEL-RP-LINES-AFTER ==="
ab eval "(document.querySelector('[role=dialog]')?.innerText.split('\n').filter(l=>l.includes('Rp')).join(' || ') || 'NONE')" | tail -1
ab screenshot shots4/04-price-edited.png | tail -1

echo "=== RAB-WORKSPACE (total harus ikut berubah) ==="
ab eval "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'RAB'); if (!b) return 'NO-BTN'; b.click(); return 'RAB-CLICKED'; })()" | tail -1
ab wait 3000
ab eval "(document.body.innerText.split('\n').filter(l=>l.includes('Total estimasi RAB') || l.match(/^Rp ?[0-9]{3}/)).slice(0,6).join(' || ') || 'NONE')" | tail -1
ab screenshot shots4/05-rab-total.png | tail -1

echo "=== KEMBALI-KE-MODEL ==="
ab eval "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Model 3D'); if (!b) return 'NO-BTN'; b.click(); return 'MODEL-CLICKED'; })()" | tail -1
ab wait 4000

echo "=== TOGGLE-HIDE-GENTENG ==="
ab eval "(() => { const b = [...document.querySelectorAll('[role=dialog] button')].find(x => x.textContent.includes('Sembunyikan bagian ini')); if (!b) return 'NO-BTN'; b.click(); return 'HIDE-CLICKED'; })()" | tail -1
ab wait 2000
ab screenshot shots4/06-genteng-hidden.png | tail -1
ab eval "(document.querySelector('[role=dialog]')?.innerText.includes('Tampilkan kembali bagian ini') ? 'EYE-HIDDEN-OK' : 'EYE-STATE-?')" | tail -1

echo "=== UNHIDE-GENTENG ==="
ab eval "(() => { const b = [...document.querySelectorAll('[role=dialog] button')].find(x => x.textContent.includes('Tampilkan kembali bagian ini')); if (!b) return 'NO-BTN'; b.click(); return 'UNHIDE-CLICKED'; })()" | tail -1
ab wait 2000
ab screenshot shots4/07-genteng-restored.png | tail -1

echo "=== HIDE-SLOOF-3D (klik bangunan tak harus panel) & VERIFIKASI TAMBAHAN ==="
ab eval "(() => { const rows = [...document.querySelectorAll('div[role=button]')]; const row = rows.find(d => d.textContent.includes('Struktur beton')); if (!row) return 'ROW-NOT-FOUND'; row.click(); return 'ROW-CLICKED'; })()" | tail -1
ab wait 1500
ab eval "document.querySelector('[role=dialog]')?.getAttribute('aria-label') || 'NO-DIALOG'" | tail -1
ab screenshot shots4/08-sloof.png | tail -1

echo "=== TOOLTIP-HOVER (atas rumah) ==="
POS=$(ab eval "const r=document.querySelector('canvas').getBoundingClientRect(); Math.round(r.x+r.width*0.55)+' '+Math.round(r.y+r.height*0.35)" | tail -1)
X=$(echo $POS | tr -d '"' | cut -d' ' -f1)
Y=$(echo $POS | tr -d '"' | cut -d' ' -f2)
ab mouse move "$X" "$Y"
ab wait 500
ab eval "document.body.innerText.includes('klik utk detail') ? 'TOOLTIP-OK' : 'NO-TOOLTIP'" | tail -1

echo "=== FINAL-ERRORS ==="
ab errors | head -4
echo "DONE-2"
