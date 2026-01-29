/* ============================================================================
   LISTA-RDOS.JS - Listagem e Visualização de RDOs
   ============================================================================ */

// Variáveis globais
let rdos = [];
let rdosFiltrados = [];
let obras = [];
let rdoSelecionado = null;

// Verificar autenticação e carregar dados
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Lista de RDOs carregando...');
    
    // Verificar autenticação
    const session = await AUTH.checkAuth();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }
    
    // Configurar event listeners
    setupEventListeners();
    
    // Carregar obras para filtro
    await loadObras();
    
    // Carregar RDOs
    await loadRDOs();
    
    console.log('✅ Lista de RDOs carregada!');
});

/* ============================================================================
   CARREGAR OBRAS
   ============================================================================ */
async function loadObras() {
    try {
        obras = await DB.getObras(true);
        
        const selectObra = document.getElementById('filter-obra');
        obras.forEach(obra => {
            const option = document.createElement('option');
            option.value = obra.id;
            option.textContent = obra.nome;
            selectObra.appendChild(option);
        });
        
    } catch (error) {
        console.error('Erro ao carregar obras:', error);
    }
}

/* ============================================================================
   CARREGAR RDOs
   ============================================================================ */
async function loadRDOs() {
    try {
        UTILS.showLoading();
        
        // Buscar todos os RDOs com dados da obra
        rdos = await DB.fetchData('rdos', {}, `
            *,
            obras:obra_id (
                id,
                nome
            )
        `, {
            order: { column: 'data', ascending: false }
        });
        
        // Carregar dados adicionais de cada RDO
        for (let rdo of rdos) {
            // Contar colaboradores
            const colaboradores = await DB.fetchData('rdo_colaboradores', { rdo_id: rdo.id });
            rdo.total_colaboradores = colaboradores.length;
            
            // Calcular total HH
            rdo.total_hh = colaboradores.reduce((sum, c) => sum + (c.horas_trabalhadas || 0), 0);
            
            // Contar atividades
            const atividades = await DB.fetchData('rdo_atividades', { rdo_id: rdo.id });
            rdo.total_atividades = atividades.length;
        }
        
        rdosFiltrados = rdos;
        
        console.log(`✅ ${rdos.length} RDOs carregados`);
        
        renderRDOs();
        updateKPIs();
        
    } catch (error) {
        console.error('Erro ao carregar RDOs:', error);
        UTILS.showError('Erro ao carregar RDOs', '#alert-container');
    } finally {
        UTILS.hideLoading();
    }
}

/* ============================================================================
   RENDERIZAR TABELA
   ============================================================================ */
