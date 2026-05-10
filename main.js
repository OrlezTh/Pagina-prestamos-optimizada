/*
 * main.js — Gestión de Préstamos
 * ─────────────────────────────────────────────────────────────
 * Funcionalidades:
 *   1. Carga y guardado en localStorage
 *   2. Formulario con campo "monto por cuota" (auto o manual)
 *   3. Tarjetas rediseñadas: nombre, fecha+cuota, barra acumulada, panel derecho
 *   4. "Total a devolver" por préstamo
 *   5. Botones Editar + Eliminar
 *   6. Modal de edición
 *   7. Calendario sincronizado con cobros del día
 *   8. Tooltip del calendario con nombres y montos al hover
 * ─────────────────────────────────────────────────────────────
 */

const STORAGE_KEY = 'prestamos_v4';

// ── Detecta si estamos corriendo en el servidor local ──────
const USA_API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

let prestamos    = [];
let filtroActual = 'all';
const MAX_DOTS_VISIBLES = 24;

// ── DOM refs ─────────────────────────────────────────────────
const listaPrestamos = document.getElementById('loans-list');
const btnAgregar     = document.getElementById('btn-add');
const toastEl        = document.getElementById('toast');

const inputNombre     = document.getElementById('inp-nombre');
const inputMonto      = document.getElementById('inp-monto');
const inputCuotas     = document.getElementById('inp-cuotas');
const inputMontoCuota = document.getElementById('inp-monto-cuota');
const previewText     = document.getElementById('preview-text');
const inputMes        = document.getElementById('inp-mes');
const inputDia        = document.getElementById('inp-dia');

const statTotal    = document.getElementById('stat-total');
const statActivos  = document.getElementById('stat-activos');
const statCobrados = document.getElementById('stat-cobrados');

// Modal
const modalOverlay   = document.getElementById('modal-overlay');
const modalClose     = document.getElementById('modal-close');
const modalCancel    = document.getElementById('modal-cancel');
const modalSave      = document.getElementById('modal-save');
const editNombre     = document.getElementById('edit-nombre');
const editMonto      = document.getElementById('edit-monto');
const editCuotas     = document.getElementById('edit-cuotas');
const editMontoCuota = document.getElementById('edit-monto-cuota');
const editMes        = document.getElementById('edit-mes');
const editDia        = document.getElementById('edit-dia');
let editandoId = null;

// Calendario
let calYear, calMonth;


// ── Persistencia ─────────────────────────────────────────────

/**
 * Carga los préstamos.
 * Si estamos en localhost → usa la API (datos.json).
 * Si no → usa localStorage como fallback (abrir directo desde el archivo).
 */
async function cargarDatos() {
  if (USA_API) {
    try {
      const res  = await fetch('/api/prestamos');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('API no disponible, usando localStorage:', e);
    }
  }
  // Fallback localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

/**
 * Guarda los préstamos.
 * Si estamos en localhost → POST a la API (escribe datos.json).
 * Si no → localStorage.
 */
async function guardarDatos() {
  if (USA_API) {
    try {
      await fetch('/api/prestamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prestamos)
      });
      return;
    } catch (e) {
      console.warn('No se pudo guardar en API, usando localStorage:', e);
    }
  }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prestamos)); }
  catch (e) { console.warn('Error al guardar:', e); }
}


