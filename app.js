// 1. Configuración real de tu proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBlPqHe_RhlesKTNWRmzHaBdlq_8nMQjVI",
  authDomain: "facturacion-5a21f.firebaseapp.com",
  projectId: "facturacion-5a21f",
  storageBucket: "facturacion-5a21f.firebasestorage.app",
  messagingSenderId: "993707105032",
  appId: "1:993707105032:web:620a0a852b7399e7bd6abd",
  measurementId: "G-CCM8GCP49Q"
};

// Inicialización de Firebase
const app = firebase.initializeApp(firebaseConfig);

// Inicialización de Firebase Analytics
let analytics;
if (typeof firebase.analytics === 'function') {
  analytics = firebase.analytics();
}

// Servicios de Firebase
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let modoRegistro = false;
let facturasGlobales = [];

// Escuchador del Estado de la Sesión
auth.onAuthStateChanged((user) => {
  const authContainer = document.getElementById('authContainer');
  const appContainer = document.getElementById('appContainer');

  if (user) {
    // Usuario Autenticado -> Mostrar Panel
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    document.getElementById('userInfo').innerText = user.email;

    const anioActual = new Date().getFullYear().toString();
    const selectAnio = document.getElementById('anioSelect');
    if (selectAnio.querySelector(`option[value="${anioActual}"]`)) {
      selectAnio.value = anioActual;
    }
    actualizarAnioNav();
    cargarDatosTrimestre();

  } else {
    // Sin sesión -> Mostrar Login
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
  }
});

// Lógica de Login / Registro
function alternarModoAuth() {
  modoRegistro = !modoRegistro;
  const btnSubmit = document.getElementById('btnAuthSubmit');
  const btnToggle = document.getElementById('btnAuthToggle');
  const toggleText = document.getElementById('authToggleText');
  const errorEl = document.getElementById('authError');

  errorEl.classList.add('hidden');

  if (modoRegistro) {
    btnSubmit.innerText = "Crear Cuenta";
    toggleText.innerText = "¿Ya tienes una cuenta?";
    btnToggle.innerText = "Iniciar Sesión";
  } else {
    btnSubmit.innerText = "Iniciar Sesión";
    toggleText.innerText = "¿No tienes cuenta de usuario?";
    btnToggle.innerText = "Registrarse";
  }
}

async function procesarAuth(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const errorEl = document.getElementById('authError');
  const btnSubmit = document.getElementById('btnAuthSubmit');

  errorEl.classList.add('hidden');
  btnSubmit.disabled = true;

  try {
    if (modoRegistro) {
      await auth.createUserWithEmailAndPassword(email, password);
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
  } catch (error) {
    errorEl.classList.remove('hidden');
    if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      errorEl.innerText = "Correo o contraseña incorrectos.";
    } else if (error.code === 'auth/email-already-in-use') {
      errorEl.innerText = "El correo ya está registrado.";
    } else if (error.code === 'auth/weak-password') {
      errorEl.innerText = "La contraseña debe tener al menos 6 caracteres.";
    } else {
      errorEl.innerText = error.message;
    }
  } finally {
    btnSubmit.disabled = false;
  }
}

function cerrarSesion() {
  auth.signOut();
}

function actualizarAnioNav() {
  const anio = document.getElementById('anioSelect').value;
  document.getElementById('labelAnioNav').innerText = anio;
}

// 2. Cargar datos desde Firestore
async function cargarDatosTrimestre() {
  const user = auth.currentUser;
  if (!user) return;

  const anio = document.getElementById('anioSelect').value;
  const trimestre = document.getElementById('trimestreSelect').value;
  
  try {
    const snapshot = await db.collection('facturas')
      .where('userId', '==', user.uid)
      .where('anio', '==', anio)
      .where('trimestre', '==', trimestre)
      .get();

    facturasGlobales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarTablasYTotales();
  } catch (error) {
    console.error("Error al cargar facturas:", error);
  }
}

// 3. Dibujar tablas y métricas
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

  document.getElementById('totalVentasBase').innerText = `${vBase.toFixed(2)} €`;
  document.getElementById('totalVentasIva').innerText = `${vIva.toFixed(2)} €`;
  document.getElementById('totalGastosBase').innerText = `${gBase.toFixed(2)} €`;
  document.getElementById('totalGastosIva').innerText = `${gIva.toFixed(2)} €`;
  document.getElementById('totalIrpf').innerText = `${totalIrpf.toFixed(2)} €`;

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

// 4. Formulario de Factura
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

// 5. Guardado en Firestore
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

  const fechaObj = new Date(fecha);
  const anio = fechaObj.getFullYear().toString();
  const mes = fechaObj.getMonth() + 1;
  
  let trimestre = '1T';
  if (mes >= 4 && mes <= 6) trimestre = '2T';
  if (mes >= 7 && mes <= 9) trimestre = '3T';
  if (mes >= 10) trimestre = '4T';

  try {
    let adjuntoUrl = '';
    const fileInput = document.getElementById('facturaAdjunto');
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const storageRef = storage.ref(`adjuntos/${user.uid}/${anio}/${Date.now()}_${file.name}`);
      await storageRef.put(file);
      adjuntoUrl = await storageRef.getDownloadURL();
    }

    await db.collection('facturas').add({
      userId: user.uid,
      tipo,
      fecha,
      anio,
      trimestre,
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

    document.getElementById('anioSelect').value = anio;
    document.getElementById('trimestreSelect').value = trimestre;
    actualizarAnioNav();

    cerrarModalFactura();
    await cargarDatosTrimestre();

  } catch (error) {
    console.error("Error al guardar:", error);
    alert("Error al guardar la factura: " + error.message);
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.innerText = "Guardar";
  }
}

// 6. Exportar CSV
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
