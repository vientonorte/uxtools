const fs = require('fs');
const path = require('path');

console.log("🚀 [QA E2E] Iniciando auto-corrección de entorno...");

// 1. Mover herramientas huérfanas de /public a la raíz
const toolsToMove = ['voc.html'];
toolsToMove.forEach(file => {
    const srcPath = path.join(__dirname, 'public', file);
    const destPath = path.join(__dirname, file);

    if (fs.existsSync(srcPath)) {
        // Si ya existe en la raíz, hacemos un backup por seguridad antes de sobrescribir
        if (fs.existsSync(destPath)) {
            fs.renameSync(destPath, `${destPath}.bak`);
        }
        fs.renameSync(srcPath, destPath);
        console.log(`📦 Herramienta movida a la raíz: ${file}`);
    }
});

// 2. Corrección automática de rutas (Cambiar rutas absolutas a relativas)
// Esto evita que GitHub Pages busque los recursos en el dominio raíz en vez de /uxtools/
const htmlFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.html'));

htmlFiles.forEach(file => {
    if (file === 'index.html' || file === 'app.html') return;

    const filePath = path.join(__dirname, file);
    let htmlContent = fs.readFileSync(filePath, 'utf8');

    // Regex para detectar src="/..." o href="/..." y convertirlos en "./..."
    const updatedContent = htmlContent.replace(/(href|src)="\/([^/][^"]*)"/g, '$1="./$2"');

    if (htmlContent !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`🔧 Rutas absolutas corregidas en: ${file}`);
    }
});

// 3. Verificación de existencia (Smoke Test de archivos estáticos)
const criticalSuite = ['index.html', 'eisenhower.html', 'benchmark.html', 'voc.html', 'admin.html'];
console.log("\n🔍 Ejecutando check de integridad de la suite UX...");

let errors = 0;
criticalSuite.forEach(tool => {
    if (fs.existsSync(path.join(__dirname, tool))) {
        console.log(`  ✅ ${tool} -> Presente y enrutado correctamente.`);
    } else {
        console.error(`  ❌ ERROR: Falta el archivo crítico: ${tool}`);
        errors++;
    }
});

if (errors === 0) {
    console.log("\n🎉 ¡Todo listo! Estructura unificada y rutas relativas inyectadas con éxito.");
} else {
    console.log(`\n⚠️ Se encontraron ${errors} advertencias. Revisa los logs de arriba.`);
}