// ── Utilidades ────────────────────────────────────────────────
function formatearMonto(n) {
  return '$' + Number(n).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escaparHtml(t) {
  return String(t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function mesANumero(mes) { return MESES.indexOf(mes); }


// ── Toast ─────────────────────────────────────────────────────
let timerToast = null;
function mostrarToast(msg) {
  clearTimeout(timerToast);
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  timerToast = setTimeout(() => toastEl.classList.remove('show'), 2500);
}


// ── Auto-cálculo monto por cuota ──────────────────────────────
function actualizarPreviewCuota() {
  const monto  = parseFloat(inputMonto.value);
  const cuotas = parseInt(inputCuotas.value);
  const manual = parseFloat(inputMontoCuota.value);

  if (!manual && monto > 0 && cuotas >= 1) {
    const calc = monto / cuotas;
    inputMontoCuota.value = calc.toFixed(2);
    previewText.textContent = formatearMonto(calc);
  } else if (manual > 0) {
    previewText.textContent = formatearMonto(manual);
  } else {
    previewText.textContent = '—';
  }
}


// ── Estadísticas ──────────────────────────────────────────────
function actualizarEstadisticas() {
  const total    = prestamos.reduce((s, p) => s + Number(p.monto), 0);
  const activos  = prestamos.filter(p => !p.paid).length;
  const cobrados = prestamos.filter(p =>  p.paid).length;

  statTotal.textContent    = formatearMonto(total);
  statActivos.textContent  = activos;
  statCobrados.textContent = cobrados;
}


// ── HTML de dots ─────────────────────────────────────────────
function buildDotsHtml(p) {
  const total   = Number(p.cuotas);
  const pagadas = p.cuotasPagadas || 0;
  const mostrar = Math.min(total, MAX_DOTS_VISIBLES);

  const dots = Array.from({ length: mostrar }, (_, i) => {
    const hecho = i < pagadas;
    return `<button
      class="cuota-dot ${hecho ? 'done' : ''}"
      data-id="${p.id}" data-i="${i}"
      title="Cuota ${i+1}">${i+1}</button>`;
  }).join('');

  const extra = total > MAX_DOTS_VISIBLES
    ? `<span class="cuota-dot" style="background:var(--gray-light);color:var(--gray);cursor:default;border-radius:8px;width:auto;padding:0 6px;font-size:10px">+${total-MAX_DOTS_VISIBLES}</span>`
    : '';

  return dots + extra;
}


// ── HTML de tarjeta ───────────────────────────────────────────
function buildCardHtml(p) {
  const pagadas   = p.cuotasPagadas || 0;
  const total     = Number(p.cuotas);
  const monto     = Number(p.monto);
  const cuota     = p.montoCuota > 0 ? Number(p.montoCuota) : (total > 0 ? monto / total : 0);
  const acumulado = pagadas * cuota;
  const totalDev  = total * cuota;
  const porcentaje = total > 0 ? Math.round((pagadas / total) * 100) : 0;
  const pagado    = p.paid;

  const badgeDone = pagado
    ? `<span class="badge-done"><i class="ti ti-circle-check"></i> Completado</span>`
    : '';

  return `
  <div class="loan-card ${pagado ? 'paid' : ''}" id="card-${p.id}">

    <!-- Izquierda -->
    <div class="loan-left">
      <div class="check-area">
        <div class="checkbox ${pagado ? 'checked' : ''}"
             data-id="${p.id}" role="checkbox" aria-checked="${pagado}" tabindex="0"
             title="Marcar como cobrado">
          <i class="ti ti-check"></i>
        </div>
      </div>

      <div class="loan-info">
        <!-- Nombre -->
        <div class="loan-name">${escaparHtml(p.nombre)}</div>

        <!-- Fecha + monto cuota -->
        <div class="loan-subinfo">
          <span class="loan-subinfo-date">
            <i class="ti ti-calendar"></i>
            Desde el ${p.dia} de ${p.mes}
          </span>
          <span class="loan-subinfo-cuota">
            <i class="ti ti-receipt"></i>
            ${formatearMonto(cuota)}/cuota
          </span>
          ${badgeDone}
        </div>

        <!-- Barra de cuotas (muestra lo acumulado en $, no %) -->
        <div class="cuotas-bar">
          <div class="cuotas-label">
            <span>Cuotas pagadas</span>
            <span>${pagadas} de ${total} · ${formatearMonto(acumulado)} acumulado</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${porcentaje}%"></div>
          </div>
        </div>

        <!-- Dots -->
        <div class="cuotas-dots">${buildDotsHtml(p)}</div>
      </div>
    </div>

    <!-- Panel derecho -->
    <div class="loan-right">
      <!-- Monto prestado + cuotas -->
      <div class="loan-right-top">
        <div class="loan-monto-label">Prestado</div>
        <div class="loan-monto">${formatearMonto(monto)}</div>
        <div class="loan-cuota-info">${total} cuota${total !== 1 ? 's' : ''}</div>
      </div>

      <!-- Total a devolver -->
      <div class="loan-total-devolver">
        <div class="loan-total-label">Total a devolver</div>
        <div class="loan-total-val">${formatearMonto(totalDev)}</div>
      </div>

      <!-- Acciones -->
      <div class="loan-actions">
        <button class="btn-edit" data-edit="${p.id}" title="Editar préstamo">
          <i class="ti ti-edit"></i> Editar
        </button>
        <button class="btn-delete" data-del="${p.id}" title="Eliminar préstamo">
          <i class="ti ti-trash"></i> Eliminar
        </button>
      </div>
    </div>

  </div>`;
}


// ── Render ────────────────────────────────────────────────────
function render() {
  actualizarEstadisticas();
  renderCalendario();

  const visibles = prestamos.filter(p => {
    if (filtroActual === 'all')    return true;
    if (filtroActual === 'paid')   return p.paid;
    if (filtroActual === 'active') return !p.paid;
    return true;
  });

  if (visibles.length === 0) {
    listaPrestamos.innerHTML = `
      <div class="empty">
        <i class="ti ti-inbox"></i>
        <p>No hay préstamos en esta categoría</p>
      </div>`;
    return;
  }

  listaPrestamos.innerHTML = visibles.map(buildCardHtml).join('');
  attachCheckboxEvents();
  attachDotEvents();
  attachDeleteEvents();
  attachEditEvents();
}


// ── Eventos de tarjetas ───────────────────────────────────────
function attachCheckboxEvents() {
  listaPrestamos.querySelectorAll('.checkbox').forEach(el => {
    const toggle = () => {
      const p = prestamos.find(x => x.id === el.dataset.id);
      if (!p) return;
      p.paid = !p.paid;
      p.cuotasPagadas = p.paid ? Number(p.cuotas) : 0;
      guardarDatos();
      mostrarToast(p.paid ? `✓ ${p.nombre} cobrado` : `${p.nombre} marcado como activo`);
      render();
    };
    el.addEventListener('click', toggle);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
}

function attachDotEvents() {
  listaPrestamos.querySelectorAll('.cuota-dot[data-id]').forEach(el => {
    el.addEventListener('click', () => {
      const p = prestamos.find(x => x.id === el.dataset.id);
      if (!p) return;
      const idx     = Number(el.dataset.i);
      const pagadas = p.cuotasPagadas || 0;
      p.cuotasPagadas = (idx + 1 === pagadas) ? idx : idx + 1;
      p.paid = p.cuotasPagadas >= Number(p.cuotas);
      guardarDatos();
      render();
    });
  });
}

function attachDeleteEvents() {
  listaPrestamos.querySelectorAll('[data-del]').forEach(el => {
    el.addEventListener('click', () => {
      const p = prestamos.find(x => x.id === el.dataset.del);
      if (!p) return;
      if (!confirm(`¿Eliminar el préstamo de ${p.nombre}?\nEsta acción no se puede deshacer.`)) return;
      prestamos = prestamos.filter(x => x.id !== p.id);
      guardarDatos();
      mostrarToast(`Préstamo de ${p.nombre} eliminado`);
      render();
    });
  });
}

function attachEditEvents() {
  listaPrestamos.querySelectorAll('[data-edit]').forEach(el => {
    el.addEventListener('click', () => {
      const p = prestamos.find(x => x.id === el.dataset.edit);
      if (!p) return;
      editandoId = p.id;
      editNombre.value     = p.nombre;
      editMonto.value      = p.monto;
      editCuotas.value     = p.cuotas;
      editMontoCuota.value = p.montoCuota || (p.monto / p.cuotas).toFixed(2);
      editMes.value        = p.mes;
      editDia.value        = p.dia;
      modalOverlay.classList.add('open');
    });
  });
}


// ── Modal ─────────────────────────────────────────────────────
function cerrarModal() {
  modalOverlay.classList.remove('open');
  editandoId = null;
}

function guardarEdicion() {
  const p = prestamos.find(x => x.id === editandoId);
  if (!p) return;
  const nombre = editNombre.value.trim();
  const monto  = parseFloat(editMonto.value);
  const cuotas = parseInt(editCuotas.value);
  const mes    = editMes.value;
  const dia    = parseInt(editDia.value);
  let montoCuota = parseFloat(editMontoCuota.value);

  if (!nombre)              { mostrarToast('⚠ Ingresá el nombre'); return; }
  if (!monto || monto <= 0) { mostrarToast('⚠ Monto inválido'); return; }
  if (!cuotas || cuotas < 1){ mostrarToast('⚠ Cuotas inválidas'); return; }
  if (!mes)                 { mostrarToast('⚠ Seleccioná el mes'); return; }
  if (!dia || dia < 1 || dia > 31) { mostrarToast('⚠ Día inválido'); return; }
  if (!montoCuota || montoCuota <= 0) montoCuota = monto / cuotas;

  p.nombre     = nombre;
  p.monto      = monto;
  p.cuotas     = cuotas;
  p.montoCuota = montoCuota;
  p.mes        = mes;
  p.dia        = dia;

  guardarDatos();
  cerrarModal();
  mostrarToast(`✓ Préstamo de ${nombre} actualizado`);
  render();
}

modalClose.addEventListener('click', cerrarModal);
modalCancel.addEventListener('click', cerrarModal);
modalSave.addEventListener('click', guardarEdicion);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) cerrarModal(); });


// ── Agregar préstamo ──────────────────────────────────────────
function agregarPrestamo() {
  const nombre = inputNombre.value.trim();
  const monto  = parseFloat(inputMonto.value);
  const cuotas = parseInt(inputCuotas.value);
  const mes    = inputMes.value;
  const dia    = parseInt(inputDia.value);
  let montoCuota = parseFloat(inputMontoCuota.value);

  if (!nombre)              { mostrarToast('⚠ Ingresá el nombre del deudor'); return; }
  if (!monto || monto <= 0) { mostrarToast('⚠ Ingresá un monto válido'); return; }
  if (!cuotas || cuotas < 1){ mostrarToast('⚠ Ingresá la cantidad de cuotas'); return; }
  if (!mes)                 { mostrarToast('⚠ Seleccioná el mes de inicio'); return; }
  if (!dia || dia < 1 || dia > 31) { mostrarToast('⚠ Ingresá un día válido (1–31)'); return; }
  if (!montoCuota || montoCuota <= 0) montoCuota = monto / cuotas;

  const nuevo = {
    id:            generarId(),
    nombre, monto, cuotas, mes, dia,
    montoCuota,
    paid:          false,
    cuotasPagadas: 0,
    creadoEn:      new Date().toLocaleDateString('es-AR')
  };

  prestamos.unshift(nuevo);
  guardarDatos();

  inputNombre.value = '';
  inputMonto.value  = '';
  inputCuotas.value = '';
  inputMontoCuota.value = '';
  previewText.textContent = '—';
  inputMes.value    = '';
  inputDia.value    = '';
  inputNombre.focus();

  mostrarToast(`✓ Préstamo de ${nombre} agregado`);
  render();
}


// ── Filtros ───────────────────────────────────────────────────
function inicializarFiltros() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filtroActual = btn.dataset.filter;
      render();
    });
  });
}


