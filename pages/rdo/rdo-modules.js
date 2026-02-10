/* ============================================================================
   RDO FIDEL v2.0 - MÓDULOS AVANÇADOS
   
   Módulo 1: Clima por Período (Manhã/Tarde/Noite) com Data
   Módulo 2: Confirmação de Presença Multi-método (NFC/Facial/Assinatura/Manual)
   Módulo 3: Atividades Completas (Disciplina/Subdisciplina + HH + Distribuição)
   Módulo 4: Ocorrências/Paralisações/Interferências (mesma lógica de atividades)
   ============================================================================ */

'use strict';

// ============================================================================
// ESTADO DOS MÓDULOS
// ============================================================================

const MOD_STATE = {
    atividades: [],          // lista de atividades adicionadas
    ocorrencias: [],         // lista de ocorrências adicionadas
    atividadeCounter: 0,
    ocorrenciaCounter: 0,
    climaPeriodos: {         // dados climáticos por período
        manha:  { icon: '', descricao: '', temp: null, chuva: 0, vento: 0, umidade: 0 },
        tarde:  { icon: '', descricao: '', temp: null, chuva: 0, vento: 0, umidade: 0 },
        noite:  { icon: '', descricao: '', temp: null, chuva: 0, vento: 0, umidade: 0 }
    },
    nfcScanning: false,
    facialCapturing: false
};

// Mapear código de condição do OpenWeatherMap para condição simplificada
function mapearCondicaoClima(weatherId, chuva) {
    if (chuva > 0.5) return 'chuva';
    if (weatherId >= 200 && weatherId < 700) return 'chuva';   // trovoada, drizzle, chuva, neve, atmosfera
    if (weatherId >= 801 && weatherId <= 803) return 'bom_inoperante'; // nublado parcial
    if (weatherId === 804) return 'bom_inoperante'; // nublado total
    return 'bom'; // céu limpo (800)
}

// ============================================================================
// MÓDULO 1: CLIMA POR PERÍODO COM DATA SELECIONADA
// ============================================================================

async function buscarClimaCompleto() {
    const btn = document.getElementById('btn-buscar-clima');
    const dataInput = document.getElementById('data');
    
    if (!dataInput?.value) {
        alert('Selecione a data do RDO primeiro.');
        return;
    }

    const dataSelecionada = dataInput.value; // YYYY-MM-DD
    const hoje = new Date().toISOString().split('T')[0];

    btn.disabled = true;
    btn.innerHTML = '⏳ Buscando clima...';

    try {
        // 1. Determinar coordenadas: GPS → localização da obra → padrão
        let lat, lng, fonte;

        if (APP_STATE.gpsLocation?.lat && APP_STATE.gpsLocation?.lng) {
            lat = APP_STATE.gpsLocation.lat;
            lng = APP_STATE.gpsLocation.lng;
            fonte = 'GPS do dispositivo';
        } else if (APP_STATE.obra?.latitude && APP_STATE.obra?.longitude) {
            lat = APP_STATE.obra.latitude;
            lng = APP_STATE.obra.longitude;
            fonte = 'Localização da obra';
        } else {
            // Tentar GPS automático
            try {
                const pos = await new Promise((res, rej) =>
                    navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
                );
                lat = pos.coords.latitude.toFixed(7);
                lng = pos.coords.longitude.toFixed(7);
                APP_STATE.gpsLocation.lat = lat;
                APP_STATE.gpsLocation.lng = lng;
                APP_STATE.gpsLocation.texto = `${lat}, ${lng}`;
                document.getElementById('gps_location').value = APP_STATE.gpsLocation.texto;
                fonte = 'GPS capturado automaticamente';
            } catch {
                lat = -22.7519; lng = -43.4356; // Itaboraí RJ (padrão GASLUB)
                fonte = 'Coordenadas padrão da obra';
            }
        }

        console.log(`🌍 Buscando clima: ${lat}, ${lng} | Data: ${dataSelecionada} | Fonte: ${fonte}`);

        // 2. Escolher endpoint: forecast (até 5 dias) ou current (só hoje)
        let dadosPeriodos;

        if (dataSelecionada >= hoje) {
            // Forecast API (gratuita): dados a cada 3h por 5 dias
            const urlForecast = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${WEATHER_CONFIG.apiKey}&units=metric&lang=pt_br&cnt=40`;
            const resForecast = await fetch(urlForecast);
            if (!resForecast.ok) throw new Error(`API erro: ${resForecast.status}`);
            const forecastData = await resForecast.json();

            // Filtrar por data selecionada e separar por período
            dadosPeriodos = processarForecastPorPeriodo(forecastData.list, dataSelecionada);
        } else {
            // Data passada: usar current weather + marcar que é dados históricos limitados
            const urlCurrent = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_CONFIG.apiKey}&units=metric&lang=pt_br`;
            const resCurrent = await fetch(urlCurrent);
            if (!resCurrent.ok) throw new Error(`API erro: ${resCurrent.status}`);
            const currentData = await resCurrent.json();

            // Usar os mesmos dados para todos os períodos (limitação do plano gratuito)
            dadosPeriodos = replicarDadosParaPeriodos(currentData);
            document.getElementById('clima-aviso-historico')?.remove();
            const aviso = document.createElement('div');
            aviso.id = 'clima-aviso-historico';
            aviso.style.cssText = 'background:#fff3cd;border:1px solid #ffc107;padding:8px 12px;border-radius:6px;font-size:13px;margin-top:8px;';
            aviso.innerHTML = '⚠️ <strong>Data passada:</strong> Dados históricos detalhados requerem plano pago. Exibindo condição atual como referência.';
            document.getElementById('clima-automatico')?.appendChild(aviso);
        }

        // 3. Salvar e renderizar
        MOD_STATE.climaPeriodos = dadosPeriodos;
        APP_STATE.climaColetado = dadosPeriodos;

        renderizarClimaPorPeriodo(dadosPeriodos, fonte, dataSelecionada);

        // 4. Auto-preencher selects de condição
        autoPreencherSelectsClima(dadosPeriodos);

        document.getElementById('clima-automatico').style.display = 'block';

        btn.style.background = '#28a745';
        btn.style.color = 'white';
        btn.innerHTML = '✅ Clima obtido!';
        setTimeout(() => {
            btn.disabled = false;
            btn.style.background = '';
            btn.style.color = '';
            btn.innerHTML = '🌍 Buscar Dados Meteorológicos';
        }, 3000);

        console.log('✅ Dados climáticos por período obtidos:', dadosPeriodos);

    } catch (error) {
        console.error('❌ Erro ao buscar clima:', error);
        alert(`Erro ao buscar clima: ${error.message}`);
        btn.disabled = false;
        btn.innerHTML = '🌍 Buscar Dados Meteorológicos';
    }
}

