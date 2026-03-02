// Configuración para Bitcopper Tech Spa - IP: 192.168.1.135
const API_BASE = "http://192.168.1.135:8000"; 

/**
 * 1. Ejecuta la Auditoría Técnica del archivo IFC
 */
async function procesarBIM() {
    const fileInput = document.getElementById('fileInput');
    const resultadoDiv = document.getElementById('resultado');
    
    if (!fileInput.files[0]) {
        return alert("Por favor, selecciona un archivo IFC primero.");
    }

    const btn = document.querySelector('.btn-analizar');
    const originalText = btn.innerText;
    btn.innerText = "AUDITANDO MODELO...";
    btn.disabled = true;

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const response = await fetch(`${API_BASE}/procesar-modelo/`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.estado === "Éxito") {
            // Renderiza la tarjeta de resultados con el botón de pago sincronizado
            resultadoDiv.innerHTML = `
                <div style="background: rgba(100, 255, 218, 0.05); padding: 25px; border-radius: 12px; border: 1px solid #64ffda; text-align: left; margin-top: 20px;">
                    <h3 style="color: #64ffda; margin-top: 0;">📄 AUDITORÍA TÉCNICA PRO</h3>
                    <p>Elementos Detectados: <b>${data.elementos_detectados || data.elementos}</b></p>
                    <p>Índice de Confiabilidad: <b>${data.confiabilidad}</b></p>
                    
                    <div style="border: 1px solid #64ffda; padding: 15px; border-radius: 4px; margin: 20px 0; background: #112240;">
                        <span style="font-size: 0.8rem; color: #8892b0;">CERTIFICACIÓN BIM-PAY:</span><br>
                        <strong style="font-size: 1.2rem; color: #64ffda;">${data.certificacion}</strong>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 25px;">
                        <span>Total Soporte Técnico:</span>
                        <span style="font-size: 1.6rem; color: #64ffda; font-weight: bold;">$${data.monto_estimado_clp || data.monto} CLP</span>
                    </div>
                    
                    <button class="btn-analizar" style="margin-top: 20px;" onclick="pagarSoporte(${data.monto_estimado_clp || data.monto})">
                        CONTRATAR SOPORTE Y PAGAR
                    </button>
                </div>
            `;
        } else {
            alert("Error: " + (data.motivo || "No se pudo procesar el archivo."));
        }
    } catch (error) {
        console.error("Error de conexión:", error);
        alert("No hay conexión con el servidor de Bitcopper. Revisa que el servidor corra en 0.0.0.0");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

/**
 * 2. Conecta con la pasarela Flow para procesar el pago
 */
async function pagarSoporte(monto) {
    const email = prompt("Ingresa tu correo para recibir el certificado:", "bitcoppertech@gmail.com");
    if (!email) return;

    const params = new URLSearchParams();
    params.append('monto', monto);
    params.append('email_cliente', email);

    try {
        const res = await fetch(`${API_BASE}/generar-pago-flow/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });
        
        const flowData = await res.json();
        
        if (flowData.url) {
            window.location.href = `${flowData.url}?token=${flowData.token}`;
        } else {
            alert("Error de pasarela: Revisa tus credenciales de Flow.");
        }
    } catch (error) {
        alert("Error al conectar con la pasarela de pagos.");
    }
}

/**
 * 3. Lógica del Panel de Administración (Engranaje)
 */
function toggleAdmin() {
    const menu = document.getElementById('adminMenu');
    if (menu.style.display === 'block') {
        menu.style.display = 'none';
    } else {
        menu.style.display = 'block';
        actualizarStats();
    }
}

async function actualizarStats() {
    const statsText = document.getElementById('statsText');
    try {
        const res = await fetch(`${API_BASE}/admin/estadisticas`);
        const data = await res.json();
        statsText.innerHTML = `
            <b>Ventas:</b> ${data.total}<br>
            <b>Monto:</b> $${data.monto.toLocaleString()} CLP
        `;
    } catch (error) {
        statsText.innerText = "Error al cargar datos.";
    }
}

function descargarCSV() {
    window.location.href = `${API_BASE}/admin/descargar-csv`;
}