// ═══════════════════════════════════════════════════
// CALENDARIO
// ═══════════════════════════════════════════════════

/**
 * Construye un mapa de { dia → [lista de préstamos] } para el mes/año dado.
 * Un préstamo "cobra" en el día p.dia de cada mes mientras esté activo.
 */
function getCobrosDelMes(year, month) {
  const map = {}; // { day: [prestamo, ...] }
  const diasEnMes = new Date(year, month + 1, 0).getDate();

  prestamos.forEach(p => {
    if (p.paid) return; // ignorar cobrados
    const mesInicio = mesANumero(p.mes);
    // año de inicio: usamos creadoEn o intentamos inferirlo del año actual
    // Simplificación: asumimos que el año de inicio es el año en que se creó el préstamo
    // Si no hay info, usamos el año actual como inicio
    let anoInicio = new Date().getFullYear();
    if (p.creadoEn) {
      const partes = p.creadoEn.split('/');
      if (partes.length === 3) anoInicio = parseInt(partes[2]);
    }

    // Calcular cuántos meses han pasado desde el inicio
    const mesInicioTotal = anoInicio * 12 + mesInicio;
    const mesActualTotal = year * 12 + month;
    const offset = mesActualTotal - mesInicioTotal;

    if (offset < 0) return; // todavía no empezó
    if (offset >= Number(p.cuotas)) return; // ya terminó

    // El cobro es en el día p.dia de este mes
    const dia = Number(p.dia);
    if (dia >= 1 && dia <= diasEnMes) {
      if (!map[dia]) map[dia] = [];
      map[dia].push(p);
    }
  });

  return map;
}