function processarForecastPorPeriodo(lista, dataSelecionada) {
    // Filtrar itens da data selecionada
    const itensDoDia = lista.filter(item => {
        const dtLocal = new Date(item.dt * 1000);
        const dataItem = dtLocal.toISOString().split('T')[0];
        return dataItem === dataSelecionada;
    });

    const periodos = {
        manha: { horas: [6, 7, 8, 9, 10, 11], icon: '🌅', label: 'Manhã', itens: [] },
        tarde: { horas: [12, 13, 14, 15, 16, 17], icon: '☀️', label: 'Tarde', itens: [] },
        noite: { horas: [18, 19, 20, 21, 22, 23], icon: '🌙', label: 'Noite', itens: [] }
    };

    itensDoDia.forEach(item => {
        const hora = new Date(item.dt * 1000).getHours();
        if (hora >= 6 && hora < 12) periodos.manha.itens.push(item);
        else if (hora >= 12 && hora < 18) periodos.tarde.itens.push(item);
        else if (hora >= 18) periodos.noite.itens.push(item);
    });

    // Se não há dados para algum período, usar o mais próximo
    if (periodos.manha.itens.length === 0 && lista.length > 0) periodos.manha.itens = [lista[0]];
    if (periodos.tarde.itens.length === 0 && lista.length > 1) periodos.tarde.itens = [lista[Math.floor(lista.length / 2)]];
    if (periodos.noite.itens.length === 0 && lista.length > 0) periodos.noite.itens = [lista[lista.length - 1]];

    const resultado = {};
    for (const [key, periodo] of Object.entries(periodos)) {
        resultado[key] = calcularMediaPeriodo(periodo.itens, periodo.icon, periodo.label);
    }
    return resultado;
}

function replicarDadosParaPeriodos(current) {
    const base = {
        icon: getWeatherIcon(current.weather[0].id),
        descricao: current.weather[0].description,
        weatherId: current.weather[0].id,
        temp: Math.round(current.main.temp),
        tempMin: Math.round(current.main.temp_min),
        tempMax: Math.round(current.main.temp_max),
        umidade: current.main.humidity,
        vento: Math.round(current.wind.speed * 3.6),
        direcaoVento: converterDirecaoVento(current.wind.deg || 0),
        chuva: current.rain ? (current.rain['1h'] || 0) : 0,
        condicao: mapearCondicaoClima(current.weather[0].id, current.rain ? (current.rain['1h'] || 0) : 0)
    };
    return { manha: { ...base, label: 'Manhã' }, tarde: { ...base, label: 'Tarde' }, noite: { ...base, label: 'Noite' } };
}

function calcularMediaPeriodo(itens, icon, label) {
    if (!itens.length) return { icon, label, descricao: 'Sem dados', temp: null, umidade: 0, vento: 0, chuva: 0, condicao: '' };

    const temps = itens.map(i => i.main.temp);
    const umidades = itens.map(i => i.main.humidity);
    const ventos = itens.map(i => i.wind.speed * 3.6);
    const chuvas = itens.map(i => i.rain ? (i.rain['1h'] || i.rain['3h'] || 0) : 0);

    // Condição dominante
    const weatherId = itens[Math.floor(itens.length / 2)].weather[0].id;
    const totalChuva = chuvas.reduce((a, b) => a + b, 0);

    return {
        icon: getWeatherIcon(weatherId),
        label,
        descricao: itens[Math.floor(itens.length / 2)].weather[0].description,
        weatherId,
        temp: Math.round(temps.reduce((a, b) => a + b, 0) / temps.length),
        tempMin: Math.round(Math.min(...temps)),
        tempMax: Math.round(Math.max(...temps)),
        umidade: Math.round(umidades.reduce((a, b) => a + b, 0) / umidades.length),
        vento: Math.round(ventos.reduce((a, b) => a + b, 0) / ventos.length),
        chuva: parseFloat(totalChuva.toFixed(1)),
        condicao: mapearCondicaoClima(weatherId, totalChuva)
    };
}

function getWeatherIcon(id) {
    if (id >= 200 && id < 300) return '⛈️';
    if (id >= 300 && id < 500) return '🌦️';
    if (id >= 500 && id < 600) return '🌧️';
    if (id >= 600 && id < 700) return '❄️';
    if (id >= 700 && id < 800) return '🌫️';
    if (id === 800) return '☀️';
    if (id === 801 || id === 802) return '⛅';
    if (id === 803 || id === 804) return '☁️';
    return '🌤️';
}

