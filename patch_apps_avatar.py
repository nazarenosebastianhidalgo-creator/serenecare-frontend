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

# Patch to add inside toggleAppsPanel to sync user info
SYNC_CODE = """
  // Sync apps footer user info
  (function syncAppsUser() {
    var nombre = localStorage.getItem('tp_nombre') || 'Admin';
    var av = document.getElementById('apps-avatar');
    var nm = document.getElementById('apps-nombre');
    if (av) av.textContent = nombre.split(' ').map(function(w){return w[0];}).slice(0,2).join('').toUpperCase();
    if (nm) nm.textContent = nombre;
  })();
"""

TARGET = "  window.toggleAppsPanel = function() {"

print("=== Patching apps avatar sync ===")
for fname in FILES:
    fpath = os.path.join(SCREENS_DIR, fname)
    if not os.path.exists(fpath):
        print(f"  NOT FOUND: {fname}")
        continue

    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'syncAppsUser' in content:
        print(f"  ALREADY PATCHED: {fname}")
        continue

    if TARGET not in content:
        print(f"  TARGET NOT FOUND: {fname}")
        continue

    new_content = content.replace(TARGET, SYNC_CODE + TARGET, 1)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"  UPDATED: {fname}")

print("=== Done ===")
