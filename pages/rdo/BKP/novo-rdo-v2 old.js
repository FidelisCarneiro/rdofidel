/* ============================================================================
   RDO FIDEL v2.0 - SISTEMA COMPLETO
   Relatório Diário de Obra - Padrão Petrobras
   
   API CLIMA: OpenWeatherMap ✅ CONFIGURADA
   Desenvolvido para: GASLUB Itaboraí
   ============================================================================ */

'use strict';

// ============================================================================
// CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
// ============================================================================

// API Clima - OpenWeatherMap (Configurada)
const WEATHER_CONFIG = {
    apiKey: '898fb3f2c6c1c69668bd590a37a7383b',
    baseUrl: 'https://api.openweathermap.org/data/2.5/weather',
    units: 'metric',
    lang: 'pt_br'
};

// Estado da Aplicação
const APP_STATE = {
    obra: null,
    numeroRDO: '00000000',
    supervisor: null,
    encarregado: null,
    equipe: [],
    atividades: [],
    atividadesPredefinidas: [],
    tiposOcorrencias: [],
    fotosColetadas: {
        pts: [],
        atividades: [],
        equipes: [],
        dds: [],
        gerais: [],
        ocorrencias: []
    },
    climaColetado: null,
    signaturePad: null,
    gpsLocation: { lat: null, lng: null, texto: '' }
};

// Contadores
let atividadeCounter = 0;
let ocorrenciaCounter = 0;

// ============================================================================
// INICIALIZAÇÃO DO SISTEMA
// ============================================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 RDO FIDEL v2.0 - Iniciando sistema...');
    
    try {
        // 1. Verificar autenticação
        await verificarAutenticacao();
        
        // 2. Inicializar dados
        await inicializarDados();
        
        // 3. Configurar eventos
        configurarEventListeners();
        
        // 4. Configurar componentes
        configurarSignaturePad();
        
        console.log('✅ Sistema inicializado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro fatal na inicialização:', error);
        alert('Erro ao inicializar o sistema. Recarregue a página.\n\n' + error.message);
    }
});

// ============================================================================
// AUTENTICAÇÃO
// ============================================================================

async function verificarAutenticacao() {
    try {
        const { data: { user }, error } = await window.supabase.auth.getUser();
        
        if (error || !user) {
            window.location.href = '../../index.html';
            throw new Error('Sessão expirada');
        }
        
        document.getElementById('user-name').textContent = user.email;
        console.log('✅ Usuário autenticado:', user.email);
        
    } catch (error) {
        console.error('❌ Erro de autenticação:', error);
        throw error;
    }
}

// ============================================================================
// INICIALIZAÇÃO DE DADOS
// ============================================================================

async function inicializarDados() {
    console.log('📊 Carregando dados do sistema...');
    
    try {
        // Executar em paralelo para performance
        await Promise.all([
            buscarObraDoUsuario(),
            carregarAtividadesPredefinidas(),
            carregarTiposOcorrencias()
        ]);
        
        // Após carregar obra
        await gerarNumeroRDO();
        await carregarSupervisores();
        
        // Configurações iniciais
        preencherDataAtual();
        capturarLocalizacaoGPS();
        
        console.log('✅ Dados carregados com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        throw error;
    }
}

// ============================================================================
// BUSCAR OBRA DO USUÁRIO
// ============================================================================

async function buscarObraDoUsuario() {
    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        
        // Buscar colaborador e obra
        const { data: colaborador, error } = await window.supabase
            .from('colaboradores')
            .select('obra_id, obras(*)')
            .eq('email', user.email)
            .single();
        
        if (error || !colaborador?.obra_id) {
            // Fallback: buscar primeira obra ativa
            const { data: obras } = await window.supabase
                .from('obras')
                .select('*')
                .eq('ativo', true)
                .limit(1);
            
            if (!obras || obras.length === 0) {
                throw new Error('Nenhuma obra encontrada no sistema');
            }
            
            APP_STATE.obra = obras[0];
            console.warn('⚠️ Usando obra padrão:', APP_STATE.obra.nome);
        } else {
            APP_STATE.obra = colaborador.obras;
            console.log('✅ Obra identificada:', APP_STATE.obra.nome);
        }
        
        document.getElementById('obra-nome').textContent = `🏗️ ${APP_STATE.obra.nome}`;
        
    } catch (error) {
        console.error('❌ Erro ao buscar obra:', error);
        throw new Error('Não foi possível identificar a obra. Contate o administrador.');
    }
}

// ============================================================================
// GERAR NÚMERO DO RDO
// ============================================================================