function renderizarClimaPorPeriodo(periodos, fonte, data) {
    const container = document.getElementById('clima-info');
    const dataFormatada = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

    const cards = ['manha', 'tarde', 'noite'].map(periodo => {
        const d = periodos[periodo];
        const condicaoLabel = { bom: '☀️ Bom', bom_inoperante: '⛅ Bom Inoperante', chuva: '🌧️ Chuva' };
        return `
            <div style="background:white;border-radius:10px;padding:16px;flex:1;min-width:180px;box-shadow:0 2px 8px rgba(0,0,0,0.08);border-top:4px solid ${periodo==='manha'?'#f59e0b':periodo==='tarde'?'#3b82f6':'#6366f1'};">
                <div style="text-align:center;margin-bottom:10px;">
                    <div style="font-size:32px;">${d.icon}</div>
                    <div style="font-weight:700;font-size:15px;color:#374151;">${d.label}</div>
                    <div style="font-size:12px;color:#6b7280;text-transform:capitalize;">${d.descricao}</div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px;">
                    <div style="background:#f3f4f6;padding:6px;border-radius:6px;text-align:center;">
                        <div style="font-weight:700;font-size:18px;color:#1f2937;">${d.temp ?? '--'}°C</div>
                        <div style="color:#6b7280;font-size:11px;">Temperatura</div>
                    </div>
                    <div style="background:#f3f4f6;padding:6px;border-radius:6px;text-align:center;">
                        <div style="font-weight:700;font-size:16px;color:#1f2937;">${d.umidade}%</div>
                        <div style="color:#6b7280;font-size:11px;">Umidade</div>
                    </div>
                    <div style="background:#f3f4f6;padding:6px;border-radius:6px;text-align:center;">
                        <div style="font-weight:700;font-size:14px;color:#1f2937;">${d.vento} km/h</div>
                        <div style="color:#6b7280;font-size:11px;">Vento</div>
                    </div>
                    <div style="background:#f3f4f6;padding:6px;border-radius:6px;text-align:center;">
                        <div style="font-weight:700;font-size:14px;color:#1f2937;">${d.chuva} mm</div>
                        <div style="color:#6b7280;font-size:11px;">Chuva</div>
                    </div>
                </div>
                <div style="margin-top:8px;text-align:center;background:${d.condicao==='bom'?'#d1fae5':d.condicao==='chuva'?'#fee2e2':'#fef3c7'};
                            color:${d.condicao==='bom'?'#065f46':d.condicao==='chuva'?'#991b1b':'#92400e'};
                            padding:4px 8px;border-radius:20px;font-size:12px;font-weight:600;">
                    ${condicaoLabel[d.condicao] || '--'}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div style="background:#f0f9ff;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#075985;">
            📅 <strong>${dataFormatada}</strong> &nbsp;|&nbsp; 📍 <strong>${fonte}</strong>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
            ${cards}
        </div>
    `;
}

function autoPreencherSelectsClima(periodos) {
    const mapa = { bom: 'bom', bom_inoperante: 'bom_inoperante', chuva: 'chuva' };
    const climaManha = document.getElementById('clima_manha');
    const climaTarde = document.getElementById('clima_tarde');
    const climaNoite = document.getElementById('clima_noite');

    if (climaManha && periodos.manha?.condicao) climaManha.value = mapa[periodos.manha.condicao] || '';
    if (climaTarde && periodos.tarde?.condicao) climaTarde.value = mapa[periodos.tarde.condicao] || '';
    if (climaNoite && periodos.noite?.condicao) climaNoite.value = mapa[periodos.noite.condicao] || '';
}

// ============================================================================
// MÓDULO 2: CONFIRMAÇÃO DE PRESENÇA MULTI-MÉTODO
// ============================================================================

// Override da função original para adicionar todos os métodos sempre
function mostrarOpcoesConfirmacaoAvancado(index) {
    const colab = APP_STATE.equipe[index];

    document.getElementById(`confirma-${index}`).innerHTML = `
        <div style="background:#e8f5e9;padding:14px;border-radius:8px;border-left:4px solid #4caf50;">
            <strong style="display:block;margin-bottom:10px;font-size:14px;">⚠️ Confirmar presença de <em>${colab.nome}</em>:</strong>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${colab.nfc_tag_id ? `
                <button type="button" onclick="iniciarNFC(${index})" style="background:#0ea5e9;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">
                    📡 NFC
                </button>` : ''}
                <button type="button" onclick="iniciarReconhecimentoFacial(${index})" style="background:#8b5cf6;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">
                    📸 Facial
                </button>
                <button type="button" onclick="iniciarAssinaturaColaborador(${index})" style="background:#f59e0b;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">
                    ✍️ Assinatura
                </button>
                <button type="button" onclick="confirmarPresencaManual(${index})" style="background:#22c55e;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">
                    ✅ Manual
                </button>
            </div>
            <div id="metodo-status-${index}" style="margin-top:8px;"></div>
        </div>
    `;
}

// NFC - Web NFC API (Chrome Android)
window.iniciarNFC = async function(index) {
    const statusEl = document.getElementById(`metodo-status-${index}`);
    const colab = APP_STATE.equipe[index];

    if (!('NDEFReader' in window)) {
        statusEl.innerHTML = `<div style="background:#fef3c7;padding:8px;border-radius:6px;font-size:13px;color:#92400e;">
            ⚠️ NFC não disponível neste dispositivo/navegador. Use Chrome no Android.
        </div>`;
        return;
    }

    statusEl.innerHTML = `
        <div style="background:#dbeafe;padding:10px;border-radius:6px;text-align:center;">
            <div style="font-size:28px;margin-bottom:6px;">📡</div>
            <strong>Aproxime o crachá NFC do leitor...</strong><br>
            <small style="color:#3b82f6;">Aguardando leitura NFC</small><br>
            <button onclick="cancelarNFC(${index})" style="margin-top:8px;background:#ef4444;color:white;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px;">✕ Cancelar</button>
        </div>
    `;

    try {
        const ndef = new NDEFReader();
        MOD_STATE.nfcScanning = true;
        await ndef.scan();

        ndef.addEventListener('reading', ({ serialNumber }) => {
            MOD_STATE.nfcScanning = false;
            const tagLida = serialNumber.toUpperCase();
            const tagEsperada = colab.nfc_tag_id?.toUpperCase();

            if (tagLida === tagEsperada) {
                finalizarConfirmacao(index, 'nfc', `Tag: ${tagLida}`);
            } else {
                statusEl.innerHTML = `
                    <div style="background:#fee2e2;padding:8px;border-radius:6px;font-size:13px;color:#991b1b;">
                        ❌ Tag NFC não reconhecida.<br>
                        <small>Tag lida: ${tagLida}</small><br>
                        <small>Tag cadastrada: ${tagEsperada || 'não cadastrada'}</small>
                    </div>`;
            }
        });

        ndef.addEventListener('readingerror', () => {
            statusEl.innerHTML = `<div style="background:#fee2e2;padding:8px;border-radius:6px;font-size:13px;color:#991b1b;">❌ Erro na leitura NFC</div>`;
        });

    } catch (error) {
        statusEl.innerHTML = `<div style="background:#fee2e2;padding:8px;border-radius:6px;font-size:13px;color:#991b1b;">❌ Erro NFC: ${error.message}</div>`;
    }
};

window.cancelarNFC = function(index) {
    MOD_STATE.nfcScanning = false;
    document.getElementById(`metodo-status-${index}`).innerHTML = '';
};

// RECONHECIMENTO FACIAL - Captura foto pela câmera
window.iniciarReconhecimentoFacial = async function(index) {
    const statusEl = document.getElementById(`metodo-status-${index}`);
    const colab = APP_STATE.equipe[index];

    statusEl.innerHTML = `
        <div style="background:#f3e8ff;padding:12px;border-radius:8px;text-align:center;" id="facial-container-${index}">
            <div style="font-size:24px;margin-bottom:8px;">📸</div>
            <strong style="font-size:14px;">Captura Facial</strong><br>
            <small style="color:#7c3aed;">Posicione o rosto na câmera e tire uma foto</small>
            <div style="margin:10px 0;position:relative;">
                <video id="facial-video-${index}" autoplay playsinline style="width:100%;max-width:280px;border-radius:8px;border:2px solid #8b5cf6;"></video>
            </div>
            <div style="display:flex;gap:8px;justify-content:center;">
                <button onclick="capturarFotoFacial(${index})" style="background:#8b5cf6;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;">📷 Capturar</button>
                <button onclick="cancelarFacial(${index})" style="background:#6b7280;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;">✕ Cancelar</button>
            </div>
        </div>
    `;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: 280, height: 210 }
        });
        const video = document.getElementById(`facial-video-${index}`);
        if (video) {
            video.srcObject = stream;
            video._stream = stream;
        }
    } catch (err) {
        statusEl.innerHTML = `
            <div style="background:#fee2e2;padding:8px;border-radius:6px;font-size:13px;color:#991b1b;">
                ❌ Câmera não disponível: ${err.message}<br>
                <button onclick="confirmarPresencaManual(${index})" style="margin-top:6px;background:#22c55e;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px;">✅ Confirmar Manual</button>
            </div>`;
    }
};

