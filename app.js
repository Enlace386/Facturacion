// 1. Configuración de Firebase (Coloca aquí las credenciales de tu proyecto)
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Inicialización de Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let facturasGlobales = [];

// Autenticación Anónima/Persistente
auth.onAuthStateChanged((user) => {
  if (user) {
    document.getElementById('userInfo').innerText = `ID Usuario: ${user.uid.substring(0, 6)}...`;
    
    // Asignar por defecto el año actual al selector
    const anioActual = new Date().getFullYear().toString();
    const selectAnio = document.getElementById('anioSelect');
    if (selectAnio.querySelector(`option[value="${anioActual}"]`)) {
      selectAnio.value = anioActual;
    }
    actualizarAnioNav();
    
    cargarDatosTrimestre();
  } else {
    auth.signInAnonymously().catch(console.error);
  }
});

function actualizarAnioNav() {
  const anio = document.getElementById('anioSelect').value;
  document.getElementById('labelAnioNav').innerText = anio;
}

// 2. Cargar datos del Año y Trimestre seleccionados
async function cargarDatosTrimestre() {
  const user = auth.currentUser;
  if (!user) return;

  const anio = document.getElementById('anioSelect').value;
  const trimestre = document.getElementById('trimestreSelect').value;
  
  try {
    // Consulta filtrando por Usuario, Año y Trimestre
    const snapshot = await db.collection('facturas')
      .where('userId', '==', user.uid)
      .where('anio', '==', anio)
      .where('trimestre', '==', trimestre)
      .get();

    facturasGlobales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarTablasYTotales();
  } catch (error) {
    console.error("Error al obtener facturas:", error);
  }
}

// 3. Renderizar acumulados e interfaz
function renderizarTablasYTotales() {
  const tablaEmitidas = document.getElementById('tablaEmitidas');
  const tablaRecibidas = document.getElementById('tablaRecibidas');
  
  tablaEmitidas.innerHTML = '';
  tablaRecibidas.innerHTML = '';

  let vBase = 0, vIva = 0, gBase = 0, gIva = 0, totalIrpf = 0;

  facturasGlobales.forEach(f => {
    if (f.tipo === 'emitida') {
      vBase += f.base;
      vIva += f.cuotaIva;
      totalIrpf += f.cuotaIrpf;

      tablaEmitidas.innerHTML += `
        <tr class="border-b text-xs hover:bg-slate-50">
          <td class="p-2 font-medium">${f.numero}<br><span class="text-slate-400">${f.fecha}</span></td>
          <td class="p-2">${f.tercero}</td>
          <td class="p-2">${f.base.toFixed(2)} €</td>
          <td class="p-2">${f.cuotaIva.toFixed(2)} €</td>
          <td class="p-2 font-bold">${f.total.toFixed(2)} €</td>
        </tr>
      `;
    } else {
      gBase += f.base;
      gIva += f.cuotaIva;

      const adjuntoHtml = f.adjuntoUrl 
        ? `<a href="${f.adjuntoUrl}" target="_blank" class="text-indigo-600 underline font-semibold">Ver Doc</a>` 
        : '-';

      tablaRecibidas.innerHTML += `
        <tr class="border-b text-xs hover:bg-slate-50">
          <td class="p-2 font-medium">${f.fecha}<br><span class="text-slate-400">${f.numero}</span></td>
          <td class="p-2">${f.tercero}</td>
          <td class="p-2">${f.base.toFixed(2)} €</td>
          <td class="p-2">${f.cuotaIva.toFixed(2)} €</td>
          <td class="p-2">${adjuntoHtml}</td>
        </tr>
      `;
    }
  });

  // Actualizar indicadores
  document.getElementById('totalVentasBase').innerText = `${vBase.toFixed(2)} €`;
  document.getElementById('totalVentasIva').innerText = `${vIva.toFixed(2)} €`;
  document.getElementById('totalGastosBase').innerText = `${gBase.toFixed(2)} €`;
  document.getElementById('totalGastosIva').innerText = `${gIva.toFixed(2)} €`;
  document.getElementById('totalIrpf').innerText = `${totalIrpf.toFixed(2)} €`;

  // Cálculo Modelo 303 (IVA Repercutido - IVA Soportado)
  const res303 = vIva - gIva;
  const res303El = document.getElementById('resultado303');
  res303El.innerText = `${res303.toFixed(2)} €`;
  
  const card = document.getElementById('cardLiquidacion');
  if (res303 >= 0) {
    card.className = "bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm";
    document.getElementById('resultado303Label').innerText = "A pagar a Hacienda (Ingreso)";
  } else {
    card.className = "bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm";
    document.getElementById('resultado303Label').innerText = "A compensar / devolver";
  }
}

