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

# This is the closing of the grid div + apps-panel div in the overlay
# We need to insert footer between end of grid and end of apps-panel
GRID_CLOSE = '    </div>\n  </div>\n</div>'

FOOTER_HTML = """    </div>

    <!-- Footer: usuario + acciones -->
    <div style="margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:34px;height:34px;border-radius:50%;background:rgba(20,184,166,0.2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2dd4bf;font-family:Manrope,sans-serif;flex-shrink:0;" id="apps-avatar">NH</div>
        <div>
          <p style="font-size:12px;font-weight:700;color:#e2e8f0;margin:0;" id="apps-nombre">Admin</p>
          <p style="font-size:10px;color:#64748b;margin:0;">admin_clinica</p>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="toggleTema()" style="display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);cursor:pointer;color:#94a3b8;font-size:12px;font-family:Manrope,sans-serif;font-weight:600;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
          <span class="material-symbols-outlined" style="font-size:15px;">dark_mode</span>
          Tema
        </button>
        <button onclick="document.getElementById('btn-logout').click()" style="display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:10px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);cursor:pointer;color:#f87171;font-size:12px;font-family:Manrope,sans-serif;font-weight:600;transition:background 0.15s;" onmouseover="this.style.background='rgba(248,113,113,0.15)'" onmouseout="this.style.background='rgba(248,113,113,0.08)'">
          <span class="material-symbols-outlined" style="font-size:15px;">logout</span>
          Cerrar sesión
        </button>
      </div>
    </div>
  </div>
</div>"""

print("=== Adding footer to apps overlay ===")
for fname in FILES:
    fpath = os.path.join(SCREENS_DIR, fname)
    if not os.path.exists(fpath):
        print(f"  NOT FOUND: {fname}")
        continue

    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'apps-avatar' in content:
        print(f"  ALREADY HAS FOOTER: {fname}")
        continue

    if GRID_CLOSE not in content:
        print(f"  PATTERN NOT FOUND: {fname}")
        continue

    # Replace the first occurrence (there should be only one in the overlay)
    new_content = content.replace(GRID_CLOSE, FOOTER_HTML, 1)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"  UPDATED: {fname}")

print("=== Done ===")