window.capturarFotoFacial = function(index) {
    const video = document.getElementById(`facial-video-${index}`);
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 210;
    canvas.getContext('2d').drawImage(video, 0, 0, 280, 210);
    const fotoBase64 = canvas.toDataURL('image/jpeg', 0.8);

    // Parar câmera
    if (video._stream) video._stream.getTracks().forEach(t => t.stop());

    // Salvar foto de reconhecimento
    APP_STATE.equipe[index].fotoReconhecimento = fotoBase64;

    const container = document.getElementById(`facial-container-${index}`);
    if (container) {
        container.innerHTML = `
            <div style="text-align:center;">
                <img src="${fotoBase64}" style="width:120px;height:90px;object-fit:cover;border-radius:6px;border:3px solid #22c55e;">
                <div style="margin-top:8px;color:#065f46;font-size:13px;">✅ Foto capturada com sucesso</div>
                <button onclick="finalizarConfirmacao(${index}, 'facial', 'Foto capturada')" 
                        style="margin-top:8px;background:#22c55e;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;">
                    ✅ Confirmar Presença
                </button>
            </div>
        `;
    }
};

window.cancelarFacial = function(index) {
    const video = document.getElementById(`facial-video-${index}`);
    if (video?._stream) video._stream.getTracks().forEach(t => t.stop());
    document.getElementById(`metodo-status-${index}`).innerHTML = '';
};

// ASSINATURA DO COLABORADOR - Canvas individual
window.iniciarAssinaturaColaborador = function(index) {
    const statusEl = document.getElementById(`metodo-status-${index}`);

    statusEl.innerHTML = `
        <div style="background:#fff7ed;padding:12px;border-radius:8px;" id="assinatura-container-${index}">
            <strong style="font-size:14px;display:block;margin-bottom:8px;">✍️ Assinar Presença:</strong>
            <canvas id="canvas-colab-${index}" width="320" height="100"
                style="border:2px solid #f59e0b;border-radius:6px;background:white;cursor:crosshair;touch-action:none;width:100%;max-width:320px;display:block;"></canvas>
            <div style="display:flex;gap:8px;margin-top:8px;">
                <button onclick="limparAssinaturaColab(${index})" style="background:#6b7280;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:13px;">🔄 Limpar</button>
                <button onclick="salvarAssinaturaColab(${index})" style="background:#f59e0b;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">✅ Confirmar Assinatura</button>
                <button onclick="document.getElementById('metodo-status-${index}').innerHTML=''" style="background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:13px;">✕ Cancelar</button>
            </div>
        </div>
    `;

    setTimeout(() => configurarCanvasColab(index), 50);
};

function configurarCanvasColab(index) {
    const canvas = document.getElementById(`canvas-colab-${index}`);
    if (!canvas) return;

    // Ajustar resolução
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = 120 * window.devicePixelRatio;
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let isDrawing = false, lastX = 0, lastY = 0;

    const getPos = (e) => {
        const r = canvas.getBoundingClientRect();
        const src = e.touches ? e.touches[0] : e;
        return [(src.clientX - r.left), (src.clientY - r.top)];
    };

    canvas.addEventListener('mousedown', (e) => { isDrawing = true; [lastX, lastY] = getPos(e); });
    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const [x, y] = getPos(e);
        ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke();
        [lastX, lastY] = [x, y];
    });
    canvas.addEventListener('mouseup', () => { isDrawing = false; });
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); isDrawing = true; [lastX, lastY] = getPos(e); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const [x, y] = getPos(e);
        ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke();
        [lastX, lastY] = [x, y];
    }, { passive: false });
    canvas.addEventListener('touchend', () => { isDrawing = false; });
}