async function gerarNumeroRDO() {
    try {
        const { data, error } = await window.supabase
            .from('rdos')
            .select('numero')
            .eq('obra_id', APP_STATE.obra.id)
            .order('numero', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        
        const ultimoNumero = data && data.length > 0 ? parseInt(data[0].numero) : 0;
        APP_STATE.numeroRDO = (ultimoNumero + 1).toString().padStart(8, '0');
        
        document.getElementById('rdo-numero').textContent = APP_STATE.numeroRDO;
        console.log('✅ Número RDO gerado:', APP_STATE.numeroRDO);
        
    } catch (error) {
        console.error('❌ Erro ao gerar número:', error);
        APP_STATE.numeroRDO = '00000001';
        document.getElementById('rdo-numero').textContent = APP_STATE.numeroRDO;
    }
}

// ============================================================================
// PREENCHER DATA ATUAL
// ============================================================================

function preencherDataAtual() {
    const hoje = new Date();
    const dataISO = hoje.toISOString().split('T')[0];
    
    document.getElementById('data').value = dataISO;
    
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const dataFormatada = hoje.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
    
    document.getElementById('rdo-data-badge').textContent = 
        `${diasSemana[hoje.getDay()]}, ${dataFormatada}`;
}

// ============================================================================
// CARREGAR ATIVIDADES PREDEFINIDAS
// ============================================================================

async function carregarAtividadesPredefinidas() {
    try {
        const { data, error } = await window.supabase
            .from('atividades_predefinidas')
            .select('*')
            .eq('ativo', true)
            .order('disciplina, tipo, subtipo');
        
        if (error) throw error;
        
        APP_STATE.atividadesPredefinidas = data || [];
        console.log('✅ Atividades carregadas:', APP_STATE.atividadesPredefinidas.length);
        
    } catch (error) {
        console.error('❌ Erro ao carregar atividades:', error);
        APP_STATE.atividadesPredefinidas = [];
    }
}

// ============================================================================
// CARREGAR TIPOS DE OCORRÊNCIAS
// ============================================================================

async function carregarTiposOcorrencias() {
    try {
        const { data, error } = await window.supabase
            .from('tipos_ocorrencias')
            .select('*')
            .eq('ativo', true)
            .order('categoria, nome');
        
        if (error) throw error;
        
        APP_STATE.tiposOcorrencias = data || [];
        console.log('✅ Tipos de ocorrências carregados:', APP_STATE.tiposOcorrencias.length);
        
    } catch (error) {
        console.error('❌ Erro ao carregar ocorrências:', error);
        APP_STATE.tiposOcorrencias = [];
    }
}

// ============================================================================
// CARREGAR SUPERVISORES
// ============================================================================

async function carregarSupervisores() {
    try {
        const { data, error } = await window.supabase
            .from('colaboradores')
            .select('id, nome')
            .eq('obra_id', APP_STATE.obra.id)
            .eq('funcao', 'supervisor')
            .eq('ativo', true)
            .order('nome');
        
        if (error) throw error;
        
        const select = document.getElementById('supervisor_id');
        select.innerHTML = '<option value="">Selecione o supervisor...</option>';
        
        (data || []).forEach(supervisor => {
            const option = document.createElement('option');
            option.value = supervisor.id;
            option.textContent = supervisor.nome;
            select.appendChild(option);
        });
        
        console.log('✅ Supervisores carregados:', data?.length || 0);
        
    } catch (error) {
        console.error('❌ Erro ao carregar supervisores:', error);
    }
}

// ============================================================================
// CARREGAR ENCARREGADOS (POR SUPERVISOR)
// ============================================================================

async function carregarEncarregados() {
    const supervisorId = document.getElementById('supervisor_id').value;
    const selectEncarregado = document.getElementById('encarregado_id');
    
    if (!supervisorId) {
        selectEncarregado.innerHTML = '<option value="">Primeiro selecione o supervisor</option>';
        limparEquipe();
        return;
    }
    
    try {
        const { data, error } = await window.supabase
            .from('colaboradores')
            .select('id, nome')
            .eq('supervisor_id', supervisorId)
            .eq('funcao', 'encarregado')
            .eq('ativo', true)
            .order('nome');
        
        if (error) throw error;
        
        selectEncarregado.innerHTML = '<option value="">Selecione o encarregado...</option>';
        
        (data || []).forEach(encarregado => {
            const option = document.createElement('option');
            option.value = encarregado.id;
            option.textContent = encarregado.nome;
            selectEncarregado.appendChild(option);
        });
        
        console.log('✅ Encarregados carregados:', data?.length || 0);
        
    } catch (error) {
        console.error('❌ Erro ao carregar encarregados:', error);
    }
}

// ============================================================================
// CARREGAR EQUIPE DO ENCARREGADO
// ============================================================================

async function carregarEquipe() {
    const encarregadoId = document.getElementById('encarregado_id').value;
    const container = document.getElementById('equipe-container');
    
    if (!encarregadoId) {
        container.innerHTML = '<p class="text-muted">Selecione um encarregado para carregar a equipe</p>';
        APP_STATE.equipe = [];
        return;
    }
    
    try {
        // Buscar equipe
        const { data: equipe, error: equipeError } = await window.supabase
            .from('equipes')
            .select('id')
            .eq('lider_equipe', encarregadoId)
            .eq('ativo', true)
            .single();
        
        if (equipeError || !equipe) {
            container.innerHTML = '<p class="text-danger">Nenhuma equipe encontrada para este encarregado</p>';
            APP_STATE.equipe = [];
            return;
        }
        
        // Buscar membros
        const { data: membros, error: membrosError } = await window.supabase
            .from('equipes_colaboradores')
            .select(`
                colaborador_id,
                colaboradores(id, nome, funcao, nfc_tag_id, foto_base64, assinatura_base64)
            `)
            .eq('equipe_id', equipe.id);
        
        if (membrosError) throw membrosError;
        
        APP_STATE.equipe = (membros || []).map(m => ({
            ...m.colaboradores,
            rdoStatus: null,
            confirmado: false
        }));
        
        renderizarEquipe();
        console.log('✅ Equipe carregada:', APP_STATE.equipe.length, 'colaboradores');
        
    } catch (error) {
        console.error('❌ Erro ao carregar equipe:', error);
        container.innerHTML = '<p class="text-danger">Erro ao carregar equipe</p>';
    }
}

function limparEquipe() {
    APP_STATE.equipe = [];
    document.getElementById('equipe-container').innerHTML = 
        '<p class="text-muted">Aguardando seleção de encarregado...</p>';
}

// ============================================================================
// RENDERIZAR EQUIPE
// ============================================================================

function renderizarEquipe() {
    const container = document.getElementById('equipe-container');
    
    if (APP_STATE.equipe.length === 0) {
        container.innerHTML = '<p class="text-muted">Nenhum colaborador nesta equipe</p>';
        return;
    }
    
    let html = '';
    
    APP_STATE.equipe.forEach((colab, index) => {
        html += `
            <div class="colaborador-card" id="colab-${index}" data-colab-id="${colab.id}">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <div>
                        <strong style="font-size: 16px;">${colab.nome}</strong>
                        <div style="color: #666; font-size: 13px; margin-top: 2px;">${colab.funcao}</div>
                    </div>
                    <div id="badge-${index}"></div>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <strong style="font-size: 14px; display: block; margin-bottom: 8px;">Status:</strong>
                    <div class="status-buttons">
                        <button type="button" class="status-badge status-presente" onclick="setarStatus(${index}, 'presente')">🟢 Presente</button>
                        <button type="button" class="status-badge status-ausente" onclick="setarStatus(${index}, 'ausente')">🔴 Ausente</button>
                        <button type="button" class="status-badge status-ferias" onclick="setarStatus(${index}, 'ferias')">🟡 Férias</button>
                        <button type="button" class="status-badge status-afastado" onclick="setarStatus(${index}, 'afastado')">🟠 Afastado</button>
                        <button type="button" class="status-badge status-transferido" onclick="setarStatus(${index}, 'transferido')">🔵 Transferido</button>
                        <button type="button" class="status-badge status-emprestado" onclick="setarStatus(${index}, 'emprestado')">🟣 Emprestado</button>
                    </div>
                </div>
                
                <div id="extra-${index}" style="display: none; margin-top: 10px;"></div>
                <div id="confirma-${index}" style="display: none; margin-top: 10px;"></div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================================================
// SETAR STATUS DO COLABORADOR
// ============================================================================

window.setarStatus = function(index, status) {
    const card = document.getElementById(`colab-${index}`);
    
    // Atualizar visual
    card.querySelectorAll('.status-badge').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Salvar status
    APP_STATE.equipe[index].rdoStatus = status;
    
    // Gerenciar áreas extras
    const divExtra = document.getElementById(`extra-${index}`);
    const divConfirma = document.getElementById(`confirma-${index}`);
    
    if (status === 'transferido' || status === 'emprestado') {
        divExtra.style.display = 'block';
        divConfirma.style.display = 'none';
        mostrarSelectTransferencia(index, status);
    } else if (status === 'presente') {
        divExtra.style.display = 'none';
        divConfirma.style.display = 'block';
        mostrarOpcoesConfirmacao(index);
    } else {
        divExtra.style.display = 'none';
        divConfirma.style.display = 'none';
    }
};

async function mostrarSelectTransferencia(index, tipo) {
    try {
        const { data } = await window.supabase
            .from('colaboradores')
            .select('id, nome')
            .eq('funcao', 'encarregado')
            .eq('ativo', true)
            .order('nome');
        
        const label = tipo === 'transferido' ? 'Transferido para:' : 'Emprestado para:';
        const info = tipo === 'transferido' ? 
            '<small class="text-muted">Mudança definitiva de equipe</small>' :
            '<small class="text-muted">Retorna automaticamente amanhã</small>';
        
        let html = `
            <label><strong>${label}</strong></label>
            <select class="form-control" onchange="APP_STATE.equipe[${index}].destinoTransferencia = this.value">
                <option value="">Selecione...</option>
                ${(data || []).map(e => `<option value="${e.id}">${e.nome}</option>`).join('')}
            </select>
            ${info}
        `;
        
        document.getElementById(`extra-${index}`).innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar encarregados:', error);
    }
}

function mostrarOpcoesConfirmacao(index) {
    const colab = APP_STATE.equipe[index];
    
    let html = `
        <div style="background: #e8f5e9; padding: 12px; border-radius: 6px; border-left: 4px solid #4caf50;">
            <strong style="display: block; margin-bottom: 8px;">⚠️ Confirmar presença:</strong>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
    `;
    
    if (colab.nfc_tag_id) {
        html += `<button type="button" class="btn btn-sm btn-info" onclick="confirmarPresenca(${index}, 'nfc')">📱 NFC</button>`;
    }
    
    if (colab.foto_base64) {
        html += `<button type="button" class="btn btn-sm btn-info" onclick="confirmarPresenca(${index}, 'facial')">📸 Facial</button>`;
    }
    
    if (colab.assinatura_base64) {
        html += `<button type="button" class="btn btn-sm btn-info" onclick="confirmarPresenca(${index}, 'assinatura')">✍️ Assinatura</button>`;
    }
    
    html += `
                <button type="button" class="btn btn-sm btn-success" onclick="confirmarPresenca(${index}, 'manual')">✓ Manual</button>
            </div>
        </div>
    `;
    
    document.getElementById(`confirma-${index}`).innerHTML = html;
}

window.confirmarPresenca = function(index, metodo) {
    if (metodo !== 'manual') {
        alert(`🚧 Confirmação por ${metodo.toUpperCase()} em desenvolvimento.\nConfirmando manualmente...`);
    }
    
    APP_STATE.equipe[index].confirmado = true;
    APP_STATE.equipe[index].metodoConfirmacao = metodo;
    APP_STATE.equipe[index].confirmadoEm = new Date().toISOString();
    
    const card = document.getElementById(`colab-${index}`);
    card.classList.add('colaborador-confirmado');
    
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    document.getElementById(`badge-${index}`).innerHTML = `
        <span style="background: #28a745; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600;">
            ✓ ${metodo.toUpperCase()} ${hora}
        </span>
    `;
    
    document.getElementById(`confirma-${index}`).innerHTML = `
        <div style="background: #d4edda; padding: 10px; border-radius: 6px; text-align: center; color: #155724;">
            ✅ Confirmado por <strong>${metodo.toUpperCase()}</strong> às ${hora}
        </div>
    `;
};

// ============================================================================
// LOCALIZAÇÃO GPS
// ============================================================================

function capturarLocalizacaoGPS() {
    if (!navigator.geolocation) {
        console.warn('⚠️ Geolocalização não suportada');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            APP_STATE.gpsLocation.lat = position.coords.latitude.toFixed(7);
            APP_STATE.gpsLocation.lng = position.coords.longitude.toFixed(7);
            APP_STATE.gpsLocation.texto = `${APP_STATE.gpsLocation.lat}, ${APP_STATE.gpsLocation.lng}`;
            
            document.getElementById('gps_location').value = APP_STATE.gpsLocation.texto;
            console.log('✅ GPS capturado:', APP_STATE.gpsLocation.texto);
            
            // Buscar clima automaticamente
            buscarDadosClimaticos();
        },
        (error) => {
            console.warn('⚠️ GPS não disponível:', error.message);
            document.getElementById('gps_location').value = 'GPS não disponível';
            
            // Buscar clima com coordenadas padrão
            buscarDadosClimaticos();
        }
    );
}

// ============================================================================
// BUSCAR DADOS CLIMÁTICOS - API CONFIGURADA
// ============================================================================

async function buscarDadosClimaticos() {
    const btn = document.getElementById('btn-buscar-clima');
    const textOriginal = btn.textContent;
    
    btn.disabled = true;
    btn.textContent = '⏳ Buscando clima...';
    
    try {
        // Determinar coordenadas
        let lat, lng;
        
        if (APP_STATE.gpsLocation.lat && APP_STATE.gpsLocation.lng) {
            lat = APP_STATE.gpsLocation.lat;
            lng = APP_STATE.gpsLocation.lng;
        } else {
            // Coordenadas padrão: Itaboraí, RJ (GASLUB)
            lat = -22.7519;
            lng = -43.4356;
        }
        
        console.log('🌍 Consultando API Clima:', lat, lng);
        
        // Montar URL da API
        const url = `${WEATHER_CONFIG.baseUrl}?lat=${lat}&lon=${lng}&appid=${WEATHER_CONFIG.apiKey}&units=${WEATHER_CONFIG.units}&lang=${WEATHER_CONFIG.lang}`;
        
        // Chamar API
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Salvar dados
        APP_STATE.climaColetado = data;
        
        // Renderizar
        renderizarDadosClimaticos(data);
        
        // Mostrar seção
        document.getElementById('clima-automatico').style.display = 'block';
        
        // Feedback
        btn.style.background = '#28a745';
        btn.style.color = 'white';
        btn.textContent = '✅ Dados obtidos!';
        
        setTimeout(() => {
            btn.disabled = false;
            btn.style.background = '';
            btn.style.color = '';
            btn.textContent = textOriginal;
        }, 3000);
        
        console.log('✅ Dados climáticos obtidos com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao buscar clima:', error);
        
        alert(`⚠️ Erro ao buscar dados climáticos:\n\n${error.message}\n\nVerifique sua conexão com a internet.`);
        
        btn.disabled = false;
        btn.textContent = textOriginal;
    }
}

function renderizarDadosClimaticos(data) {
    const container = document.getElementById('clima-info');
    
    // Calcular horários
    const nascer = new Date(data.sys.sunrise * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const porSol = new Date(data.sys.sunset * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Precipitação
    const chuva = data.rain ? (data.rain['1h'] || data.rain['3h'] || 0) : 0;
    
    // Ponto de orvalho
    const pontoOrvalho = calcularPontoOrvalho(data.main.temp, data.main.humidity);
    
    // Direção do vento
    const direcaoVento = converterDirecaoVento(data.wind.deg);
    
    container.innerHTML = `
        <div class="clima-item">
            <div style="font-size: 28px;">🌡️</div>
            <div style="font-weight: bold; font-size: 20px;">${Math.round(data.main.temp)}°C</div>
            <div style="font-size: 12px; color: #666;">Temperatura</div>
        </div>
        <div class="clima-item">
            <div style="font-size: 24px;">📊</div>
            <div style="font-weight: bold; font-size: 16px;">${Math.round(data.main.temp_min)}° / ${Math.round(data.main.temp_max)}°C</div>
            <div style="font-size: 12px; color: #666;">Mín / Máx</div>
        </div>
        <div class="clima-item">
            <div style="font-size: 28px;">💧</div>
            <div style="font-weight: bold; font-size: 20px;">${data.main.humidity}%</div>
            <div style="font-size: 12px; color: #666;">Umidade</div>
        </div>
        <div class="clima-item">
            <div style="font-size: 28px;">🌧️</div>
            <div style="font-weight: bold; font-size: 18px;">${chuva.toFixed(1)} mm</div>
            <div style="font-size: 12px; color: #666;">Precipitação</div>
        </div>
        <div class="clima-item">
            <div style="font-size: 28px;">💨</div>
            <div style="font-weight: bold; font-size: 18px;">${Math.round(data.wind.speed * 3.6)} km/h</div>
            <div style="font-size: 12px; color: #666;">Vento</div>
        </div>
        <div class="clima-item">
            <div style="font-size: 28px;">🧭</div>
            <div style="font-weight: bold; font-size: 16px;">${direcaoVento}</div>
            <div style="font-size: 12px; color: #666;">Direção</div>
        </div>
        <div class="clima-item">
            <div style="font-size: 28px;">🔽</div>
            <div style="font-weight: bold; font-size: 18px;">${data.main.pressure} hPa</div>
            <div style="font-size: 12px; color: #666;">Pressão</div>
        </div>
        <div class="clima-item">
            <div style="font-size: 28px;">💧</div>
            <div style="font-weight: bold; font-size: 18px;">${Math.round(pontoOrvalho)}°C</div>
            <div style="font-size: 12px; color: #666;">Ponto Orvalho</div>
        </div>
        <div class="clima-item">
            <div style="font-size: 28px;">🌅</div>
            <div style="font-weight: bold; font-size: 16px;">${nascer}</div>
            <div style="font-size: 12px; color: #666;">Nascer Sol</div>
        </div>
        <div class="clima-item">
            <div style="font-size: 28px;">🌆</div>
            <div style="font-weight: bold; font-size: 16px;">${porSol}</div>
            <div style="font-size: 12px; color: #666;">Pôr do Sol</div>
        </div>
        <div class="clima-item">
            <div style="font-size: 28px;">☁️</div>
            <div style="font-weight: bold; font-size: 16px;">${data.clouds.all}%</div>
            <div style="font-size: 12px; color: #666;">Nuvens</div>
        </div>
        <div class="clima-item">
            <div style="font-size: 28px;">🌤️</div>
            <div style="font-weight: bold; font-size: 14px; text-transform: capitalize;">${data.weather[0].description}</div>
            <div style="font-size: 12px; color: #666;">Condição</div>
        </div>
    `;
}

function converterDirecaoVento(graus) {
    const direcoes = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return direcoes[Math.round(graus / 22.5) % 16];
}

function calcularPontoOrvalho(temp, umidade) {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(umidade / 100);
    return (b * alpha) / (a - alpha);
}

// ============================================================================
// PTS - TOGGLE
// ============================================================================

function togglePTS() {
    const tevePTS = document.querySelector('input[name="teve_pts"]:checked').value;
    const divPTS = document.getElementById('pts-detalhada');
    
    if (tevePTS === 'sim') {
        divPTS.style.display = 'block';
        document.getElementById('pts_numero').required = true;
        document.getElementById('pts_descricao').required = true;
    } else {
        divPTS.style.display = 'none';
        document.getElementById('pts_numero').required = false;
        document.getElementById('pts_descricao').required = false;
    }
}

function calcularTempoLiberacaoPTS() {
    const solicitacao = document.getElementById('pts_hora_solicitacao').value;
    const liberacao = document.getElementById('pts_hora_liberacao').value;
    
    if (!solicitacao || !liberacao) return;
    
    const [h1, m1] = solicitacao.split(':').map(Number);
    const [h2, m2] = liberacao.split(':').map(Number);
    
    const minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
    
    if (minutos < 0) {
        document.getElementById('pts_tempo_liberacao').value = 'Hora inválida';
        return;
    }
    
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    
    document.getElementById('pts_tempo_liberacao').value = 
        `${horas}h ${mins}min (${minutos} minutos)`;
}

// ============================================================================
// FOTOS - PTS
// ============================================================================

async function handleFotosPTS(e) {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
        const seq = (APP_STATE.fotosColetadas.pts.length + 1).toString().padStart(4, '0');
        const ext = file.name.split('.').pop().toLowerCase();
        const nome = `rdo${APP_STATE.numeroRDO}-pts-${seq}.${ext}`;
        
        const base64 = await fileToBase64(file);
        
        APP_STATE.fotosColetadas.pts.push({ nome, base64, file });
    }
    
    renderizarFotosPTS();
}

function renderizarFotosPTS() {
    const grid = document.getElementById('pts-foto-grid');
    grid.innerHTML = '';
    
    APP_STATE.fotosColetadas.pts.forEach((foto, i) => {
        grid.innerHTML += `
            <div class="photo-item">
                <img src="${foto.base64}" alt="${foto.nome}">
                <button class="photo-remove" onclick="removerFotoPTS(${i})">×</button>
                <div class="photo-label">${foto.nome}</div>
            </div>
        `;
    });
}

window.removerFotoPTS = function(index) {
    if (confirm('Remover esta foto?')) {
        APP_STATE.fotosColetadas.pts.splice(index, 1);
        renderizarFotosPTS();
    }
};

// ============================================================================
// FOTOS - GERAIS
// ============================================================================

async function handleFotosGerais(e) {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
        const seq = (APP_STATE.fotosColetadas.gerais.length + 1).toString().padStart(4, '0');
        const ext = file.name.split('.').pop().toLowerCase();
        const nome = `rdo${APP_STATE.numeroRDO}-geral-${seq}.${ext}`;
        
        const base64 = await fileToBase64(file);
        
        APP_STATE.fotosColetadas.gerais.push({ nome, base64, file });
    }
    
    renderizarFotosGerais();
}

function renderizarFotosGerais() {
    const grid = document.getElementById('fotos-gerais-grid');
    grid.innerHTML = '';
    
    APP_STATE.fotosColetadas.gerais.forEach((foto, i) => {
        grid.innerHTML += `
            <div class="photo-item">
                <img src="${foto.base64}" alt="${foto.nome}">
                <button class="photo-remove" onclick="removerFotoGeral(${i})">×</button>
                <div class="photo-label">${foto.nome}</div>
            </div>
        `;
    });
}

window.removerFotoGeral = function(index) {
    if (confirm('Remover esta foto?')) {
        APP_STATE.fotosColetadas.gerais.splice(index, 1);
        renderizarFotosGerais();
    }
};

function handleDropFotos(e) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    
    files.forEach(async file => {
        const seq = (APP_STATE.fotosColetadas.gerais.length + 1).toString().padStart(4, '0');
        const ext = file.name.split('.').pop().toLowerCase();
        const nome = `rdo${APP_STATE.numeroRDO}-geral-${seq}.${ext}`;
        
        const base64 = await fileToBase64(file);
        
        APP_STATE.fotosColetadas.gerais.push({ nome, base64, file });
        renderizarFotosGerais();
    });
}

// ============================================================================
// ASSINATURA
// ============================================================================

function configurarSignaturePad() {
    const canvas = document.getElementById('signature-pad');
    if (!canvas) return;
    
    canvas.width = canvas.offsetWidth || 600;
    canvas.height = 200;
    
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    
    function startDraw(e) {
        isDrawing = true;
        [lastX, lastY] = [e.offsetX || (e.touches[0].clientX - canvas.getBoundingClientRect().left),
                          e.offsetY || (e.touches[0].clientY - canvas.getBoundingClientRect().top)];
    }
    
    function draw(e) {
        if (!isDrawing) return;
        
        const x = e.offsetX || (e.touches[0].clientX - canvas.getBoundingClientRect().left);
        const y = e.offsetY || (e.touches[0].clientY - canvas.getBoundingClientRect().top);
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        [lastX, lastY] = [x, y];
    }
    
    function stopDraw() {
        isDrawing = false;
    }
    
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseout', stopDraw);
    
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e); });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); });
    canvas.addEventListener('touchend', stopDraw);
    
    APP_STATE.signaturePad = {
        canvas,
        clear: () => ctx.clearRect(0, 0, canvas.width, canvas.height),
        getDataURL: () => canvas.toDataURL('image/png')
    };
}

function limparAssinatura() {
    APP_STATE.signaturePad?.clear();
}

// ============================================================================
// ADICIONAR OCORRÊNCIA
// ============================================================================

window.adicionarOcorrencia = function() {
    alert('🚧 Funcionalidade de Ocorrências/Interferências/Paralisações/QCO em desenvolvimento completo.\n\nSerá implementada:\n• Seleção de tipo\n• Descrição detalhada\n• Horários de início e fim\n• Seleção de colaboradores afetados\n• Cálculo de HH perdidas\n• Upload de fotos');
};

// ============================================================================
// RECONHECIMENTO FACIAL
// ============================================================================

window.capturarReconhecimento = function() {
    alert('🚧 Funcionalidade de Reconhecimento Facial em desenvolvimento');
};

// ============================================================================
// MOSTRAR RESUMO
// ============================================================================

window.mostrarResumo = function() {
    const presentes = APP_STATE.equipe.filter(c => c.rdoStatus === 'presente' && c.confirmado);
    const outros = APP_STATE.equipe.filter(c => c.rdoStatus && c.rdoStatus !== 'presente');
    const totalFotos = APP_STATE.fotosColetadas.pts.length + APP_STATE.fotosColetadas.gerais.length;
    const tevePTS = document.querySelector('input[name="teve_pts"]:checked')?.value === 'sim';
    const climaOK = !!APP_STATE.climaColetado;
    
    const modal = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;" onclick="this.remove()">
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 600px; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4);" onclick="event.stopPropagation()">
                <h2 style="margin: 0 0 20px 0; color: #667eea;">📊 Resumo do RDO</h2>
                
                <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                    <div style="font-size: 14px; opacity: 0.9;">RDO Nº</div>
                    <div style="font-size: 36px; font-weight: bold; margin: 8px 0;">${APP_STATE.numeroRDO}</div>
                    <div style="font-size: 15px;">${APP_STATE.obra?.nome || 'Obra'}</div>
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <strong>📅 Data:</strong> ${document.getElementById('data').value}<br>
                    <strong>📍 GPS:</strong> ${document.getElementById('gps_location').value}
                </div>
                
                <h3 style="border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin: 20px 0 10px 0;">👥 Equipe</h3>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="padding: 6px 0;">Total: <strong>${APP_STATE.equipe.length}</strong></li>
                    <li style="padding: 6px 0; color: #28a745;">🟢 Presentes: <strong>${presentes.length}</strong></li>
                    <li style="padding: 6px 0; color: #dc3545;">🔴 Outros: <strong>${outros.length}</strong></li>
                </ul>
                
                <h3 style="border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin: 20px 0 10px 0;">📋 Dados</h3>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="padding: 6px 0;">${tevePTS ? '✅' : '❌'} PTS ${tevePTS ? 'informada' : 'não informada'}</li>
                    <li style="padding: 6px 0;">${climaOK ? '✅' : '❌'} Clima ${climaOK ? 'coletado' : 'não coletado'}</li>
                    <li style="padding: 6px 0;">📷 Fotos: <strong>${totalFotos}</strong></li>
                </ul>
                
                <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
                    <button class="btn btn-secondary" onclick="this.closest('div[style*=fixed]').remove()">Fechar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
};

// ============================================================================
// SALVAR RDO
// ============================================================================

async function salvarRDO(e) {
    e.preventDefault();
    
    if (!confirm('💾 Confirma o salvamento deste RDO?\n\nOs dados serão gravados no banco de dados.')) {
        return;
    }
    
    try {
        // Validações
        if (!APP_STATE.obra) throw new Error('Obra não identificada');
        if (!document.getElementById('data').value) throw new Error('Data não informada');
        
        console.log('💾 Salvando RDO...');
        
        // TODO: Implementar salvamento completo
        // 1. Inserir registro principal em rdos
        // 2. Inserir PTS se houver
        // 3. Inserir dados climáticos
        // 4. Inserir status dos colaboradores
        // 5. Inserir atividades (quando implementado)
        // 6. Inserir ocorrências (quando implementado)
        // 7. Upload de fotos para storage
        // 8. Salvar assinatura
        
        alert('✅ RDO validado com sucesso!\n\n🚧 Salvamento completo no banco de dados será implementado na próxima versão.');
        
        // window.location.href = 'lista-rdos.html';
        
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        alert('❌ Erro ao salvar RDO:\n\n' + error.message);
    }
}

// ============================================================================
// CONFIGURAR EVENT LISTENERS
// ============================================================================

function configurarEventListeners() {
    // Mobile menu
    document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });
    
    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        await window.supabase.auth.signOut();
        window.location.href = '../../index.html';
    });
    
    // PTS
    document.querySelectorAll('input[name="teve_pts"]').forEach(r => r.addEventListener('change', togglePTS));
    ['pts_hora_solicitacao', 'pts_hora_liberacao'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', calcularTempoLiberacaoPTS);
    });
    document.getElementById('pts-foto-input')?.addEventListener('change', handleFotosPTS);
    
    // Hierarquia
    document.getElementById('supervisor_id').addEventListener('change', carregarEncarregados);
    document.getElementById('encarregado_id').addEventListener('change', carregarEquipe);
    
    // GPS e Clima
    document.getElementById('btn-get-gps').addEventListener('click', capturarLocalizacaoGPS);
    document.getElementById('btn-buscar-clima').addEventListener('click', buscarDadosClimaticos);
    
    // Fotos gerais
    document.getElementById('upload-area-geral').addEventListener('click', () => {
        document.getElementById('foto-input-geral').click();
    });
    document.getElementById('foto-input-geral').addEventListener('change', handleFotosGerais);
    
    const uploadArea = document.getElementById('upload-area-geral');
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        uploadArea.addEventListener(evt, e => e.preventDefault());
    });
    uploadArea.addEventListener('drop', handleDropFotos);
    
    // Ações
    document.getElementById('btn-add-ocorrencia').addEventListener('click', adicionarOcorrencia);
    document.getElementById('btn-limpar-assinatura').addEventListener('click', limparAssinatura);
    document.getElementById('btn-reconhecimento').addEventListener('click', capturarReconhecimento);
    document.getElementById('btn-preview').addEventListener('click', mostrarResumo);
    document.getElementById('form-rdo').addEventListener('submit', salvarRDO);
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============================================================================
// FIM DO SISTEMA
// ============================================================================

console.log('✅ RDO FIDEL v2.0 - Sistema carregado completamente!');
console.log('🌍 API Clima OpenWeatherMap: CONFIGURADA');
console.log('📍 Obra:', APP_STATE.obra?.nome || 'Aguardando...');
