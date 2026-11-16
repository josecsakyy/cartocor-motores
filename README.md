# Cartocor · Gestión de motores

Aplicación web para el inventario de motores industriales de **Cartocor Arroyito – Planta Papel**: registro en tabla, depósito de 24 tarimas y ubicación sobre el plano de la planta. Los datos se guardan en Firebase (Firestore) y se sincronizan en tiempo real entre todas las computadoras y pestañas abiertas.

## Funciones

- **Registro (tabla):** búsqueda, filtros por ubicación y condición (incluye "Pendientes"), cambio rápido de ubicación y condición.
- **Depósito:** 4 racks × 3 pisos × 2 tarimas. Los motores se **arrastran de una tarima a otra**.
- **Plano lay out:** plano real de la planta con zoom y desplazamiento; los motores se arrastran para ubicarlos.
- **Historial** de eventos por motor.
- **Excel:** importar y contrastar contra la base (solo actualiza datos técnicos, conserva historial y posición) y exportar inventario + historial.

Las tres vistas trabajan sobre **los mismos datos**: un motor creado, modificado o eliminado en una vista cambia en las otras dos (y en cualquier otra ventana abierta) al instante.

## Estructura

```
public/                 Archivos estáticos (plano.png, logo-cartocor.png)
src/
  config/firebase.js    Configuración de Firebase y ruta de la colección
  domain/               Reglas del negocio, sin React
    constants.js        Ubicaciones, condiciones, colores
    warehouse.js        Tarimas, racks y pisos
    motor.js            Modelo de motor, validación, historial, tags
  services/             Acceso a datos
    firestoreRepository.js   Firestore (caché offline compartida entre pestañas)
    localRepository.js       Respaldo en el navegador si Firebase no está disponible
  store/
    MotorsProvider.jsx        Fuente única de datos y acciones (crear, editar, mover, borrar)
    MotorDialogsProvider.jsx  Ventanas compartidas: editar, historial, eliminar
  features/             Una carpeta por pantalla o función
    table/  warehouse/  plan/  motors/  excel/
  components/           Piezas reutilizables (modales, toasts, selects, encabezado)
```

## Desarrollo

Requiere [Node.js](https://nodejs.org) 20.19 o superior.

```bash
npm install
npm run dev       # servidor local con recarga automática
npm run build     # genera la versión de producción en dist/
```

## Publicación

Cada push a `main` compila y publica la app en GitHub Pages (`.github/workflows/deploy.yml`).
Una sola vez: en **Settings → Pages → Source** elegir **GitHub Actions**.

## Plano y logo

- `public/plano.png`: exportado de *LAY OUT PLANTA PAPEL 2024.pdf*. Para actualizarlo, reemplazá el archivo por uno nuevo con el mismo nombre. Las posiciones de los motores se guardan en porcentaje, así que se mantienen si el plano conserva el encuadre.
- `public/logo-cartocor.png`: logo del encabezado.

## Reglas de seguridad (Firestore)

La configuración de Firebase en `src/config/firebase.js` es pública por diseño. Lo que protege los datos son las reglas de Firestore. Como mínimo, exigí un usuario autenticado:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/cartocor-motors-production/public/data/motors_list/{motorId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

La app inicia sesión de forma anónima, así que en **Firebase → Authentication** tiene que estar habilitado el proveedor *Anónimo*. Para restringir el acceso a personal de la planta, el siguiente paso es usar inicio de sesión con cuenta (Google o email).