window.limparAssinaturaColab = function(index) {
    const canvas = document.getElementById(`canvas-colab-${index}`);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

window.salvarAssinaturaColab = function(index) {
    const canvas = document.getElementById(`canvas-colab-${index}`);
    if (!canvas) return;

    // Verificar se algo foi desenhado
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some((v, i) => i % 4 === 3 && v > 0);

    if (!hasContent) {
        alert('⚠️ Por favor, assine antes de confirmar.');
        return;
    }

    APP_STATE.equipe[index].assinaturaColetada = canvas.toDataURL('image/png');
    finalizarConfirmacao(index, 'assinatura', 'Assinatura coletada');
};

// CONFIRMAÇÃO MANUAL
window.confirmarPresencaManual = function(index) {
    finalizarConfirmacao(index, 'manual', 'Confirmado manualmente');
};

// FINALIZAR CONFIRMAÇÃO (qualquer método)
window.finalizarConfirmacao = function(index, metodo, detalhe) {
    APP_STATE.equipe[index].confirmado = true;
    APP_STATE.equipe[index].metodoConfirmacao = metodo;
    APP_STATE.equipe[index].confirmadoEm = new Date().toISOString();
    APP_STATE.equipe[index].detalheConfirmacao = detalhe;

    const card = document.getElementById(`colab-${index}`);
    if (card) card.classList.add('colaborador-confirmado');

    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const icones = { nfc: '📡', facial: '📸', assinatura: '✍️', manual: '✅' };
    const cores = { nfc: '#0ea5e9', facial: '#8b5cf6', assinatura: '#f59e0b', manual: '#22c55e' };

    const badgeEl = document.getElementById(`badge-${index}`);
    if (badgeEl) {
        badgeEl.innerHTML = `
            <span style="background:${cores[metodo]};color:white;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:600;">
                ${icones[metodo]} ${metodo.toUpperCase()} ${hora}
            </span>`;
    }

    const confirmaEl = document.getElementById(`confirma-${index}`);
    if (confirmaEl) {
        confirmaEl.innerHTML = `
            <div style="background:#d1fae5;padding:10px;border-radius:6px;text-align:center;color:#065f46;">
                ${icones[metodo]} Confirmado por <strong>${metodo.toUpperCase()}</strong> às ${hora}
            </div>`;
    }

    // Recarregar atividades para incluir novo confirmado
    setTimeout(() => renderizarBotaoAdicionarAtividade(), 100);
};

// ============================================================================
// MÓDULO 3: ATIVIDADES COMPLETAS
// ============================================================================

function renderizarBotaoAdicionarAtividade() {
    const container = document.getElementById('atividades-container');
    if (!container) return;

    const presentes = APP_STATE.equipe.filter(c => c.confirmado && c.rdoStatus === 'presente');

    if (presentes.length === 0) {
        if (MOD_STATE.atividades.length === 0) {
            container.innerHTML = `<p style="color:#999;font-style:italic;">As atividades aparecerão aqui após confirmar os colaboradores presentes...</p>`;
        }
        return;
    }

    // Garantir botão add atividade no final
    if (!document.getElementById('btn-add-atividade')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'btn-add-atividade';
        btn.className = 'btn btn-primary';
        btn.style.marginTop = '12px';
        btn.innerHTML = '➕ Adicionar Atividade';
        btn.onclick = adicionarAtividade;
        container.appendChild(btn);
    }
}

window.adicionarAtividade = function() {
    const container = document.getElementById('atividades-container');
    const id = ++MOD_STATE.atividadeCounter;

    // Obter disciplinas únicas das atividades pré-definidas
    const disciplinas = [...new Set(
        (APP_STATE.atividadesPredefinidas || []).map(a => a.disciplina).filter(Boolean)
    )].sort();

    // Colaboradores presentes e confirmados
    const presentes = APP_STATE.equipe.filter(c => c.confirmado && c.rdoStatus === 'presente');

    const optsDisciplina = disciplinas.length > 0
        ? disciplinas.map(d => `<option value="${d}">${d}</option>`).join('')
        : '<option value="">Nenhuma disciplina cadastrada</option>';

    const div = document.createElement('div');
    div.id = `atividade-${id}`;
    div.style.cssText = 'border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:14px;background:#fafafa;position:relative;';
    div.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <strong style="color:#1e40af;font-size:15px;">📋 Atividade #${id}</strong>
            <button type="button" onclick="removerAtividade(${id})" style="background:#ef4444;color:white;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:13px;">✕ Remover</button>
        </div>

        <!-- Hierarquia -->
        <div class="form-row" style="margin-bottom:12px;">
            <div class="form-group col-md-4">
                <label style="font-size:13px;font-weight:600;">Disciplina *</label>
                <select id="atv-disciplina-${id}" class="form-control" onchange="carregarSubdisciplinas(${id})" required>
                    <option value="">Selecione a disciplina...</option>
                    ${optsDisciplina}
                </select>
            </div>
            <div class="form-group col-md-4">
                <label style="font-size:13px;font-weight:600;">Subdisciplina</label>
                <select id="atv-subdisciplina-${id}" class="form-control" onchange="carregarServicos(${id})">
                    <option value="">-- Selecione a disciplina --</option>
                </select>
            </div>
            <div class="form-group col-md-4">
                <label style="font-size:13px;font-weight:600;">Atividade/Serviço</label>
                <select id="atv-servico-${id}" class="form-control">
                    <option value="">-- Selecione a subdisciplina --</option>
                </select>
            </div>
        </div>

        <!-- Descrição -->
        <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:13px;font-weight:600;">Descrição Detalhada *</label>
            <textarea id="atv-descricao-${id}" class="form-control" rows="2" placeholder="Descreva a atividade executada, local, etapa, observações relevantes..." required
                style="resize:vertical;"></textarea>
        </div>

        <!-- Horários -->
        <div class="form-row" style="margin-bottom:12px;">
            <div class="form-group col-md-3">
                <label style="font-size:13px;font-weight:600;">Início</label>
                <input type="time" id="atv-inicio-${id}" class="form-control" onchange="calcularHHAtividade(${id})">
            </div>
            <div class="form-group col-md-3">
                <label style="font-size:13px;font-weight:600;">Fim</label>
                <input type="time" id="atv-fim-${id}" class="form-control" onchange="calcularHHAtividade(${id})">
            </div>
            <div class="form-group col-md-3">
                <label style="font-size:13px;font-weight:600;">Duração (HH)</label>
                <input type="text" id="atv-duracao-${id}" class="form-control" readonly placeholder="--:--"
                    style="background:#f3f4f6;font-weight:700;color:#1e40af;">
            </div>
            <div class="form-group col-md-3">
                <label style="font-size:13px;font-weight:600;">HH Total Equipe</label>
                <input type="text" id="atv-hh-total-${id}" class="form-control" readonly placeholder="--"
                    style="background:#f3f4f6;font-weight:700;color:#059669;">
            </div>
        </div>

        <!-- Colaboradores participantes -->
        <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <label style="font-size:13px;font-weight:600;margin:0;">👷 Colaboradores / Horas Individuais</label>
                <button type="button" onclick="distribuirHHAtividade(${id})" style="background:#3b82f6;color:white;border:none;padding:4px 12px;border-radius:5px;cursor:pointer;font-size:12px;">⚡ Distribuir Igualmente</button>
            </div>
            <div id="atv-colaboradores-${id}" style="background:#f8fafc;border-radius:8px;padding:10px;max-height:200px;overflow-y:auto;">
                ${presentes.length === 0
                    ? '<p style="color:#999;font-size:13px;margin:0;">Nenhum colaborador confirmado presente.</p>'
                    : presentes.map(c => `
                        <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #e5e7eb;">
                            <div style="flex:1;font-size:13px;">
                                <span style="cursor:pointer;" onclick="toggleColabAtividade(${id}, '${c.id}')" id="check-atv-${id}-${c.id}">
                                    ✅
                                </span>
                                <strong>${c.nome}</strong>
                                <small style="color:#6b7280;">(${c.funcao})</small>
                            </div>
                            <input type="number" id="hh-${id}-${c.id}" step="0.5" min="0" max="24" value="0"
                                style="width:70px;padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:13px;text-align:center;"
                                onchange="recalcularHHTotal(${id})"
                                data-colab-id="${c.id}">
                            <span style="font-size:12px;color:#6b7280;">h</span>
                        </div>
                    `).join('')
                }
            </div>
        </div>
    `;

    // Inserir antes do botão add
    const btnAdd = document.getElementById('btn-add-atividade');
    if (btnAdd) {
        container.insertBefore(div, btnAdd);
    } else {
        container.appendChild(div);
        renderizarBotaoAdicionarAtividade();
    }

    // Remover mensagem vazia
    const placeholder = container.querySelector('p');
    if (placeholder && placeholder.textContent.includes('aparecerão aqui')) placeholder.remove();

    // Salvar referência
    MOD_STATE.atividades.push({ id, colaboradores: presentes.map(c => ({ ...c, hh: 0, ativo: true })) });
};

window.toggleColabAtividade = function(atvidId, colabId) {
    const checkEl = document.getElementById(`check-atv-${atvidId}-${colabId}`);
    const hhInput = document.getElementById(`hh-${atvidId}-${colabId}`);
    const atv = MOD_STATE.atividades.find(a => a.id === atvidId);
    if (!atv) return;

    const colab = atv.colaboradores.find(c => c.id === colabId);
    if (!colab) return;

    colab.ativo = !colab.ativo;
    checkEl.textContent = colab.ativo ? '✅' : '⬜';
    hhInput.disabled = !colab.ativo;
    hhInput.style.opacity = colab.ativo ? '1' : '0.4';
    if (!colab.ativo) hhInput.value = 0;

    recalcularHHTotal(atvidId);
};

window.carregarSubdisciplinas = function(id) {
    const disciplina = document.getElementById(`atv-disciplina-${id}`).value;
    const selectSub = document.getElementById(`atv-subdisciplina-${id}`);
    const selectServ = document.getElementById(`atv-servico-${id}`);

    selectSub.innerHTML = '<option value="">Selecione a subdisciplina...</option>';
    selectServ.innerHTML = '<option value="">-- Selecione a subdisciplina --</option>';

    if (!disciplina) return;

    const subs = [...new Set(
        (APP_STATE.atividadesPredefinidas || [])
            .filter(a => a.disciplina === disciplina && a.tipo)
            .map(a => a.tipo)
    )].sort();

    subs.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s; opt.textContent = s;
        selectSub.appendChild(opt);
    });
};

window.carregarServicos = function(id) {
    const disciplina = document.getElementById(`atv-disciplina-${id}`).value;
    const subdisciplina = document.getElementById(`atv-subdisciplina-${id}`).value;
    const selectServ = document.getElementById(`atv-servico-${id}`);

    selectServ.innerHTML = '<option value="">Selecione o serviço...</option>';
    if (!disciplina || !subdisciplina) return;

    const servicos = (APP_STATE.atividadesPredefinidas || [])
        .filter(a => a.disciplina === disciplina && a.tipo === subdisciplina && a.subtipo)
        .map(a => ({ id: a.id, nome: a.subtipo }));

    servicos.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id; opt.textContent = s.nome;
        selectServ.appendChild(opt);
    });
};

window.calcularHHAtividade = function(id) {
    const inicio = document.getElementById(`atv-inicio-${id}`).value;
    const fim = document.getElementById(`atv-fim-${id}`).value;

    if (!inicio || !fim) return;

    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fim.split(':').map(Number);
    let minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (minutos < 0) minutos += 24 * 60; // turno noturno

    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    const duracaoDecimal = minutos / 60;

    document.getElementById(`atv-duracao-${id}`).value =
        `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    // Distribuir automaticamente para todos os colaboradores ativos
    const atv = MOD_STATE.atividades.find(a => a.id === id);
    if (atv) {
        atv.duracaoHH = duracaoDecimal;
        atv.colaboradores.filter(c => c.ativo).forEach(c => {
            const input = document.getElementById(`hh-${id}-${c.id}`);
            if (input) {
                input.value = duracaoDecimal.toFixed(1);
                c.hh = duracaoDecimal;
            }
        });
    }

    recalcularHHTotal(id);
};

window.distribuirHHAtividade = function(id) {
    const atv = MOD_STATE.atividades.find(a => a.id === id);
    if (!atv) return;

    const duracaoEl = document.getElementById(`atv-duracao-${id}`);
    const duracao = atv.duracaoHH || 0;

    if (duracao === 0) {
        alert('⚠️ Defina os horários de início e fim primeiro.');
        return;
    }

    atv.colaboradores.filter(c => c.ativo).forEach(c => {
        const input = document.getElementById(`hh-${id}-${c.id}`);
        if (input) {
            input.value = duracao.toFixed(1);
            c.hh = duracao;
        }
    });

    recalcularHHTotal(id);
};

window.recalcularHHTotal = function(id) {
    const atv = MOD_STATE.atividades.find(a => a.id === id);
    if (!atv) return;

    let total = 0;
    atv.colaboradores.forEach(c => {
        if (c.ativo) {
            const input = document.getElementById(`hh-${id}-${c.id}`);
            const v = parseFloat(input?.value || 0);
            c.hh = v;
            total += v;
        }
    });

    const hhTotalEl = document.getElementById(`atv-hh-total-${id}`);
    if (hhTotalEl) hhTotalEl.value = `${total.toFixed(1)} HH`;
};

window.removerAtividade = function(id) {
    if (!confirm('Remover esta atividade?')) return;
    document.getElementById(`atividade-${id}`)?.remove();
    MOD_STATE.atividades = MOD_STATE.atividades.filter(a => a.id !== id);
};

// ============================================================================
// MÓDULO 4: OCORRÊNCIAS / PARALISAÇÕES / INTERFERÊNCIAS
// ============================================================================

// Override da função stub original
window.adicionarOcorrencia = function() {
    const container = document.getElementById('ocorrencias-container');
    const id = ++MOD_STATE.ocorrenciaCounter;

    // Categorias de tipos de ocorrência
    const categorias = [...new Set(
        (APP_STATE.tiposOcorrencias || []).map(t => t.categoria).filter(Boolean)
    )].sort();

    const tiposParalisacao = ['Chuva', 'Falta de material', 'Falta de equipamento', 'Problema elétrico', 'Acidente', 'Decisão de gestão', 'Falta de frente de serviço', 'Interferência de terceiros', 'Outros'];

    const presentes = APP_STATE.equipe.filter(c => c.confirmado && c.rdoStatus === 'presente');

    const div = document.createElement('div');
    div.id = `ocorrencia-${id}`;
    div.style.cssText = 'border:1px solid #fca5a5;border-radius:10px;padding:16px;margin-bottom:14px;background:#fff8f8;position:relative;';
    div.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <strong style="color:#dc2626;font-size:15px;">⚠️ Ocorrência / Paralisação #${id}</strong>
            <button type="button" onclick="removerOcorrencia(${id})" style="background:#ef4444;color:white;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:13px;">✕ Remover</button>
        </div>

        <!-- Tipo e Categoria -->
        <div class="form-row" style="margin-bottom:12px;">
            <div class="form-group col-md-4">
                <label style="font-size:13px;font-weight:600;">Classificação *</label>
                <select id="ocr-classificacao-${id}" class="form-control" required onchange="atualizarTiposOcorrencia(${id})">
                    <option value="">Selecione...</option>
                    <option value="ocorrencia">🔴 Ocorrência</option>
                    <option value="paralisacao">🟠 Paralisação</option>
                    <option value="interferencia">🟡 Interferência</option>
                    <option value="qco">🔵 QCO (Quase Colisão)</option>
                    <option value="acidente">⛔ Acidente</option>
                </select>
            </div>
            <div class="form-group col-md-4">
                <label style="font-size:13px;font-weight:600;">Tipo / Causa *</label>
                <select id="ocr-tipo-${id}" class="form-control" required>
                    <option value="">-- Selecione a classificação --</option>
                </select>
            </div>
            <div class="form-group col-md-4">
                <label style="font-size:13px;font-weight:600;">Responsável</label>
                <select id="ocr-responsavel-${id}" class="form-control">
                    <option value="">Selecione o responsável...</option>
                    ${APP_STATE.equipe.map(c => `<option value="${c.id}">${c.nome} (${c.funcao})</option>`).join('')}
                </select>
            </div>
        </div>

        <!-- Descrição -->
        <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:13px;font-weight:600;">Descrição / Detalhamento *</label>
            <textarea id="ocr-descricao-${id}" class="form-control" rows="3"
                placeholder="Descreva detalhadamente a ocorrência: o que aconteceu, onde, condições, ações tomadas..."
                required style="resize:vertical;"></textarea>
        </div>

        <!-- Horários -->
        <div class="form-row" style="margin-bottom:12px;">
            <div class="form-group col-md-3">
                <label style="font-size:13px;font-weight:600;">Início</label>
                <input type="time" id="ocr-inicio-${id}" class="form-control" onchange="calcularHHOcorrencia(${id})">
            </div>
            <div class="form-group col-md-3">
                <label style="font-size:13px;font-weight:600;">Fim</label>
                <input type="time" id="ocr-fim-${id}" class="form-control" onchange="calcularHHOcorrencia(${id})">
            </div>
            <div class="form-group col-md-3">
                <label style="font-size:13px;font-weight:600;">Duração</label>
                <input type="text" id="ocr-duracao-${id}" class="form-control" readonly placeholder="--:--"
                    style="background:#fff5f5;font-weight:700;color:#dc2626;">
            </div>
            <div class="form-group col-md-3">
                <label style="font-size:13px;font-weight:600;">HH Perdidas (Total)</label>
                <input type="text" id="ocr-hh-perdidas-${id}" class="form-control" readonly placeholder="--"
                    style="background:#fff5f5;font-weight:700;color:#dc2626;">
            </div>
        </div>

        <!-- Colaboradores afetados -->
        <div style="margin-bottom:12px;">
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">👷 Colaboradores Afetados</label>
            <div id="ocr-colaboradores-${id}" style="background:#fef2f2;border-radius:8px;padding:10px;max-height:180px;overflow-y:auto;">
                ${presentes.length === 0
                    ? '<p style="color:#999;font-size:13px;margin:0;">Nenhum colaborador confirmado. Informe manualmente.</p>'
                    : `<div style="margin-bottom:8px;">
                        <button type="button" onclick="selecionarTodosOcr(${id},true)" style="background:#ef4444;color:white;border:none;padding:3px 10px;border-radius:4px;font-size:12px;cursor:pointer;margin-right:4px;">Todos</button>
                        <button type="button" onclick="selecionarTodosOcr(${id},false)" style="background:#6b7280;color:white;border:none;padding:3px 10px;border-radius:4px;font-size:12px;cursor:pointer;">Nenhum</button>
                       </div>
                    ${presentes.map(c => `
                        <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #fee2e2;">
                            <input type="checkbox" id="ocr-check-${id}-${c.id}" data-colab-id="${c.id}"
                                style="width:16px;height:16px;cursor:pointer;" checked
                                onchange="recalcularHHOcorrencia(${id})">
                            <label for="ocr-check-${id}-${c.id}" style="flex:1;font-size:13px;cursor:pointer;margin:0;">
                                <strong>${c.nome}</strong> <small style="color:#6b7280;">(${c.funcao})</small>
                            </label>
                        </div>
                    `).join('')}`
                }
            </div>
        </div>

        <!-- Fotos da Ocorrência -->
        <div>
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">📷 Fotos da Ocorrência</label>
            <div style="display:flex;align-items:center;gap:10px;">
                <input type="file" id="ocr-foto-input-${id}" accept="image/*" multiple style="display:none;"
                    onchange="adicionarFotoOcorrencia(${id}, this)">
                <button type="button" onclick="document.getElementById('ocr-foto-input-${id}').click()"
                    style="background:#6b7280;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:13px;">
                    📷 Adicionar Fotos
                </button>
                <span id="ocr-foto-count-${id}" style="font-size:13px;color:#6b7280;">0 foto(s)</span>
            </div>
            <div id="ocr-fotos-grid-${id}" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;"></div>
        </div>
    `;

    container.appendChild(div);
    MOD_STATE.ocorrencias.push({ id, fotos: [], colaboradores: presentes.map(c => c.id) });
};

window.atualizarTiposOcorrencia = function(id) {
    const classificacao = document.getElementById(`ocr-classificacao-${id}`).value;
    const selectTipo = document.getElementById(`ocr-tipo-${id}`);

    // Definir tipos por classificação
    const tiposPorClassificacao = {
        ocorrencia: (APP_STATE.tiposOcorrencias || []).filter(t => t.categoria === 'ocorrencia').length > 0
            ? APP_STATE.tiposOcorrencias.filter(t => t.categoria === 'ocorrencia').map(t => t.nome)
            : ['Falta de material', 'Problema com equipamento', 'Problema elétrico', 'Condição climática', 'Falta de pessoal', 'Problema de projeto', 'Outros'],
        paralisacao: ['Chuva intensa', 'Raios', 'Vento forte', 'Falta de material', 'Falta de equipamento', 'Manutenção', 'Decisão gerencial', 'Falta de frente de serviço', 'Interferência externa', 'Outros'],
        interferencia: ['Interferência de outra disciplina', 'Interferência de terceiros', 'Conflito de cronograma', 'Interdição de área', 'Outros'],
        qco: ['Queda de objeto', 'Quase colisão veicular', 'Exposição a produto químico', 'Quase acidente elétrico', 'Outros'],
        acidente: ['Acidente com afastamento', 'Acidente sem afastamento', 'Primeiros socorros', 'Dano material', 'Outros']
    };

    const tipos = tiposPorClassificacao[classificacao] || [];
    selectTipo.innerHTML = '<option value="">Selecione o tipo...</option>' +
        tipos.map(t => `<option value="${t}">${t}</option>`).join('');
};

window.calcularHHOcorrencia = function(id) {
    const inicio = document.getElementById(`ocr-inicio-${id}`).value;
    const fim = document.getElementById(`ocr-fim-${id}`).value;
    if (!inicio || !fim) return;

    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fim.split(':').map(Number);
    let minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (minutos < 0) minutos += 24 * 60;

    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    const duracaoDecimal = minutos / 60;

    document.getElementById(`ocr-duracao-${id}`).value =
        `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    const ocr = MOD_STATE.ocorrencias.find(o => o.id === id);
    if (ocr) ocr.duracaoHH = duracaoDecimal;

    recalcularHHOcorrencia(id);
};

window.recalcularHHOcorrencia = function(id) {
    const ocr = MOD_STATE.ocorrencias.find(o => o.id === id);
    if (!ocr) return;

    const duracao = ocr.duracaoHH || 0;
    let afetados = 0;

    const presentes = APP_STATE.equipe.filter(c => c.confirmado && c.rdoStatus === 'presente');
    presentes.forEach(c => {
        const check = document.getElementById(`ocr-check-${id}-${c.id}`);
        if (check?.checked) afetados++;
    });

    // Se não houver colaboradores renderizados (informado manualmente)
    if (presentes.length === 0) afetados = 1;

    const hhPerdidas = (duracao * afetados).toFixed(1);
    const hhEl = document.getElementById(`ocr-hh-perdidas-${id}`);
    if (hhEl) hhEl.value = `${hhPerdidas} HH (${afetados} colabs)`;

    if (ocr) ocr.colaboradoresAfetados = afetados;
};

window.selecionarTodosOcr = function(id, selecionar) {
    const presentes = APP_STATE.equipe.filter(c => c.confirmado && c.rdoStatus === 'presente');
    presentes.forEach(c => {
        const check = document.getElementById(`ocr-check-${id}-${c.id}`);
        if (check) check.checked = selecionar;
    });
    recalcularHHOcorrencia(id);
};

window.adicionarFotoOcorrencia = async function(id, input) {
    const ocr = MOD_STATE.ocorrencias.find(o => o.id === id);
    if (!ocr) return;

    const files = Array.from(input.files);
    for (const file of files) {
        const base64 = await fileToBase64(file);
        const seq = (ocr.fotos.length + 1).toString().padStart(3, '0');
        const nome = `rdo${APP_STATE.numeroRDO}-ocr${id}-${seq}.${file.name.split('.').pop()}`;
        ocr.fotos.push({ nome, base64, file });
    }

    renderizarFotosOcorrencia(id, ocr.fotos);
};

function renderizarFotosOcorrencia(id, fotos) {
    const grid = document.getElementById(`ocr-fotos-grid-${id}`);
    const count = document.getElementById(`ocr-foto-count-${id}`);
    if (!grid) return;

    count.textContent = `${fotos.length} foto(s)`;
    grid.innerHTML = fotos.map((f, i) => `
        <div style="position:relative;width:80px;height:60px;">
            <img src="${f.base64}" style="width:80px;height:60px;object-fit:cover;border-radius:5px;border:1px solid #fca5a5;">
            <button onclick="removerFotoOcorrencia(${id},${i})" type="button"
                style="position:absolute;top:-5px;right:-5px;background:#ef4444;color:white;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:11px;line-height:1;display:flex;align-items:center;justify-content:center;">×</button>
        </div>
    `).join('');
}

window.removerFotoOcorrencia = function(ocrId, fotoIndex) {
    const ocr = MOD_STATE.ocorrencias.find(o => o.id === ocrId);
    if (!ocr) return;
    ocr.fotos.splice(fotoIndex, 1);
    renderizarFotosOcorrencia(ocrId, ocr.fotos);
};

window.removerOcorrencia = function(id) {
    if (!confirm('Remover esta ocorrência?')) return;
    document.getElementById(`ocorrencia-${id}`)?.remove();
    MOD_STATE.ocorrencias = MOD_STATE.ocorrencias.filter(o => o.id !== id);
};

// ============================================================================
// INICIALIZAÇÃO E HOOKS DO MÓDULO
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Hook: override funções originais após carregamento
    setTimeout(() => {
        // Substituir buscarDadosClimaticos original
        const btnClima = document.getElementById('btn-buscar-clima');
        if (btnClima) {
            btnClima.replaceWith(btnClima.cloneNode(true)); // remover eventos antigos
            document.getElementById('btn-buscar-clima').addEventListener('click', buscarClimaCompleto);
        }

        // Listener para mudança de data → rebuscar clima automaticamente
        const inputData = document.getElementById('data');
        if (inputData) {
            inputData.addEventListener('change', function() {
                if (APP_STATE.climaColetado) {
                    console.log('📅 Data alterada → rebuscando clima...');
                    buscarClimaCompleto();
                }
            });
        }

        // Substituir mostrarOpcoesConfirmacao globalmente
        window._originalMostrarOpcoesConfirmacao = window.mostrarOpcoesConfirmacao;
        window.mostrarOpcoesConfirmacao = mostrarOpcoesConfirmacaoAvancado;

        // Adicionar botão de atividade quando a página já tiver colaboradores
        renderizarBotaoAdicionarAtividade();

        // Override confirmarPresenca para usar o novo flow
        window.confirmarPresenca = function(index, metodo) {
            if (metodo === 'manual') {
                finalizarConfirmacao(index, 'manual', 'Confirmado manualmente');
            } else if (metodo === 'nfc') {
                iniciarNFC(index);
            } else if (metodo === 'facial') {
                iniciarReconhecimentoFacial(index);
            } else if (metodo === 'assinatura') {
                iniciarAssinaturaColaborador(index);
            }
        };

        console.log('✅ RDO Módulos Avançados carregados!');
        console.log('  📡 Módulo 1: Clima por período - ATIVO');
        console.log('  👤 Módulo 2: Confirmação multi-método - ATIVO');
        console.log('  📋 Módulo 3: Atividades completas - ATIVO');
        console.log('  ⚠️  Módulo 4: Ocorrências/Paralisações - ATIVO');
    }, 500);
});

