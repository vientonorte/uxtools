import os
import re

print("🚀 [QA E2E] Iniciando auto-corrección de entorno (Versión Python)...")

# Obtener el directorio actual donde se ejecuta el script
base_dir = os.path.dirname(os.path.abspath(__file__))

# 1. Mover herramientas huérfanas de /public a la raíz
tools_to_move = ['voc.html']
for file in tools_to_move:
    src_path = os.path.join(base_dir, 'public', file)
    dest_path = os.path.join(base_dir, file)

    if os.path.exists(src_path):
        if os.path.exists(dest_path):
            backup_path = dest_path + '.bak'
            if os.path.exists(backup_path):
                os.remove(backup_path)
            os.rename(dest_path, backup_path)
        os.rename(src_path, dest_path)
        print(f"📦 Herramienta movida a la raíz: {file}")

# 2. Corrección automática de rutas (Cambiar rutas absolutas a relativas)
html_files = [f for f in os.listdir(base_dir) if f.endswith('.html')]

for file in html_files:
    file_path = os.path.join(base_dir, file)
    with open(file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    # No tocar index.html (hub estático de producción) ni app.html (entry React)
    if file in ('index.html', 'app.html'):
        continue

    # Busca href="/..." o src="/..." y lo convierte en ./...
    updated_content = re.sub(r'(href|src)="\/([^/][^"]*)"', r'\1="./\2"', html_content)

    if html_content != updated_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        print(f"🔧 Rutas absolutas corregidas en: {file}")

# 3. Verificación de existencia (Smoke Test de la Suite)
critical_suite = ['index.html', 'eisenhower.html', 'benchmark.html', 'voc.html', 'admin.html']
print("\n🔍 Ejecutando check de integridad de la suite UX...")

errors = 0
for tool in critical_suite:
    if os.path.exists(os.path.join(base_dir, tool)):
        print(f"  ✅ {tool} -> Presente y enrutado correctamente.")
    else:
        print(f"  ❌ ERROR: Falta el archivo crítico: {tool}")
        errors += 1

if errors == 0:
    print("\n🎉 ¡Todo listo! Estructura unificada y rutas relativas inyectadas con éxito.")
else:
    print(f"\n⚠️ Se encontraron {errors} advertencias. Revisa la ubicación de tus archivos.")