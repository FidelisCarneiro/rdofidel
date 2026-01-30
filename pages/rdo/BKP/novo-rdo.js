/* ============================================================================
   NOVO-RDO.JS - Formulário de Novo RDO
   ============================================================================ */

// Variáveis globais
let obras = [];
let colaboradores = [];
let atividades = [];
let equipamentos = [];

// Arrays para armazenar itens adicionados
let colaboradoresRDO = [];
let atividadesRDO = [];
let equipamentosRDO = [];

// Verificar autenticação e carregar dados
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📝 Formulário de RDO carregando...');
    
    // Verificar autenticação
    const session = await AUTH.checkAuth();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }
    
    // Configurar event listeners
    setupEventListeners();
    
    // Carregar dados
    await loadInitialData();
    
    // Definir data atual
    document.getElementById('rdo-data').valueAsDate = new Date();
    updateDiaSemana();
    
    console.log('✅ Formulário de RDO carregado!');
});

/* ============================================================================
   CARREGAR DADOS INICIAIS
   ============================================================================ */
async function loadInitialData() {
    try {
        UTILS.showLoading();
        
        // Carregar obras
        obras = await DB.getObras(true);
        const selectObra = document.getElementById('rdo-obra');
        obras.forEach(obra => {
            const option = document.createElement('option');
            option.value = obra.id;
            option.textContent = obra.nome;
            selectObra.appendChild(option);
        });
        
        // Carregar colaboradores
        colaboradores = await DB.getColaboradores(true);
        const selectColaborador = document.getElementById('select-colaborador');
        colaboradores.forEach(colab => {
            const option = document.createElement('option');
            option.value = colab.id;
            option.textContent = `${colab.nome} - ${colab.funcao}`;
            selectColaborador.appendChild(option);
        });
        
        // Carregar equipamentos
        equipamentos = await DB.fetchData('equipamentos', { ativo: true });
        const selectEquipamento = document.getElementById('select-equipamento');
        equipamentos.forEach(equip => {
            const option = document.createElement('option');
            option.value = equip.id;
            option.textContent = equip.nome;
            selectEquipamento.appendChild(option);
        });
        
        console.log('✅ Dados carregados:', {
            obras: obras.length,
            colaboradores: colaboradores.length,
            equipamentos: equipamentos.length
        });
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        UTILS.showError('Erro ao carregar dados iniciais');
    } finally {
        UTILS.hideLoading();
    }
}

/* ============================================================================
   EVENT LISTENERS
   ============================================================================ */
function setupEventListeners() {
    // Logout
    document.getElementById('btn-logout').addEventListener('click', async () => {
        if (confirm('Deseja realmente sair?')) {
            await AUTH.logout();
        }
    });
    
    // Menu mobile
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }
    
    // Obra selecionada - carregar atividades
    document.getElementById('rdo-obra').addEventListener('change', async (e) => {
        const obraId = e.target.value;
        if (obraId) {
            await loadAtividades(obraId);
        }
    });
    
    // Data alterada - atualizar dia da semana
    document.getElementById('rdo-data').addEventListener('change', () => {
        updateDiaSemana();
    });
    
    // PTS - mostrar/ocultar campo número
    document.getElementById('rdo-teve-pts').addEventListener('change', (e) => {
        const grupoPTS = document.getElementById('grupo-pts');
        grupoPTS.style.display = e.target.value === 'true' ? 'block' : 'none';
    });
    
    // Botões adicionar
    document.getElementById('btn-adicionar-colaborador').addEventListener('click', () => {
        abrirModalColaborador();
    });
    
    document.getElementById('btn-adicionar-atividade').addEventListener('click', () => {
        abrirModalAtividade();
    });
    
    document.getElementById('btn-adicionar-equipamento').addEventListener('click', () => {
        abrirModalEquipamento();
    });
    
    // Modais - Colaborador
    document.getElementById('btn-close-colaborador').addEventListener('click', () => {
        fecharModal('modal-colaborador');
    });
    
    document.getElementById('btn-cancel-colaborador').addEventListener('click', () => {
        fecharModal('modal-colaborador');
    });
    
    document.getElementById('btn-confirmar-colaborador').addEventListener('click', () => {
        adicionarColaborador();
    });
    
    // Modais - Atividade
    document.getElementById('btn-close-atividade').addEventListener('click', () => {
        fecharModal('modal-atividade');
    });
    
    document.getElementById('btn-cancel-atividade').addEventListener('click', () => {
        fecharModal('modal-atividade');
    });
    
    document.getElementById('btn-confirmar-atividade').addEventListener('click', () => {
        adicionarAtividade();
    });
    
    // Modais - Equipamento
    document.getElementById('btn-close-equipamento').addEventListener('click', () => {
        fecharModal('modal-equipamento');
    });
    
    document.getElementById('btn-cancel-equipamento').addEventListener('click', () => {
        fecharModal('modal-equipamento');
    });
    
    document.getElementById('btn-confirmar-equipamento').addEventListener('click', () => {
        adicionarEquipamento();
    });
    
    // Submit form
    document.getElementById('form-rdo').addEventListener('submit', async (e) => {
        e.preventDefault();
        await salvarRDO();
    });
    
    document.getElementById('btn-salvar-rdo').addEventListener('click', async (e) => {
        e.preventDefault();
        await salvarRDO();
    });
}

