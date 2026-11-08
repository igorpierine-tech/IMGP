(function () {
  function mount() {
    var link = document.createElement("a");
    link.href = projectPath("/foundation");
    link.className = "foundation-badge";
    link.setAttribute("aria-label", "Abrir fundação produtiva");
    link.innerHTML = '<span></span><strong>Base produtiva</strong><small>dados · segurança · auditoria</small>';
    link.style.cssText = "position:fixed;right:20px;bottom:18px;z-index:9999;display:grid;grid-template-columns:10px auto;gap:1px 9px;align-items:center;padding:11px 15px;border-radius:12px;background:#102a43;color:#fff;text-decoration:none;box-shadow:0 10px 30px rgba(15,42,67,.28);font:12px Arial,sans-serif";
    link.children[0].style.cssText = "grid-row:1/3;width:8px;height:8px;border-radius:50%;background:#39d98a;box-shadow:0 0 0 4px rgba(57,217,138,.15)";
    link.children[1].style.cssText = "font-size:12px;line-height:1.15";
    link.children[2].style.cssText = "color:#b9c9d8;font-size:10px";
    document.body.appendChild(link);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
