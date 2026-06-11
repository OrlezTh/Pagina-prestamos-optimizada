# 💸 Gestor de Préstamos

App web local para registrar y hacer seguimiento de préstamos personales. Corre en el navegador desde tu propia computadora — sin internet, sin servicios externos, sin costo mensual.

---

## Vista previa

> App con tema oscuro (índigo/violeta), calendario sincronizado y tarjetas por cliente.

![Gestor de Préstamos](https://placehold.co/900x500/0d0f14/7c6ff7?text=Gestor+de+Préstamos)

---

## ¿Qué hace?

- **Registrá préstamos** con nombre, monto, cantidad de cuotas, monto por cuota y fecha de inicio
- **Seguí cada cuota** con dots interactivos — hacé click para marcar cuotas pagadas una por una
- **Ve cuánto se acumuló** en pagos devueltos (no porcentaje, monto real en $)
- **Total a devolver** calculado automáticamente por préstamo
- **Calendario sincronizado** — marca los días que tenés cobros, hover para ver quién y cuánto
- **Editá o eliminá** cualquier préstamo en cualquier momento
- **Los datos se guardan** en un archivo `datos.json` en tu carpeta (con el servidor Node) o en el navegador (sin servidor)
- **Filtros** por todos / activos / cobrados

---

## Tecnologías

| Capa | Tecnología |
|------|------------|
| Frontend | HTML5, CSS3 (Grid, Flexbox, variables CSS), JavaScript vanilla |
| Backend | Node.js (servidor HTTP nativo, sin frameworks) |
| Persistencia | JSON local (`datos.json`) con fallback a `localStorage` |
| Íconos | Tabler Icons |
| Fuentes | DM Sans + DM Mono (Google Fonts) |

---

## Instalación y uso

### Opción A — Con servidor Node (recomendado, guarda en JSON)

**Requisito:** tener [Node.js](https://nodejs.org) instalado.

```bash
# 1. Clonar el repo
git clone https://github.com/OrlezTh/gestor-prestamos-js.git
cd gestor-prestamos-js

# 2. Iniciar el servidor
node servidor.js

# 3. Abrir en el navegador
http://localhost:3000
```

Los datos se guardan automáticamente en `datos.json` cada vez que agregás, editás o eliminás un préstamo.

---

### Opción B — Sin servidor (abre directo en el navegador)

Abrí `index.html` con doble click. Los datos se guardan en `localStorage` del navegador.

> ⚠ Con esta opción los datos se pierden si limpiás el historial del navegador.

---

## Estructura del proyecto

```
gestor-prestamos-js/
├── index.html        ← estructura de la app
├── estilos.css       ← todo el diseño y tema oscuro
├── main.js           ← lógica: préstamos, calendario, modal
├── servidor.js       ← servidor Node para guardar en JSON
├── datos.json        ← se crea solo al usar el servidor
└── README.md
```

---

## Funcionalidades en detalle

### Formulario de nuevo préstamo
- Monto por cuota se **calcula automáticamente** al ingresar monto y cuotas
- También se puede ingresar manualmente
- Fecha de inicio configurable por mes y día

### Tarjetas de préstamos
Cada cliente muestra:
- Nombre y fecha de inicio
- Monto por cuota destacado
- Barra de progreso con **monto acumulado en $** (no porcentaje)
- Dots de cuotas — click para marcar/desmarcar cada una
- Panel derecho: monto prestado, cantidad de cuotas, **total a devolver**
- Botones editar y eliminar

### Calendario
- Compacto, sticky al lado de la lista de préstamos
- Marca con un número los días que tenés cobros
- **Hover sobre un día** → tooltip con nombre y monto de cada cobro
- Navegación por mes con flechas

---

## Próximas mejoras

- [ ] Exportar resumen a PDF
- [ ] Notificaciones por WhatsApp (integración con Twilio)
- [ ] Modo multi-usuario con login
- [ ] Gráfico de cobros por mes

---

## Autor

**OrlezTh** — [github.com/OrlezTh](https://github.com/OrlezTh)