/* ============================================================================
   CARREGAR ATIVIDADES DA OBRA
   ============================================================================ */
async function loadAtividades(obraId) {
    try {
        atividades = await DB.getAtividadesByObra(obraId);
        
        const selectAtividade = document.getElementById('select-atividade');
        selectAtividade.innerHTML = '<option value="">Selecione...</option>';
        
        atividades.forEach(ativ => {
            const option = document.createElement('option');
            option.value = ativ.id;
            option.textContent = ativ.nome;
            selectAtividade.appendChild(option);
        });
        
        console.log(`✅ ${atividades.length} atividades carregadas para a obra`);
        
    } catch (error) {
        console.error('Erro ao carregar atividades:', error);
    }
}

/* ============================================================================
   ATUALIZAR DIA DA SEMANA
   ============================================================================ */
function updateDiaSemana() {
    const dataInput = document.getElementById('rdo-data');
    const diaSemanaInput = document.getElementById('rdo-dia-semana');
    
    if (dataInput.value) {
        const data = new Date(dataInput.value + 'T00:00:00');
        const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        diaSemanaInput.value = dias[data.getDay()];
    }
}

/* ============================================================================
   MODAIS
   ============================================================================ */
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

function abrirModalColaborador() {
    abrirModal('modal-colaborador');
}

function abrirModalAtividade() {
    if (!atividades || atividades.length === 0) {
        UTILS.showWarning('Selecione uma obra primeiro para carregar as atividades');
        return;
    }
    abrirModal('modal-atividade');
}

function abrirModalEquipamento() {
    abrirModal('modal-equipamento');
}

/* ============================================================================
   ADICIONAR COLABORADOR
   ============================================================================ */
function adicionarColaborador() {
    const colaboradorId = document.getElementById('select-colaborador').value;
    const horas = parseFloat(document.getElementById('colaborador-horas').value);
    const status = document.getElementById('colaborador-status').value;
    
    if (!colaboradorId) {
        UTILS.showWarning('Selecione um colaborador');
        return;
    }
    
    // Verificar se já foi adicionado
    if (colaboradoresRDO.find(c => c.colaborador_id === colaboradorId)) {
        UTILS.showWarning('Este colaborador já foi adicionado');
        return;
    }
    
    const colaborador = colaboradores.find(c => c.id === colaboradorId);
    
    colaboradoresRDO.push({
        colaborador_id: colaboradorId,
        nome: colaborador.nome,
        funcao: colaborador.funcao,
        horas_trabalhadas: horas,
        status: status
    });
    
    renderColaboradores();
    fecharModal('modal-colaborador');
    
    // Resetar form
    document.getElementById('select-colaborador').value = '';
    document.getElementById('colaborador-horas').value = '8';
    document.getElementById('colaborador-status').value = 'presente';
}

