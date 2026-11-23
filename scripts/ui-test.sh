#!/bin/bash
# Uji interaktif fitur klik-bagian: panel detail + input harga + toggle show/hide.
# Server dev dijalankan di dalam sesi ini (sandbox mematikan proses antar-panggilan).
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

ab open "http://localhost:3000?fresh=1" | tail -1
ab wait --load networkidle | tail -1
ab wait 6000
echo "=== ERRORS-AFTER-LOAD ==="
ab errors | head -3
ab screenshot shots4/01-default.png | tail -1

echo "=== CLICK-DINDING (canvas center) ==="
POS=$(ab eval "const r=document.querySelector('canvas').getBoundingClientRect(); Math.round(r.x+r.width*0.52)+' '+Math.round(r.y+r.height*0.62)" | tail -1)
X=$(echo $POS | tr -d '"' | cut -d' ' -f1)
Y=$(echo $POS | tr -d '"' | cut -d' ' -f2)
echo "click at: $X $Y"
ab mouse move "$X" "$Y"
ab wait 400
ab mouse down left
ab mouse up left
ab wait 1800
ab screenshot shots4/02-click-wall.png | tail -1
echo "=== DIALOG-LABEL ==="
ab eval "document.querySelector('[role=dialog]')?.getAttribute('aria-label') || 'NO-DIALOG'" | tail -1

echo "=== PANEL-BODY-SNIPPET ==="
ab eval "(document.querySelector('[role=dialog]')?.innerText || '').slice(0,300).replace(/\n/g,' | ')" | tail -1

echo "=== TOOLTIP-HOVER ==="
ab mouse move $((X-140)) $((Y-160))
ab wait 600
ab eval "document.body.innerText.includes('klik utk detail') ? 'TOOLTIP-OK' : 'NO-TOOLTIP'" | tail -1

echo "=== OUTLINER-ROW-GENTENG ==="
ab find text "Genteng & nok" click | tail -1
ab wait 1500
ab screenshot shots4/03-genteng.png | tail -1
ab eval "document.querySelector('[role=dialog]')?.getAttribute('aria-label') || 'NO-DIALOG'" | tail -1

echo "=== PANEL-GENTENG-SUBTOTAL-BEFORE ==="
ab eval "(document.querySelector('[role=dialog]')?.innerText.match(/Estimasi bagian ini[^R]*Rp[0-9.]+/)||['NONE'])[0]" | tail -1

echo "=== EDIT-HARGA-GENTENG (60000 -> 40000) ==="
ab eval "(() => { const inp = document.querySelectorAll('[role=dialog] input[type=number]')[0]; if(!inp) return 'NO-INPUT'; const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(inp, 40000); inp.dispatchEvent(new Event('input',{bubbles:true})); return 'SET-40000'; })()" | tail -1
ab wait 1200
echo "=== PANEL-GENTENG-SUBTOTAL-AFTER ==="
ab eval "(document.querySelector('[role=dialog]')?.innerText.match(/Estimasi bagian ini[^R]*Rp[0-9.]+/)||['NONE'])[0]" | tail -1
ab screenshot shots4/04-price-edited.png | tail -1

echo "=== RAB-WORKSPACE-TOTAL (harga baru harus terlihat) ==="
ab find text "RAB" click | tail -1
ab wait 2500
ab eval "(document.body.innerText.match(/Total estimasi RAB\s*\n?\s*Rp[0-9.]+/)||['NONE'])[0]" | tail -1
ab screenshot shots4/05-rab-total.png | tail -1

echo "=== BACK-TO-MODEL & TOGGLE-HIDE ==="
ab find text "Model 3D" click | tail -1
ab wait 3000
ab find text "Genteng & nok" click | tail -1
ab wait 1500
ab find text "Sembunyikan bagian ini" click | tail -1
ab wait 1800
ab screenshot shots4/06-genteng-hidden.png | tail -1
ab eval "document.querySelector('[role=dialog]')?.innerText.includes('Tampilkan kembali') ? 'EYE-TOGGLED-OK' : 'EYE-STATE-?'" | tail -1

echo "=== UNHIDE ==="
ab find text "Tampilkan kembali bagian ini" click | tail -1
ab wait 1800
ab screenshot shots4/07-genteng-restored.png | tail -1

echo "=== ESC-CLOSE ==="
ab press Escape | tail -1
ab wait 800
ab eval "document.querySelector('[role=dialog]') ? 'STILL-OPEN' : 'CLOSED-OK'" | tail -1

echo "=== CLICK-EMPTY (batal pilih) ==="
POS2=$(ab eval "const r=document.querySelector('canvas').getBoundingClientRect(); Math.round(r.x+40)+' '+Math.round(r.y+40)" | tail -1)
X2=$(echo $POS2 | tr -d '"' | cut -d' ' -f1)
Y2=$(echo $POS2 | tr -d '"' | cut -d' ' -f2)
ab mouse move "$X2" "$Y2"
ab wait 200
ab mouse down left
ab mouse up left
ab wait 1000
ab eval "document.querySelector('[role=dialog]') ? 'STILL-OPEN-BAD' : 'DESELECT-OK'" | tail -1

echo "=== FINAL-ERRORS ==="
ab errors | head -4
echo "=== CONSOLE-WARN ==="
ab console | rg -i "error|warn" | head -5
echo "DONE"