// Exportar dados para salvamento
window.getModulesData = function() {
    return {
        climaPeriodos: MOD_STATE.climaPeriodos,
        atividades: MOD_STATE.atividades.map(a => ({
            id: a.id,
            disciplina: document.getElementById(`atv-disciplina-${a.id}`)?.value,
            subdisciplina: document.getElementById(`atv-subdisciplina-${a.id}`)?.value,
            servico: document.getElementById(`atv-servico-${a.id}`)?.value,
            descricao: document.getElementById(`atv-descricao-${a.id}`)?.value,
            inicio: document.getElementById(`atv-inicio-${a.id}`)?.value,
            fim: document.getElementById(`atv-fim-${a.id}`)?.value,
            duracao: document.getElementById(`atv-duracao-${a.id}`)?.value,
            hhTotal: document.getElementById(`atv-hh-total-${a.id}`)?.value,
            colaboradores: a.colaboradores.filter(c => c.ativo).map(c => ({
                id: c.id, nome: c.nome, hh: c.hh
            }))
        })),
        ocorrencias: MOD_STATE.ocorrencias.map(o => ({
            id: o.id,
            classificacao: document.getElementById(`ocr-classificacao-${o.id}`)?.value,
            tipo: document.getElementById(`ocr-tipo-${o.id}`)?.value,
            descricao: document.getElementById(`ocr-descricao-${o.id}`)?.value,
            responsavel: document.getElementById(`ocr-responsavel-${o.id}`)?.value,
            inicio: document.getElementById(`ocr-inicio-${o.id}`)?.value,
            fim: document.getElementById(`ocr-fim-${o.id}`)?.value,
            duracao: document.getElementById(`ocr-duracao-${o.id}`)?.value,
            hhPerdidas: document.getElementById(`ocr-hh-perdidas-${o.id}`)?.value,
            fotos: o.fotos.length,
            colaboradoresAfetados: o.colaboradoresAfetados || 0
        }))
    };
};

console.log('✅ rdo-modules.js carregado! Aguardando DOM...');
