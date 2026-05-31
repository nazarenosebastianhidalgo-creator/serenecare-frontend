import os

SCREENS_DIR = r"C:\Users\Pc\Desktop\therapeutic-perspective\screens"

FILES = [
    "dashboard_admin_clinica.html",
    "pacientes_clinica.html",
    "agenda_clinica.html",
    "mensajes_clinica.html",
    "gestion_personal_admin.html",
    "facturacion.html",
    "estadisticas_clinica.html",
    "config_clinica.html",
]

OVERLAY_JS = """
  // Apps overlay
  window.toggleAppsPanel = function() {
    var o = document.getElementById('apps-overlay');
    var isHidden = o.style.display === 'none' || o.style.display === '';
    if (isHidden) {
      o.style.display = 'flex';
    } else {
      o.style.display = 'none';
    }
  };
  window.cerrarApps = function(e) {
    if (e && e.target !== document.getElementById('apps-overlay')) return;
    document.getElementById('apps-overlay').style.display = 'none';
  };
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var o = document.getElementById('apps-overlay');
      if (o) o.style.display = 'none';
    }
  });
"""

print("=== Adding apps JS functions ===")
for fname in FILES:
    fpath = os.path.join(SCREENS_DIR, fname)
    if not os.path.exists(fpath):
        print(f"  NOT FOUND: {fname}")
        continue

    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'window.toggleAppsPanel' in content:
        print(f"  ALREADY HAS JS: {fname}")
        continue

    # Insert before the last </script> in the file
    last_pos = content.rfind('</script>')
    if last_pos == -1:
        print(f"  NO SCRIPT TAG: {fname}")
        continue

    content = content[:last_pos] + OVERLAY_JS + '\n' + content[last_pos:]

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  UPDATED: {fname}")

print("=== Done ===")
