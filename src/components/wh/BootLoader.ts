/**
 * Boot Loader — overlay inline (não-React) injetado no HTML inicial do shell SSR
 * para evitar tela em branco enquanto o JS hidrata e os recursos críticos
 * (fontes, imagens above-the-fold) carregam.
 *
 * Estratégia:
 * 1. CSS inline no <head> com keyframes leves (apenas opacity/transform).
 * 2. HTML do overlay é injetado direto no <body> ANTES do mount do React,
 *    garantindo paint imediato.
 * 3. Script inline aguarda window.load + 150ms, faz fade-out de 400ms e
 *    remove o elemento. Tema é lido do <html data-theme> ou class.
 */

const BRAND = "#FF195E";

export const bootLoaderCSS = `
#wh-boot-loader{
  position:fixed;inset:0;z-index:99999;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:28px;
  background:#0b0b0b;
  color:#f5f5f5;
  transition:opacity .45s ease;
  will-change:opacity;
  -webkit-font-smoothing:antialiased;
  font-family:Barlow,system-ui,-apple-system,sans-serif;
}
:root.light #wh-boot-loader,html.light #wh-boot-loader{background:#f7f5f0;color:#161616}
#wh-boot-loader.wh-boot-hide{opacity:0;pointer-events:none}
#wh-boot-loader .wh-boot-ring{
  position:relative;width:120px;height:120px;display:grid;place-items:center;
}
#wh-boot-loader .wh-boot-ring::before{
  content:"";position:absolute;inset:0;border-radius:9999px;
  border:2px solid ${BRAND}22;
}
#wh-boot-loader .wh-boot-ring::after{
  content:"";position:absolute;inset:0;border-radius:9999px;
  border:2px solid transparent;border-top-color:${BRAND};border-right-color:${BRAND}aa;
  animation:wh-boot-spin 1.2s linear infinite;
}
#wh-boot-loader .wh-boot-glow{
  position:absolute;width:84px;height:84px;border-radius:9999px;
  background:${BRAND}33;filter:blur(28px);
  animation:wh-boot-pulse 2s ease-in-out infinite;
}
#wh-boot-loader .wh-boot-mark{
  position:relative;display:grid;place-items:center;
  width:72px;height:72px;
  animation:wh-boot-pulse 2s ease-in-out infinite;
}
#wh-boot-loader .wh-boot-mark img{width:100%;height:100%;object-fit:contain;display:block}
#wh-boot-loader .wh-boot-label{
  font-size:11px;letter-spacing:.32em;text-transform:uppercase;
  color:#9b9b9b;animation:wh-boot-fade 1.6s ease-in-out infinite;
}
:root.light #wh-boot-loader .wh-boot-label,html.light #wh-boot-loader .wh-boot-label{color:#6b6b6b}
@keyframes wh-boot-spin{to{transform:rotate(360deg)}}
@keyframes wh-boot-pulse{0%,100%{opacity:.65;transform:scale(.96)}50%{opacity:1;transform:scale(1.04)}}
@keyframes wh-boot-fade{0%,100%{opacity:.45}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){
  #wh-boot-loader .wh-boot-ring::after,#wh-boot-loader .wh-boot-glow,
  #wh-boot-loader .wh-boot-mark,#wh-boot-loader .wh-boot-label{animation:none}
}
`;

export const bootLoaderHTML = `
<div class="wh-boot-ring">
  <span class="wh-boot-glow"></span>
  <span class="wh-boot-mark">
    <img src="/logos/wayhome-symbol-white.svg" alt="" aria-hidden="true" />
  </span>
</div>
<span class="wh-boot-label">Carregando</span>
`;

export const bootLoaderScript = `
(function(){
  // Cria o overlay FORA da árvore React para evitar mismatch de hidratação.
  if(document.getElementById('wh-boot-loader'))return;
  var el=document.createElement('div');
  el.id='wh-boot-loader';
  el.setAttribute('aria-hidden','true');
  el.innerHTML=${JSON.stringify(bootLoaderHTML)};
  if(document.body){document.body.appendChild(el);} else {
    document.addEventListener('DOMContentLoaded',function(){document.body.appendChild(el);});
  }
  var hidden=false;
  function hide(){
    if(hidden)return;hidden=true;
    var node=document.getElementById('wh-boot-loader');
    if(!node)return;
    node.classList.add('wh-boot-hide');
    setTimeout(function(){if(node&&node.parentNode)node.parentNode.removeChild(node);},500);
  }
  window.__whBootDone=hide;
  // Fallback de segurança: 3s no máximo.
  setTimeout(hide,3000);
})();
`;