function renderCalendario() {
  const calGrid  = document.getElementById('cal-grid');
  const calTitle = document.getElementById('cal-title');
  if (!calGrid || !calTitle) return;

  const cobros = getCobrosDelMes(calYear, calMonth);

  calTitle.textContent = `${MESES[calMonth]} ${calYear}`;

  const primerDia = new Date(calYear, calMonth, 1).getDay(); // 0=Dom
  const diasEnMes = new Date(calYear, calMonth + 1, 0).getDate();

  const hoy = new Date();
  const esHoy = (d) => hoy.getFullYear() === calYear && hoy.getMonth() === calMonth && hoy.getDate() === d;

  let html = '';

  // Celdas vacías al inicio
  for (let i = 0; i < primerDia; i++) {
    html += `<div class="cal-day empty"></div>`;
  }

  for (let d = 1; d <= diasEnMes; d++) {
    const lista   = cobros[d] || [];
    const tieneCobros = lista.length > 0;
    const pill    = tieneCobros ? `<span class="cobro-pill">${lista.length}</span>` : '';
    const clases  = ['cal-day', esHoy(d) ? 'today' : '', tieneCobros ? 'has-cobros' : ''].filter(Boolean).join(' ');
    const dataAttr = tieneCobros ? `data-dia="${d}"` : '';

    html += `<div class="${clases}" ${dataAttr}>
      <span class="day-num">${d}</span>
      ${pill}
    </div>`;
  }

  calGrid.innerHTML = html;

  // Tooltip
  const tooltip = document.getElementById('cal-tooltip');
  calGrid.querySelectorAll('.cal-day.has-cobros').forEach(el => {
    el.addEventListener('mouseenter', (e) => {
      const dia   = Number(el.dataset.dia);
      const lista = cobros[dia] || [];
      let html = `<div class="cal-tooltip-title">${dia} de ${MESES[calMonth]}</div>`;
      lista.forEach(p => {
        const cuota = p.montoCuota > 0 ? Number(p.montoCuota) : (Number(p.monto) / Number(p.cuotas));
        html += `<div class="cal-tooltip-item">
          <span class="cal-tooltip-name">${escaparHtml(p.nombre)}</span>
          <span class="cal-tooltip-amount">${formatearMonto(cuota)}</span>
        </div>`;
      });
      tooltip.innerHTML = html;

      const rect = el.getBoundingClientRect();
      tooltip.style.left = Math.min(rect.left, window.innerWidth - 260) + 'px';
      tooltip.style.top  = (rect.top - tooltip.offsetHeight - 8 < 0)
        ? (rect.bottom + 8) + 'px'
        : (rect.top - 8) + 'px';
      tooltip.style.transform = 'translateY(-100%)';

      tooltip.classList.add('show');
    });

    el.addEventListener('mouseleave', () => {
      tooltip.classList.remove('show');
    });
  });
}

// Navegación del calendario
document.getElementById('cal-prev').addEventListener('click', () => {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendario();
});

document.getElementById('cal-next').addEventListener('click', () => {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendario();
});


// ── Auto-cálculo en formulario ────────────────────────────────
inputMonto.addEventListener('input', () => {
  // Si el usuario no tocó el campo manualmente, recalcular
  actualizarPreviewCuota();
});

inputCuotas.addEventListener('input', () => {
  actualizarPreviewCuota();
});

inputMontoCuota.addEventListener('input', () => {
  // Si escribe manualmente, solo actualizar el preview
  const manual = parseFloat(inputMontoCuota.value);
  previewText.textContent = manual > 0 ? formatearMonto(manual) : '—';
});


// ── Init ──────────────────────────────────────────────────────
async function init() {
  prestamos = await cargarDatos();

  // Inicializar mes/año del calendario al mes actual
  const hoy = new Date();
  calYear  = hoy.getFullYear();
  calMonth = hoy.getMonth();

  btnAgregar.addEventListener('click', agregarPrestamo);
  inputDia.addEventListener('keydown', e => { if (e.key === 'Enter') agregarPrestamo(); });

  inicializarFiltros();
  render();
}

document.addEventListener('DOMContentLoaded', init);