function renderColaboradores() {
    const lista = document.getElementById('lista-colaboradores');
    
    if (colaboradoresRDO.length === 0) {
        lista.innerHTML = '<p class="text-muted">Nenhum colaborador adicionado</p>';
        document.getElementById('total-hh').textContent = '0';
        return;
    }
    
    let html = '<div class="table-responsive"><table class="table"><thead><tr><th>Nome</th><th>Função</th><th>Horas</th><th>Status</th><th>Ações</th></tr></thead><tbody>';
    
    let totalHH = 0;
    
    colaboradoresRDO.forEach((colab, index) => {
        totalHH += colab.horas_trabalhadas;
        
        const statusBadge = getStatusBadge(colab.status);
        
        html += `
            <tr>
                <td>${colab.nome}</td>
                <td>${colab.funcao}</td>
                <td>${colab.horas_trabalhadas}h</td>
                <td>${statusBadge}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-danger" onclick="removerColaborador(${index})">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    lista.innerHTML = html;
    
    document.getElementById('total-hh').textContent = totalHH.toFixed(1);
}

function getStatusBadge(status) {
    const badges = {
        'presente': '<span class="badge badge-success">Presente</span>',
        'falta': '<span class="badge badge-danger">Falta</span>',
        'atrasado': '<span class="badge badge-warning">Atrasado</span>',
        'doente': '<span class="badge badge-info">Doente</span>'
    };
    return badges[status] || status;
}

function removerColaborador(index) {
    colaboradoresRDO.splice(index, 1);
    renderColaboradores();
}

/* ============================================================================
   ADICIONAR ATIVIDADE
   ============================================================================ */
function adicionarAtividade() {
    const atividadeId = document.getElementById('select-atividade').value;
    const status = document.getElementById('atividade-status').value;
    const percentual = parseFloat(document.getElementById('atividade-percentual').value) || 0;
    const observacoes = document.getElementById('atividade-obs').value.trim();
    
    if (!atividadeId) {
        UTILS.showWarning('Selecione uma atividade');
        return;
    }
    
    // Verificar se já foi adicionada
    if (atividadesRDO.find(a => a.atividade_id === atividadeId)) {
        UTILS.showWarning('Esta atividade já foi adicionada');
        return;
    }
    
    const atividade = atividades.find(a => a.id === atividadeId);
    
    atividadesRDO.push({
        atividade_id: atividadeId,
        nome: atividade.nome,
        status: status,
        percentual_conclusao: percentual,
        observacoes: observacoes
    });
    
    renderAtividades();
    fecharModal('modal-atividade');
    
    // Resetar form
    document.getElementById('select-atividade').value = '';
    document.getElementById('atividade-status').value = 'planejada';
    document.getElementById('atividade-percentual').value = '0';
    document.getElementById('atividade-obs').value = '';
}

function renderAtividades() {
    const lista = document.getElementById('lista-atividades');
    
    if (atividadesRDO.length === 0) {
        lista.innerHTML = '<p class="text-muted">Nenhuma atividade adicionada</p>';
        return;
    }
    
    let html = '<div class="table-responsive"><table class="table"><thead><tr><th>Atividade</th><th>Status</th><th>% Conclusão</th><th>Observações</th><th>Ações</th></tr></thead><tbody>';
    
    atividadesRDO.forEach((ativ, index) => {
        const statusBadge = getAtividadeStatusBadge(ativ.status);
        
        html += `
            <tr>
                <td>${ativ.nome}</td>
                <td>${statusBadge}</td>
                <td>${ativ.percentual_conclusao}%</td>
                <td>${ativ.observacoes || '-'}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-danger" onclick="removerAtividade(${index})">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    lista.innerHTML = html;
}

function getAtividadeStatusBadge(status) {
    const badges = {
        'planejada': '<span class="badge badge-secondary">Planejada</span>',
        'em_execucao': '<span class="badge badge-warning">Em Execução</span>',
        'concluida': '<span class="badge badge-success">Concluída</span>',
        'paralisada': '<span class="badge badge-danger">Paralisada</span>'
    };
    return badges[status] || status;
}

function removerAtividade(index) {
    atividadesRDO.splice(index, 1);
    renderAtividades();
}

/* ============================================================================
   ADICIONAR EQUIPAMENTO
   ============================================================================ */
function adicionarEquipamento() {
    const equipamentoId = document.getElementById('select-equipamento').value;
    const horas = parseFloat(document.getElementById('equipamento-horas').value);
    const horimetroInicial = parseFloat(document.getElementById('equipamento-horimetro-inicial').value) || null;
    const horimetroFinal = parseFloat(document.getElementById('equipamento-horimetro-final').value) || null;
    
    if (!equipamentoId) {
        UTILS.showWarning('Selecione um equipamento');
        return;
    }
    
    // Verificar se já foi adicionado
    if (equipamentosRDO.find(e => e.equipamento_id === equipamentoId)) {
        UTILS.showWarning('Este equipamento já foi adicionado');
        return;
    }
    
    const equipamento = equipamentos.find(e => e.id === equipamentoId);
    
    equipamentosRDO.push({
        equipamento_id: equipamentoId,
        nome: equipamento.nome,
        horas_trabalhadas: horas,
        horimetro_inicial: horimetroInicial,
        horimetro_final: horimetroFinal
    });
    
    renderEquipamentos();
    fecharModal('modal-equipamento');
    
    // Resetar form
    document.getElementById('select-equipamento').value = '';
    document.getElementById('equipamento-horas').value = '8';
    document.getElementById('equipamento-horimetro-inicial').value = '';
    document.getElementById('equipamento-horimetro-final').value = '';
}

function renderEquipamentos() {
    const lista = document.getElementById('lista-equipamentos');
    
    if (equipamentosRDO.length === 0) {
        lista.innerHTML = '<p class="text-muted">Nenhum equipamento adicionado</p>';
        return;
    }
    
    let html = '<div class="table-responsive"><table class="table"><thead><tr><th>Equipamento</th><th>Horas</th><th>Horímetro Inicial</th><th>Horímetro Final</th><th>Ações</th></tr></thead><tbody>';
    
    equipamentosRDO.forEach((equip, index) => {
        html += `
            <tr>
                <td>${equip.nome}</td>
                <td>${equip.horas_trabalhadas}h</td>
                <td>${equip.horimetro_inicial !== null ? equip.horimetro_inicial.toFixed(1) : '-'}</td>
                <td>${equip.horimetro_final !== null ? equip.horimetro_final.toFixed(1) : '-'}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-danger" onclick="removerEquipamento(${index})">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    lista.innerHTML = html;
}

function removerEquipamento(index) {
    equipamentosRDO.splice(index, 1);
    renderEquipamentos();
}

/* ============================================================================
   SALVAR RDO
   ============================================================================ */
async function salvarRDO() {
    try {
        // Validar campos obrigatórios
        const obraId = document.getElementById('rdo-obra').value;
        const data = document.getElementById('rdo-data').value;
        
        if (!obraId || !data) {
            UTILS.showError('Preencha todos os campos obrigatórios (Obra e Data)');
            return;
        }
        
        UTILS.showLoading();
        
        // Dados principais do RDO
        const rdoData = {
            obra_id: obraId,
            data: data,
            hora_chegada_campo: document.getElementById('rdo-hora-chegada').value || null,
            hora_inicio_trabalho: document.getElementById('rdo-hora-inicio').value || null,
            teve_pts: document.getElementById('rdo-teve-pts').value === 'true',
            numero_pts: document.getElementById('rdo-numero-pts').value || null,
            anotacoes_observacoes: document.getElementById('rdo-observacoes').value.trim() || null
        };
        
        // Inserir RDO principal
        const rdoInserido = await DB.insertData('rdos', rdoData);
        const rdoId = rdoInserido[0].id;
        
        console.log('✅ RDO criado com ID:', rdoId);
        
        // Salvar clima
        await salvarClima(rdoId);
        
        // Salvar colaboradores
        await salvarColaboradores(rdoId);
        
        // Salvar atividades
        await salvarAtividades(rdoId);
        
        // Salvar equipamentos
        await salvarEquipamentos(rdoId);
        
        UTILS.showSuccess('RDO salvo com sucesso!');
        
        // Redirecionar após 2 segundos
        setTimeout(() => {
            window.location.href = 'lista-rdos.html';
        }, 2000);
        
    } catch (error) {
        console.error('Erro ao salvar RDO:', error);
        UTILS.showError('Erro ao salvar RDO: ' + error.message);
    } finally {
        UTILS.hideLoading();
    }
}

async function salvarClima(rdoId) {
    try {
        // Clima manhã
        const climaManha = {
            rdo_id: rdoId,
            turno: 'manha',
            temperatura: parseFloat(document.getElementById('clima-manha-temperatura').value) || null,
            umidade: parseFloat(document.getElementById('clima-manha-umidade').value) || null,
            condicao_geral: document.getElementById('clima-manha-condicao').value || null,
            fonte: 'manual'
        };
        
        if (climaManha.temperatura || climaManha.umidade || climaManha.condicao_geral) {
            await DB.insertData('rdo_clima', climaManha);
        }
        
        // Clima tarde
        const climaTarde = {
            rdo_id: rdoId,
            turno: 'tarde',
            temperatura: parseFloat(document.getElementById('clima-tarde-temperatura').value) || null,
            umidade: parseFloat(document.getElementById('clima-tarde-umidade').value) || null,
            condicao_geral: document.getElementById('clima-tarde-condicao').value || null,
            fonte: 'manual'
        };
        
        if (climaTarde.temperatura || climaTarde.umidade || climaTarde.condicao_geral) {
            await DB.insertData('rdo_clima', climaTarde);
        }
        
    } catch (error) {
        console.error('Erro ao salvar clima:', error);
        throw error;
    }
}

async function salvarColaboradores(rdoId) {
    try {
        for (const colab of colaboradoresRDO) {
            await DB.insertData('rdo_colaboradores', {
                rdo_id: rdoId,
                colaborador_id: colab.colaborador_id,
                status: colab.status,
                horas_trabalhadas: colab.horas_trabalhadas
            });
        }
    } catch (error) {
        console.error('Erro ao salvar colaboradores:', error);
        throw error;
    }
}

async function salvarAtividades(rdoId) {
    try {
        for (const ativ of atividadesRDO) {
            await DB.insertData('rdo_atividades', {
                rdo_id: rdoId,
                atividade_id: ativ.atividade_id,
                status: ativ.status,
                percentual_conclusao: ativ.percentual_conclusao,
                observacoes: ativ.observacoes
            });
        }
    } catch (error) {
        console.error('Erro ao salvar atividades:', error);
        throw error;
    }
}

async function salvarEquipamentos(rdoId) {
    try {
        for (const equip of equipamentosRDO) {
            await DB.insertData('rdo_equipamentos', {
                rdo_id: rdoId,
                equipamento_id: equip.equipamento_id,
                horas_trabalhadas: equip.horas_trabalhadas,
                horimetro_inicial: equip.horimetro_inicial,
                horimetro_final: equip.horimetro_final
            });
        }
    } catch (error) {
        console.error('Erro ao salvar equipamentos:', error);
        throw error;
    }
}

// Exportar funções globais
window.removerColaborador = removerColaborador;
window.removerAtividade = removerAtividade;
window.removerEquipamento = removerEquipamento;

console.log('✅ Novo-RDO.js carregado');
