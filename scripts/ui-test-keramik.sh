#!/bin/bash
# Uji fitur baru (v2): eye toggle plafon/pintu/jendela di Outliner + keramik 30/40 + klik lantai.
cd /home/z/my-project
mkdir -p shots5
setsid bash -c 'cd /home/z/my-project && exec bun run dev >/dev/null 2>&1' </dev/null >/dev/null 2>&1 &
for i in $(seq 1 150); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 5)
  [ "$code" = "200" ] && break
  sleep 2
done
echo "server-up:$code"
ab() { agent-browser "$@" 2>&1; }

ab open "http://localhost:3000?fresh=1" | tail -1
ab wait --load networkidle | tail -1
ab wait 7000
echo "=== ERRORS-AFTER-LOAD ==="
ab errors | head -4
ab screenshot shots5/01-default.png | tail -1

BTN() { ab eval "(() => { const b=document.querySelector('[title=\"$1\"]'); if(!b) return 'BTN-NOT-FOUND'; b.click(); return 'CLICKED'; })()" | tail -1; }
EYE() { # klik ikon mata pada baris Outliner (scope aside agar tidak kena legenda viewport)
  ab eval "(() => { const sp=[...document.querySelectorAll('aside span')].filter(s=>s.textContent.trim()==='$1'); if(!sp.length) return 'ROW-NOT-FOUND'; const b=sp[0].closest('div')?.querySelector('button'); if(!b) return 'NO-BTN'; b.click(); return 'EYED'; })()" | tail -1
}
DIALOG() { ab eval "document.querySelector('[role=dialog]')?.getAttribute('aria-label') || 'NO-DIALOG'" | tail -1; }

echo "=== VIEW-ATAS + overlay MEP OFF ==="
BTN "Denah dari atas"; ab wait 600
BTN "Jalur pipa air bersih & limbah (overlay sinar-X)"
BTN "Jalur listrik: conduit, titik lampu/saklar/stop kontak"
ab wait 500
echo "=== HIDE atap agar lantai terlihat: genteng, rangka, plafon (eye baru) ==="
echo "genteng: $(EYE "Genteng & nok")"; ab wait 400
echo "rangka: $(EYE "Rangka baja ringan")"; ab wait 400
echo "plafon: $(BTN "[aria-label=Sembunyikan Plafon gypsum]" 2>/dev/null || ab eval "(() => { const b=document.querySelector('[aria-label=\"Sembunyikan Plafon gypsum\"]'); if(!b) return 'NO-BTN'; b.click(); return 'OK'; })()" | tail -1)"
ab wait 900
ab screenshot shots5/02-top-keramik40.png | tail -1

echo "=== KLIK-TILE (titik di dalam rumah 0.40-0.60) ==="
FOUND="NO"
for pt in "0.55 0.42" "0.42 0.58" "0.55 0.60" "0.42 0.42"; do
  [ "$FOUND" = "LANTAI" ] && break
  POS=$(ab eval "const r=document.querySelector('canvas').getBoundingClientRect(); const p='$pt'.split(' '); Math.round(r.x+r.width*Number(p[0]))+' '+Math.round(r.y+r.height*Number(p[1]))" | tail -1)
  X=$(echo $POS | tr -d '"' | cut -d' ' -f1); Y=$(echo $POS | tr -d '"' | cut -d' ' -f2)
  ab mouse move "$X" "$Y"; ab wait 250
  ab mouse down left; ab mouse up left; ab wait 1400
  L=$(DIALOG)
  echo "  klik $X $Y -> $L"
  case "$L" in *Lantai*) FOUND="LANTAI";; esac
done
echo "found:$FOUND"
ab screenshot shots5/03-lantai-panel.png | tail -1
echo "=== PANEL-LANTAI-CONTENT (40x40 / 248 keping / per ruangan) ==="
ab eval "(document.querySelector('[role=dialog]')?.innerText || 'NO-DIALOG').replace(/\n/g,' | ').slice(0,800)" | tail -1