// 4. Lógica del Formulario y Totales
function abrirModalFactura(tipo) {
  document.getElementById('facturaTipo').value = tipo;
  document.getElementById('modalTitle').innerText = tipo === 'emitida' ? 'Registrar Venta (Factura Emitida)' : 'Registrar Gasto (Factura Recibida)';
  document.getElementById('formFactura').reset();
  document.getElementById('facturaFecha').value = new Date().toISOString().split('T')[0];
  document.getElementById('modalFactura').classList.remove('hidden');
}

function cerrarModalFactura() {
  document.getElementById('modalFactura').classList.add('hidden');
}

function calcularTotalesModal() {
  const base = parseFloat(document.getElementById('facturaBase').value) || 0;
  const ivaPct = parseFloat(document.getElementById('facturaIvaPct').value) || 0;
  const irpfPct = parseFloat(document.getElementById('facturaIrpfPct').value) || 0;

  const cuotaIva = base * (ivaPct / 100);
  const cuotaIrpf = base * (irpfPct / 100);
  const total = base + cuotaIva - cuotaIrpf;

  document.getElementById('facturaTotal').value = total.toFixed(2);
}

// 5. Guardado automático en Firestore y asignación de Año/Trimestre
async function guardarFactura(e) {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  const btnGuardar = document.getElementById('btnGuardar');
  btnGuardar.disabled = true;
  btnGuardar.innerText = "Guardando...";

  const tipo = document.getElementById('facturaTipo').value;
  const fecha = document.getElementById('facturaFecha').value;
  const base = parseFloat(document.getElementById('facturaBase').value) || 0;
  const ivaPct = parseFloat(document.getElementById('facturaIvaPct').value) || 0;
  const irpfPct = parseFloat(document.getElementById('facturaIrpfPct').value) || 0;

  const cuotaIva = base * (ivaPct / 100);
  const cuotaIrpf = base * (irpfPct / 100);
  const total = base + cuotaIva - cuotaIrpf;

  // Extracción automática de Año y Trimestre según la fecha de la factura
  const fechaObj = new Date(fecha);
  const anio = fechaObj.getFullYear().toString();
  const mes = fechaObj.getMonth() + 1;
  
  let trimestre = '1T';
  if (mes >= 4 && mes <= 6) trimestre = '2T';
  if (mes >= 7 && mes <= 9) trimestre = '3T';
  if (mes >= 10) trimestre = '4T';

  try {
    // Subida de adjuntos (si hay)
    let adjuntoUrl = '';
    const fileInput = document.getElementById('facturaAdjunto');
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const storageRef = storage.ref(`adjuntos/${user.uid}/${anio}/${Date.now()}_${file.name}`);
      await storageRef.put(file);
      adjuntoUrl = await storageRef.getDownloadURL();
    }

    // Guardar en Firestore con la asignación correcta
    await db.collection('facturas').add({
      userId: user.uid,
      tipo,
      fecha,
      anio,        // <--- Ej: "2026", "2027"
      trimestre,   // <--- Ej: "1T", "2T"
      numero: document.getElementById('facturaNumero').value,
      tercero: document.getElementById('facturaTercero').value,
      nif: document.getElementById('facturaNif').value,
      base,
      ivaPct,
      cuotaIva,
      irpfPct,
      cuotaIrpf,
      total,
      adjuntoUrl,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Ajustar los desplegables de la interfaz al año/trimestre de la factura guardada
    document.getElementById('anioSelect').value = anio;
    document.getElementById('trimestreSelect').value = trimestre;
    actualizarAnioNav();

    cerrarModalFactura();
    await cargarDatosTrimestre();

  } catch (error) {
    console.error("Error al guardar la factura:", error);
    alert("Hubo un error al guardar la factura.");
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.innerText = "Guardar";
  }
}

// 6. Exportador a CSV para enviar a la gestoría
function exportarExcelGestoria() {
  if (facturasGlobales.length === 0) {
    alert("No hay facturas registradas en el período seleccionado.");
    return;
  }

  const anio = document.getElementById('anioSelect').value;
  const trimestre = document.getElementById('trimestreSelect').value;

  let csvContent = "data:text/csv;charset=utf-8,TIPO;FECHA;NUMERO;NIF;TERCERO;BASE;% IVA;CUOTA IVA;% IRPF;RETENCION IRPF;TOTAL\n";

  facturasGlobales.forEach(f => {
    csvContent += `${f.tipo.toUpperCase()};${f.fecha};${f.numero};${f.nif};"${f.tercero}";${f.base};${f.ivaPct}%;${f.cuotaIva};${f.irpfPct}%;${f.cuotaIrpf};${f.total}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Facturacion_Gestoria_${anio}_${trimestre}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}