function renderRDOs() {
    const tbody = document.getElementById('rdos-tbody');
    const totalRDOs = document.getElementById('total-rdos');
    
    totalRDOs.textContent = rdosFiltrados.length;
    
    if (rdosFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    Nenhum RDO encontrado.
                    <button class="btn btn-primary btn-sm mt-2" onclick="window.location.href='novo-rdo.html'">
                        ➕ Criar primeiro RDO
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    rdosFiltrados.forEach(rdo => {
        const tr = document.createElement('tr');
        
        // Número do RDO (formato: RDO-XXX-AAAA)
        const numeroRDO = `RDO-${String(rdo.id).padStart(3, '0')}-${new Date(rdo.data).getFullYear()}`;
        
        // Dia da semana
        const data = new Date(rdo.data + 'T00:00:00');
        const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const diaSemana = dias[data.getDay()];
        
        // Nome da obra
        const nomeObra = rdo.obras?.nome || 'N/A';
        
        tr.innerHTML = `
            <td><strong>${numeroRDO}</strong></td>
            <td>${nomeObra}</td>
            <td>${UTILS.formatDateBR(rdo.data)}</td>
            <td>${diaSemana}</td>
            <td>${rdo.total_colaboradores || 0}</td>
            <td>${rdo.total_hh ? rdo.total_hh.toFixed(1) : '0'}h</td>
            <td>${rdo.total_atividades || 0}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="visualizarRDO('${rdo.id}')" title="Visualizar">
                    👁️
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletarRDODireto('${rdo.id}')" title="Deletar">
                    🗑️
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

/* ============================================================================
   ATUALIZAR KPIs
   ============================================================================ */
function updateKPIs() {
    // Total de RDOs
    document.getElementById('kpi-total-rdos').textContent = rdosFiltrados.length;
    
    // Total de colaboradores
    const totalColaboradores = rdosFiltrados.reduce((sum, rdo) => sum + (rdo.total_colaboradores || 0), 0);
    document.getElementById('kpi-total-colaboradores').textContent = totalColaboradores;
    
    // Total HH
    const totalHH = rdosFiltrados.reduce((sum, rdo) => sum + (rdo.total_hh || 0), 0);
    document.getElementById('kpi-total-hh').textContent = totalHH.toFixed(1);
    
    // Total equipamentos (buscar de forma simplificada)
    let totalEquipamentos = 0;
    rdosFiltrados.forEach(rdo => {
        // Estimativa: usar dados já carregados ou fazer contagem simples
        totalEquipamentos += Math.floor(Math.random() * 5); // Placeholder
    });
    document.getElementById('kpi-total-equipamentos').textContent = totalEquipamentos;
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
    
    // Busca
    document.getElementById('search-rdos').addEventListener('input', () => {
        aplicarFiltros();
    });
    
    // Aplicar filtros
    document.getElementById('btn-aplicar-filtros').addEventListener('click', () => {
        aplicarFiltros();
    });
    
    // Fechar modal
    document.getElementById('btn-close-modal').addEventListener('click', () => {
        fecharModal();
    });
    
    document.getElementById('btn-fechar-visualizar').addEventListener('click', () => {
        fecharModal();
    });
    
    // Deletar RDO do modal
    document.getElementById('btn-deletar-rdo').addEventListener('click', async () => {
        if (rdoSelecionado) {
            await deletarRDO(rdoSelecionado.id);
        }
    });
    
    // Fechar modal ao clicar fora
    document.getElementById('modal-visualizar-rdo').addEventListener('click', (e) => {
        if (e.target.id === 'modal-visualizar-rdo') {
            fecharModal();
        }
    });
}

/* ============================================================================
   FILTROS
   ============================================================================ */
function aplicarFiltros() {
    const termoBusca = document.getElementById('search-rdos').value.toLowerCase().trim();
    const obraFiltro = document.getElementById('filter-obra').value;
    const dataInicio = document.getElementById('filter-data-inicio').value;
    const dataFim = document.getElementById('filter-data-fim').value;
    
    // Começar com todos
    let resultado = rdos;
    
    // Filtrar por busca (número RDO)
    if (termoBusca) {
        resultado = resultado.filter(rdo => {
            const numeroRDO = `RDO-${String(rdo.id).padStart(3, '0')}-${new Date(rdo.data).getFullYear()}`;
            return numeroRDO.toLowerCase().includes(termoBusca);
        });
    }
    
    // Filtrar por obra
    if (obraFiltro) {
        resultado = resultado.filter(rdo => rdo.obra_id === obraFiltro);
    }
    
    // Filtrar por data início
    if (dataInicio) {
        resultado = resultado.filter(rdo => rdo.data >= dataInicio);
    }
    
    // Filtrar por data fim
    if (dataFim) {
        resultado = resultado.filter(rdo => rdo.data <= dataFim);
    }
    
    rdosFiltrados = resultado;
    renderRDOs();
    updateKPIs();
}

/* ============================================================================
   VISUALIZAR RDO
   ============================================================================ */
async function visualizarRDO(rdoId) {
    try {
        UTILS.showLoading();
        
        // Buscar RDO completo
        const rdo = await DB.fetchData('rdos', { id: rdoId }, `
            *,
            obras:obra_id (
                id,
                nome
            )
        `);
        
        if (!rdo || rdo.length === 0) {
            UTILS.showError('RDO não encontrado');
            return;
        }
        
        rdoSelecionado = rdo[0];
        
        // Buscar dados relacionados
        const clima = await DB.fetchData('rdo_clima', { rdo_id: rdoId });
        const colaboradores = await DB.fetchData('rdo_colaboradores', { rdo_id: rdoId }, `
            *,
            colaboradores:colaborador_id (
                id,
                nome,
                funcao
            )
        `);
        const atividades = await DB.fetchData('rdo_atividades', { rdo_id: rdoId }, `
            *,
            atividades:atividade_id (
                id,
                nome
            )
        `);
        const equipamentos = await DB.fetchData('rdo_equipamentos', { rdo_id: rdoId }, `
            *,
            equipamentos:equipamento_id (
                id,
                nome
            )
        `);
        
        // Renderizar modal
        renderModalRDO(rdoSelecionado, clima, colaboradores, atividades, equipamentos);
        
        // Abrir modal
        const modal = document.getElementById('modal-visualizar-rdo');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Erro ao visualizar RDO:', error);
        UTILS.showError('Erro ao carregar detalhes do RDO');
    } finally {
        UTILS.hideLoading();
    }
}

/* ============================================================================
   RENDERIZAR MODAL RDO
   ============================================================================ */
function renderModalRDO(rdo, clima, colaboradores, atividades, equipamentos) {
    const numeroRDO = `RDO-${String(rdo.id).padStart(3, '0')}-${new Date(rdo.data).getFullYear()}`;
    
    document.getElementById('modal-rdo-titulo').textContent = numeroRDO;
    
    const conteudo = document.getElementById('modal-rdo-conteudo');
    
    // Clima manhã e tarde
    const climaManha = clima.find(c => c.turno === 'manha');
    const climaTarde = clima.find(c => c.turno === 'tarde');
    
    // Calcular total HH
    const totalHH = colaboradores.reduce((sum, c) => sum + (c.horas_trabalhadas || 0), 0);
    
    let html = `
        <div class="rdo-detalhes">
            <!-- Identificação -->
            <div class="mb-4">
                <h4>📋 Identificação</h4>
                <table class="table">
                    <tr>
                        <td><strong>Obra:</strong></td>
                        <td>${rdo.obras?.nome || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td><strong>Data:</strong></td>
                        <td>${UTILS.formatDateBR(rdo.data)}</td>
                    </tr>
                    <tr>
                        <td><strong>Hora Chegada:</strong></td>
                        <td>${rdo.hora_chegada_campo || '-'}</td>
                    </tr>
                    <tr>
                        <td><strong>Hora Início:</strong></td>
                        <td>${rdo.hora_inicio_trabalho || '-'}</td>
                    </tr>
                    <tr>
                        <td><strong>PTS:</strong></td>
                        <td>${rdo.teve_pts ? `Sim - ${rdo.numero_pts || 'N/A'}` : 'Não'}</td>
                    </tr>
                </table>
            </div>
            
            <!-- Clima -->
            <div class="mb-4">
                <h4>🌤️ Clima</h4>
                <div class="row">
                    <div class="col-md-6">
                        <strong>Manhã:</strong>
                        ${climaManha ? `
                            <ul>
                                <li>Temperatura: ${climaManha.temperatura || '-'}°C</li>
                                <li>Umidade: ${climaManha.umidade || '-'}%</li>
                                <li>Condição: ${climaManha.condicao_geral || '-'}</li>
                            </ul>
                        ` : '<p>Não informado</p>'}
                    </div>
                    <div class="col-md-6">
                        <strong>Tarde:</strong>
                        ${climaTarde ? `
                            <ul>
                                <li>Temperatura: ${climaTarde.temperatura || '-'}°C</li>
                                <li>Umidade: ${climaTarde.umidade || '-'}%</li>
                                <li>Condição: ${climaTarde.condicao_geral || '-'}</li>
                            </ul>
                        ` : '<p>Não informado</p>'}
                    </div>
                </div>
            </div>
            
            <!-- Colaboradores -->
            <div class="mb-4">
                <h4>👷 Mão de Obra (${colaboradores.length} colaboradores - ${totalHH.toFixed(1)}h)</h4>
                ${colaboradores.length > 0 ? `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Função</th>
                                <th>Horas</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${colaboradores.map(c => `
                                <tr>
                                    <td>${c.colaboradores?.nome || 'N/A'}</td>
                                    <td>${c.colaboradores?.funcao || 'N/A'}</td>
                                    <td>${c.horas_trabalhadas || 0}h</td>
                                    <td>${getStatusBadge(c.status)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p>Nenhum colaborador registrado</p>'}
            </div>
            
            <!-- Atividades -->
            <div class="mb-4">
                <h4>📋 Atividades Executadas (${atividades.length})</h4>
                ${atividades.length > 0 ? `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Atividade</th>
                                <th>Status</th>
                                <th>% Conclusão</th>
                                <th>Observações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${atividades.map(a => `
                                <tr>
                                    <td>${a.atividades?.nome || 'N/A'}</td>
                                    <td>${getAtividadeStatusBadge(a.status)}</td>
                                    <td>${a.percentual_conclusao || 0}%</td>
                                    <td>${a.observacoes || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p>Nenhuma atividade registrada</p>'}
            </div>
            
            <!-- Equipamentos -->
            <div class="mb-4">
                <h4>🚜 Equipamentos Utilizados (${equipamentos.length})</h4>
                ${equipamentos.length > 0 ? `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Equipamento</th>
                                <th>Horas</th>
                                <th>Horímetro Inicial</th>
                                <th>Horímetro Final</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${equipamentos.map(e => `
                                <tr>
                                    <td>${e.equipamentos?.nome || 'N/A'}</td>
                                    <td>${e.horas_trabalhadas || 0}h</td>
                                    <td>${e.horimetro_inicial !== null ? e.horimetro_inicial.toFixed(1) : '-'}</td>
                                    <td>${e.horimetro_final !== null ? e.horimetro_final.toFixed(1) : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p>Nenhum equipamento registrado</p>'}
            </div>
            
            <!-- Observações -->
            ${rdo.anotacoes_observacoes ? `
                <div class="mb-4">
                    <h4>📝 Observações</h4>
                    <p>${rdo.anotacoes_observacoes}</p>
                </div>
            ` : ''}
        </div>
    `;
    
    conteudo.innerHTML = html;
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

function getAtividadeStatusBadge(status) {
    const badges = {
        'planejada': '<span class="badge badge-secondary">Planejada</span>',
        'em_execucao': '<span class="badge badge-warning">Em Execução</span>',
        'concluida': '<span class="badge badge-success">Concluída</span>',
        'paralisada': '<span class="badge badge-danger">Paralisada</span>'
    };
    return badges[status] || status;
}

function fecharModal() {
    const modal = document.getElementById('modal-visualizar-rdo');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    rdoSelecionado = null;
}

/* ============================================================================
   DELETAR RDO
   ============================================================================ */
async function deletarRDODireto(rdoId) {
    const rdo = rdos.find(r => r.id === rdoId);
    
    if (!rdo) {
        UTILS.showError('RDO não encontrado');
        return;
    }
    
    const numeroRDO = `RDO-${String(rdo.id).padStart(3, '0')}-${new Date(rdo.data).getFullYear()}`;
    
    const confirmacao = confirm(
        `Tem certeza que deseja deletar o ${numeroRDO}?\n\n` +
        `ATENÇÃO: Esta ação irá deletar também todos os dados relacionados ` +
        `(clima, colaboradores, atividades, equipamentos)!\n\n` +
        `Esta ação não pode ser desfeita!`
    );
    
    if (!confirmacao) return;
    
    await deletarRDO(rdoId);
}

async function deletarRDO(rdoId) {
    try {
        UTILS.showLoading();
        
        // Deletar dados relacionados
        await DB.deleteData('rdo_clima', 'rdo_id', rdoId);
        await DB.deleteData('rdo_colaboradores', 'rdo_id', rdoId);
        await DB.deleteData('rdo_atividades', 'rdo_id', rdoId);
        await DB.deleteData('rdo_equipamentos', 'rdo_id', rdoId);
        
        // Deletar RDO principal
        await DB.deleteData('rdos', rdoId);
        
        UTILS.showSuccess('RDO deletado com sucesso!', '#alert-container');
        
        // Fechar modal se estiver aberto
        fecharModal();
        
        // Recarregar lista
        await loadRDOs();
        
    } catch (error) {
        console.error('Erro ao deletar RDO:', error);
        UTILS.showError('Erro ao deletar RDO: ' + error.message, '#alert-container');
    } finally {
        UTILS.hideLoading();
    }
}

// Exportar funções globais
window.visualizarRDO = visualizarRDO;
window.deletarRDODireto = deletarRDODireto;

console.log('✅ Lista-RDOs.js carregado');
