import re, os

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

# Sidebar nav items to REMOVE (Personal, Facturación, Estadísticas, Configuración)
ITEMS_TO_REMOVE = [
    r'<a href="gestion_personal_admin\.html"[^>]*>.*?</a>',
    r'<a href="facturacion\.html"[^>]*>.*?</a>',
    r'<a href="estadisticas_clinica\.html"[^>]*>.*?</a>',
    r'<a href="config_clinica\.html"[^>]*>.*?</a>',
]

# The apps overlay HTML to inject before </body>
OVERLAY_HTML = '''
<!-- =============== APPS OVERLAY =============== -->
<div id="apps-overlay" onclick="cerrarApps(event)" style="display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.7);backdrop-filter:blur(12px);align-items:center;justify-content:center;">
  <div id="apps-panel" onclick="event.stopPropagation()" style="background:rgba(10,22,40,0.95);border:1px solid rgba(255,255,255,0.1);border-radius:2.5rem;width:100%;max-width:680px;padding:2.5rem;box-shadow:0 40px 120px rgba(0,0,0,0.6);">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;">
      <div>
        <p style="font-family:Manrope,sans-serif;font-size:1.25rem;font-weight:800;color:#f1f5f9;letter-spacing:-0.02em;">Módulos</p>
        <p style="font-size:0.75rem;color:#64748b;margin-top:2px;">Portal de administración de clínica</p>
      </div>
      <button onclick="cerrarApps()" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#94a3b8;transition:all 0.15s;">
        <span class="material-symbols-outlined" style="font-size:18px;">close</span>
      </button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;">

      <a href="dashboard_admin_clinica.html" class="app-card" style="display:flex;flex-direction:column;align-items:center;gap:0.6rem;padding:1.25rem 0.75rem;border-radius:1.25rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);text-decoration:none;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.background='rgba(20,184,166,0.1)';this.style.borderColor='rgba(20,184,166,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.07)'">
        <div style="width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:rgba(20,184,166,0.15);border:1px solid rgba(20,184,166,0.25);">
          <span class="material-symbols-outlined" style="color:#2dd4bf;font-size:22px;font-variation-settings:'FILL' 1;">dashboard</span>
        </div>
        <span style="font-size:0.7rem;font-weight:700;color:#cbd5e1;text-align:center;font-family:Manrope,sans-serif;">Dashboard</span>
      </a>

      <a href="pacientes_clinica.html" class="app-card" style="display:flex;flex-direction:column;align-items:center;gap:0.6rem;padding:1.25rem 0.75rem;border-radius:1.25rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);text-decoration:none;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.background='rgba(99,102,241,0.1)';this.style.borderColor='rgba(99,102,241,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.07)'">
        <div style="width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.25);">
          <span class="material-symbols-outlined" style="color:#818cf8;font-size:22px;font-variation-settings:'FILL' 1;">group</span>
        </div>
        <span style="font-size:0.7rem;font-weight:700;color:#cbd5e1;text-align:center;font-family:Manrope,sans-serif;">Pacientes</span>
      </a>

      <a href="agenda_clinica.html" class="app-card" style="display:flex;flex-direction:column;align-items:center;gap:0.6rem;padding:1.25rem 0.75rem;border-radius:1.25rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);text-decoration:none;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.background='rgba(6,182,212,0.1)';this.style.borderColor='rgba(6,182,212,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.07)'">
        <div style="width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:rgba(6,182,212,0.15);border:1px solid rgba(6,182,212,0.25);">
          <span class="material-symbols-outlined" style="color:#22d3ee;font-size:22px;font-variation-settings:'FILL' 1;">calendar_month</span>
        </div>
        <span style="font-size:0.7rem;font-weight:700;color:#cbd5e1;text-align:center;font-family:Manrope,sans-serif;">Agenda</span>
      </a>

      <a href="mensajes_clinica.html" class="app-card" style="display:flex;flex-direction:column;align-items:center;gap:0.6rem;padding:1.25rem 0.75rem;border-radius:1.25rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);text-decoration:none;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.background='rgba(34,197,94,0.1)';this.style.borderColor='rgba(34,197,94,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.07)'">
        <div style="width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.25);">
          <span class="material-symbols-outlined" style="color:#4ade80;font-size:22px;font-variation-settings:'FILL' 1;">chat</span>
        </div>
        <span style="font-size:0.7rem;font-weight:700;color:#cbd5e1;text-align:center;font-family:Manrope,sans-serif;">Mensajes</span>
      </a>

      <a href="gestion_personal_admin.html" class="app-card" style="display:flex;flex-direction:column;align-items:center;gap:0.6rem;padding:1.25rem 0.75rem;border-radius:1.25rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);text-decoration:none;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.background='rgba(245,158,11,0.1)';this.style.borderColor='rgba(245,158,11,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.07)'">
        <div style="width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.25);">
          <span class="material-symbols-outlined" style="color:#fbbf24;font-size:22px;font-variation-settings:'FILL' 1;">badge</span>
        </div>
        <span style="font-size:0.7rem;font-weight:700;color:#cbd5e1;text-align:center;font-family:Manrope,sans-serif;">Personal</span>
      </a>

      <a href="facturacion.html" class="app-card" style="display:flex;flex-direction:column;align-items:center;gap:0.6rem;padding:1.25rem 0.75rem;border-radius:1.25rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);text-decoration:none;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.background='rgba(16,185,129,0.1)';this.style.borderColor='rgba(16,185,129,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.07)'">
        <div style="width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.25);">
          <span class="material-symbols-outlined" style="color:#34d399;font-size:22px;font-variation-settings:'FILL' 1;">payments</span>
        </div>
        <span style="font-size:0.7rem;font-weight:700;color:#cbd5e1;text-align:center;font-family:Manrope,sans-serif;">Facturación</span>
      </a>

      <a href="estadisticas_clinica.html" class="app-card" style="display:flex;flex-direction:column;align-items:center;gap:0.6rem;padding:1.25rem 0.75rem;border-radius:1.25rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);text-decoration:none;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.background='rgba(139,92,246,0.1)';this.style.borderColor='rgba(139,92,246,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.07)'">
        <div style="width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.25);">
          <span class="material-symbols-outlined" style="color:#a78bfa;font-size:22px;font-variation-settings:'FILL' 1;">bar_chart</span>
        </div>
        <span style="font-size:0.7rem;font-weight:700;color:#cbd5e1;text-align:center;font-family:Manrope,sans-serif;">Estadísticas</span>
      </a>

      <a href="config_clinica.html" class="app-card" style="display:flex;flex-direction:column;align-items:center;gap:0.6rem;padding:1.25rem 0.75rem;border-radius:1.25rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);text-decoration:none;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.background='rgba(248,113,113,0.1)';this.style.borderColor='rgba(248,113,113,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.07)'">
        <div style="width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:rgba(248,113,113,0.15);border:1px solid rgba(248,113,113,0.25);">
          <span class="material-symbols-outlined" style="color:#f87171;font-size:22px;font-variation-settings:'FILL' 1;">settings</span>
        </div>
        <span style="font-size:0.7rem;font-weight:700;color:#cbd5e1;text-align:center;font-family:Manrope,sans-serif;">Configuración</span>
      </a>

    </div>
  </div>
</div>
'''