echo "=== EYE-PINTU & EYE-JENDELA (fitur baru) ==="
ab press Escape; ab wait 500
ab eval "(() => { const b=document.querySelector('[aria-label=\"Sembunyikan Pintu & kusen kayu\"]'); if(!b) return 'NO-BTN'; b.click(); return 'OK'; })()" | tail -1
ab wait 900
ab screenshot shots5/04-pintu-hidden.png | tail -1
ab eval "(() => { const b=document.querySelector('[aria-label=\"Sembunyikan Jendela berkaca\"]'); if(!b) return 'NO-BTN'; b.click(); return 'OK'; })()" | tail -1
ab wait 900
ab screenshot shots5/05-jendela-hidden.png | tail -1
echo "=== STATUS-EYE (aria Tampilkan = tersembunyi) ==="
ab eval "(() => { const q=(l)=>!!document.querySelector('[aria-label=\"Tampilkan \"+l]'); return JSON.stringify({pintu:q('Pintu & kusen kayu'),jendela:q('Jendela berkaca'),plafon:q('Plafon gypsum')}); })()" | tail -1

echo "=== KEMBALI-3D + RESTORE ==="
BTN "Perspektif 3/4"; ab wait 600
ab eval "(() => { for(const l of ['Pintu & kusen kayu','Jendela berkaca','Plafon gypsum']) { const b=document.querySelector('[aria-label=\"Tampilkan \"+l+\"\"]'); b?.click(); } return 'RESTORED'; })()" | tail -1
ab wait 700
EYE "Rangka baja ringan"; ab wait 400
EYE "Genteng & nok"; ab wait 900
ab screenshot shots5/06-restored-3d.png | tail -1
echo "restore-check: $(ab eval "(() => { const q=(l)=>!!document.querySelector('[aria-label=\"Sembunyikan \"+l+\"\"]'); return JSON.stringify({pintu:q('Pintu & kusen kayu'),jendela:q('Jendela berkaca'),plafon:q('Plafon gypsum')}); })()" | tail -1)"

echo "=== KERAMIK-30: ganti lewat combobox panel Properti ==="
ab eval "(() => { const cb=[...document.querySelectorAll('[role=combobox]')].find(c=>c.textContent.includes('40 x 40')); if(!cb) return 'CB-NOT-FOUND'; cb.click(); return 'OPENED'; })()" | tail -1
ab wait 900
ab eval "(() => { const it=[...document.querySelectorAll('[role=option]')].find(o=>o.textContent.includes('30 x 30')); if(!it) return 'OPT-NOT-FOUND'; it.click(); return 'SET-30'; })()" | tail -1
ab wait 1600
BTN "Denah dari atas"; ab wait 900
ab screenshot shots5/07-keramik30-top.png | tail -1
echo "=== OUTLINER-LANTAI-ROW (harus 30x30 / 400 keping) ==="
ab eval "(() => { const sp=[...document.querySelectorAll('aside span')].find(s=>s.textContent.includes('Lantai rabat + keramik')); return sp ? sp.textContent.trim() : 'ROW-NOT-FOUND'; })()" | tail -1
echo "=== KLIK-ROW-LANTAI (panel 30x30 / 400 keping) ==="
ab eval "(() => { const sp=[...document.querySelectorAll('aside span')].find(s=>s.textContent.includes('Lantai rabat + keramik')); sp.closest('div').click(); return 'ROW-CLICKED'; })()" | tail -1
ab wait 1500
DIALOG
ab screenshot shots5/08-lantai30-panel.png | tail -1
ab eval "(document.querySelector('[role=dialog]')?.innerText.match(/30x30|400 keping|11 keping\/m2/g)||['NOT-FOUND']).join(' | ')" | tail -1
ab press Escape; ab wait 400

echo "=== RAB-WORKSPACE (klik tombol TopBar) ==="
ab eval "(() => { const b=[...document.querySelectorAll('header button, nav button, button')].find(b=>b.textContent.trim()==='RAB'); if(!b) return 'TAB-NOT-FOUND'; b.click(); return 'TAB-CLICKED'; })()" | tail -1
ab wait 2800
ab eval "(() => { const t=document.body.innerText; return JSON.stringify({row30:t.includes('Keramik lantai 30x30'), harga85:t.includes('85.000'), keping400:t.includes('400 keping'), total:t.match(/Total estimasi RAB\s*\n?\s*Rp[0-9.]+/)?.[0]||'NO-TOTAL'}); })()" | tail -1
ab screenshot shots5/09-rab-keramik30.png | tail -1

echo "=== FINAL-ERRORS ==="
ab errors | head -4
ab console | rg -i "error|warn" | head -5
echo DONE
