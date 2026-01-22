# 📱 Control de Precios - Módulos de Teléfonos Javicell

Sistema de gestión de precios para módulos de teléfonos con base de datos local y exportación a Excel.

## ✨ Características

- ✅ **Gestión Completa**: Agregar, editar, eliminar y buscar módulos
- 💾 **Persistencia Automática**: Los datos se guardan automáticamente en el navegador
- 📊 **Exportar a Excel**: Descarga todos los datos en formato `.xlsx`
- 📂 **Importar Datos**: Carga archivos Excel o SQLite
- 🖼️ **Imágenes**: Sube imágenes para cada módulo
- 🔍 **Búsqueda en Tiempo Real**: Filtra por modelo, marca o precio

## 🚀 Uso en Línea

**Accede a la aplicación en:**
```
https://TU-USUARIO.github.io/modulos-controller/
```

(Reemplaza `TU-USUARIO` con tu nombre de usuario de GitHub después del deployment)

## 💻 Uso Local

1. Descarga o clona este repositorio
2. Abre `index.html` en tu navegador
3. ¡Listo para usar!

## 📋 Cómo Usar

### Agregar un Módulo

1. Haz clic en **"➕ Agregar Módulo"**
2. Completa el formulario:
   - **Modelo**: Nombre del teléfono (ej: iPhone 15, Galaxy S23)
   - **Marca**: Fabricante (ej: Apple, Samsung)
   - **Precio**: Precio en USD
   - **Descripción** (opcional): Información adicional
   - **Imagen** (opcional): Foto del módulo
3. Haz clic en **"Guardar"**
4. ✅ Verás una notificación verde confirmando el guardado

### Buscar Módulos

Usa la barra de búsqueda para filtrar por:
- Modelo
- Marca
- Precio
- Descripción

### Exportar Datos

- **Descargar DB**: Exporta todos los datos a Excel (`.xlsx`)
- El archivo se nombrará automáticamente con la fecha actual

### Importar Datos

- **Cargar DB/Excel**: Importa datos desde:
  - Archivos Excel (`.xlsx`, `.xls`)
  - Archivos SQLite (`.db`)

## 🗄️ Almacenamiento

Los datos se guardan automáticamente en **LocalStorage** del navegador:
- ✅ Persisten entre sesiones
- ✅ No requieren servidor
- ⚠️ Límite aproximado: 5-10 MB

**Importante**: Los datos son **por navegador**. Para transferir entre dispositivos, usa la función de exportar/importar.

## 🌐 Deployment en GitHub Pages

### Paso 1: Crear Repositorio

1. Ve a [GitHub](https://github.com)
2. Haz clic en **"New Repository"**
3. Nombre: `modulos-controller` (o el que prefieras)
4. Marca como **Public**
5. Haz clic en **"Create repository"**

### Paso 2: Subir Archivos

Opción A - Por Interfaz Web:
1. En tu repositorio, haz clic en **"Add file"** → **"Upload files"**
2. Arrastra todos los archivos del proyecto:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `db.js`
   - `README.md`
3. Haz clic en **"Commit changes"**

Opción B - Por Git (Terminal):
```bash
cd "d:\santi\Documents\modulos controller"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/modulos-controller.git
git push -u origin main
```

### Paso 3: Activar GitHub Pages

1. En tu repositorio, ve a **"Settings"**
2. En el menú lateral, haz clic en **"Pages"**
3. En **"Source"**, selecciona:
   - Branch: `main`
   - Folder: `/ (root)`
4. Haz clic en **"Save"**
5. Espera 1-2 minutos

### Paso 4: Acceder a tu Sitio

Tu aplicación estará disponible en:
```
https://TU-USUARIO.github.io/modulos-controller/
```

🎉 **¡Listo!** Ahora puedes compartir este enlace con quien quieras.

## ☁️ Configuración de Supabase (Requerido)

Para que la sincronización en la nube funcione, necesitas configurar tu proyecto en Supabase:

### 1. Crear Tabla `modulos`

Ejecuta este SQL en el **SQL Editor** de Supabase:

```sql
CREATE TABLE public.modulos (
  id text PRIMARY KEY,
  model text NOT NULL,
  brand text NOT NULL,
  price numeric NOT NULL,
  description text,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso total" ON public.modulos FOR ALL USING (true) WITH CHECK (true);
```

### 2. Configurar Storage

1. Ve a **Storage** → **New Bucket**
2. Nombre: `module-images`
3. Marca **"Public bucket"**
4. Crear
5. **IMPORTANTE**: Ve a la pestaña **Configuration** del bucket → **Policies**
6. Crea una nueva política "Give users access to all files" (o permite INSERT/SELECT/UPDATE para public)

## 🔧 Tecnologías

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Base de Datos**: SQL.js (SQLite en el navegador)
- **Almacenamiento**: LocalStorage API
- **Exportación**: SheetJS (XLSX)
- **Hosting**: GitHub Pages (gratis)

## 📱 Compatibilidad

- ✅ Chrome
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Navegadores móviles

## 🐛 Solución de Problemas

### Los datos no se guardan

1. Abre la consola del navegador (F12)
2. Busca mensajes de error
3. Revisa que JavaScript esté habilitado
4. Verifica que no estés en modo incógnito/privado

### LocalStorage lleno

Si ves el error "QuotaExceededError":
1. Descarga tus datos a Excel
2. Limpia el LocalStorage: F12 → Application → Local Storage → Clear
3. Recarga la página

### Las imágenes no se cargan

- Las imágenes se guardan en base64 en LocalStorage
- Imágenes muy grandes pueden ocupar mucho espacio
- Si tienes problemas, usa imágenes más pequeñas (< 500KB)

## 📝 Notas

- Los datos se almacenan **localmente** en tu navegador
- **No hay base de datos en la nube**
- Para compartir datos entre dispositivos, usa exportar/importar
- GitHub Pages es **completamente gratis** para repositorios públicos

## 👨‍💻 Autor

Javicell - Sistema de Control de Precios

## 📄 Licencia

Este proyecto es de uso libre.

---

**¿Necesitas ayuda?** Abre un Issue en GitHub o contacta al desarrollador.