# JS to add for the overlay toggle
OVERLAY_JS = '''
  // Apps overlay
  window.toggleAppsPanel = function() {
    var o = document.getElementById('apps-overlay');
    var isHidden = o.style.display === 'none' || o.style.display === '';
    if (isHidden) {
      o.style.display = 'flex';
      setTimeout(function(){ o.style.opacity = '1'; }, 10);
    } else {
      cerrarApps();
    }
  };
  window.cerrarApps = function(e) {
    if (e && e.target !== document.getElementById('apps-overlay')) return;
    var o = document.getElementById('apps-overlay');
    o.style.display = 'none';
  };
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var o = document.getElementById('apps-overlay');
      if (o) o.style.display = 'none';
    }
  });
'''

# The btn-apps button HTML to insert in the header
BTN_APPS_HTML = '''      <button onclick="toggleAppsPanel()" class="p-2 rounded-xl hover:bg-white/5 transition-colors" title="Módulos" style="border:none;background:none;cursor:pointer;">
        <span class="material-symbols-outlined text-slate-400" style="font-size:22px;">apps</span>
      </button>'''


def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 1. Remove the 4 sidebar items
    for pattern in ITEMS_TO_REMOVE:
        content = re.sub(pattern, '', content, flags=re.DOTALL)

    # Clean up extra blank lines left by removal
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)

    # 2. Add btn-apps button in header (before the notifications button or before closing div of header buttons)
    # Look for the notifications button pattern to insert before it
    notif_btn_pattern = r'(<button id="btn-notif")'
    if re.search(notif_btn_pattern, content):
        content = re.sub(notif_btn_pattern, BTN_APPS_HTML + '\n      ' + r'\1', content, count=1)
    else:
        # Fallback: insert before </header>
        content = content.replace('</header>', BTN_APPS_HTML + '\n    </div>\n  </header>', 1)

    # 3. Add overlay HTML before </body>
    if 'apps-overlay' not in content:
        content = content.replace('</body>', OVERLAY_HTML + '\n</body>')

    # 4. Add JS before </script> of the main script block (find last </script> before </body>)
    # Insert before the closing of the last script tag
    if 'toggleAppsPanel' not in content:
        # Find the last </script> tag and insert JS before it
        last_script_pos = content.rfind('</script>')
        if last_script_pos != -1:
            content = content[:last_script_pos] + OVERLAY_JS + '\n' + content[last_script_pos:]

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  UPDATED: {os.path.basename(filepath)}")
    else:
        print(f"  NO CHANGE: {os.path.basename(filepath)}")


print("=== Adding 9-dot Apps Overlay to clinic admin screens ===")
for fname in FILES:
    fpath = os.path.join(SCREENS_DIR, fname)
    if os.path.exists(fpath):
        process_file(fpath)
    else:
        print(f"  NOT FOUND: {fname}")

print("=== Done ===")
