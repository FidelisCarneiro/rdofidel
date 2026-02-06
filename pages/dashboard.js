/* ============================================================================
   DASHBOARD.JS - Lógica do Dashboard (CORRIGIDO)
   ============================================================================ */

// Variáveis globais
let obras = [];
let rdos = [];
let colaboradores = [];
let filtroObra = '';
let filtroPeriodo = 30;

// Verificar autenticação e carregar dados
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 Dashboard carregando...');
    
    // ✅ VERIFICAR AUTENTICAÇÃO PRIMEIRO!
    const session = await AUTH.checkAuth();
    if (!session) {
        console.log('⚠️  Não autenticado, redirecionando para login...');
        window.location.href = 'login.html';
        return;
    }
    
    console.log('✅ Usuário autenticado:', session.user.email);
    
    // Mostrar nome do usuário
    const userName = document.getElementById('user-name');
    if (userName) {
        userName.textContent = session.user.email.split('@')[0];
    }
    
    // Configurar event listeners
    setupEventListeners();
    
    // Carregar dados iniciais
    await loadData();
    
    console.log('✅ Dashboard carregado!');
});

/* ============================================================================
   EVENT LISTENERS
   ============================================================================ */
function setupEventListeners() {
    // Botão de logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if (confirm('Deseja realmente sair?')) {
                await AUTH.logout();
            }
        });
    }
    
    // Menu mobile
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (mobileMenuToggle && sidebar) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }
    
    // Filtros
    const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
    if (btnAplicarFiltros) {
        btnAplicarFiltros.addEventListener('click', () => {
            aplicarFiltros();
        });
    }
}

/* ============================================================================
   CARREGAR DADOS
   ============================================================================ */
async function loadData() {
    try {
        UTILS.showLoading();
        
        // Carregar obras para o filtro
        await loadObras();
        
        // Carregar KPIs
        await loadKPIs();
        
        // Carregar gráficos
        await loadCharts();
        
        // Carregar tabela de obras
        await loadObrasTable();
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        UTILS.showError('Erro ao carregar dados do dashboard');
        UTILS.hideLoading();
    }
}

/* ============================================================================
   CARREGAR OBRAS
   ============================================================================ */
async function loadObras() {
    try {
        obras = await DB.getObras(true);
        
        // Preencher select de filtro
        const selectObra = document.getElementById('filter-obra');
        if (selectObra) {
            obras.forEach(obra => {
                const option = document.createElement('option');
                option.value = obra.id;
                option.textContent = obra.nome;
                selectObra.appendChild(option);
            });
        }
        
        console.log(`✅ ${obras.length} obras carregadas`);
        
    } catch (error) {
        console.error('Erro ao carregar obras:', error);
    }
}

/* ============================================================================
   CARREGAR KPIs
   ============================================================================ */
async function loadKPIs() {
    try {
        // Total de obras ativas
        const kpiObras = document.getElementById('kpi-obras');
        if (kpiObras) {
            kpiObras.textContent = obras.length;
        }
        
        // Buscar RDOs do período
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - filtroPeriodo);
        
        rdos = await DB.fetchData('rdos', {}, '*', {
            order: { column: 'data', ascending: false }
        });
        
        // Filtrar por data
        const rdosFiltrados = rdos.filter(rdo => {
            const dataRDO = new Date(rdo.data);
            return dataRDO >= dataInicio;
        });
        
        const kpiRDOs = document.getElementById('kpi-rdos');
        if (kpiRDOs) {
            kpiRDOs.textContent = rdosFiltrados.length;
        }
        
        // Carregar colaboradores
        colaboradores = await DB.getColaboradores(true);
        const kpiColaboradores = document.getElementById('kpi-colaboradores');
        if (kpiColaboradores) {
            kpiColaboradores.textContent = colaboradores.length;
        }
        
        // Carregar ocorrências
        const ocorrencias = await DB.fetchData('rdo_ocorrencias', {}, '*');
        const kpiOcorrencias = document.getElementById('kpi-ocorrencias');
        if (kpiOcorrencias) {
            kpiOcorrencias.textContent = ocorrencias.length;
        }
        
        console.log('✅ KPIs carregados');
        
    } catch (error) {
        console.error('Erro ao carregar KPIs:', error);
    }
}

/* ============================================================================
   CARREGAR GRÁFICOS
   ============================================================================ */
async function loadCharts() {
    try {
        // Preparar dados dos últimos 7 dias
        const dias = [];
        const rdosPorDia = [];
        
        for (let i = 6; i >= 0; i--) {
            const data = new Date();
            data.setDate(data.getDate() - i);
            
            const dia = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            dias.push(dia);
            
            // Contar RDOs deste dia
            const dataStr = data.toISOString().split('T')[0];
            const count = rdos.filter(rdo => rdo.data === dataStr).length;
            rdosPorDia.push(count);
        }
        
        // Gráfico 1: RDOs por dia
        const ctx1 = document.getElementById('chart-rdos-dia');
        if (ctx1) {
            new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: dias,
                    datasets: [{
                        label: 'RDOs',
                        data: rdosPorDia,
                        borderColor: '#C8102E',
                        backgroundColor: 'rgba(200, 16, 46, 0.1)',
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
        
        // Gráfico 2: Horas trabalhadas (exemplo)
        const ctx2 = document.getElementById('chart-hh');
        if (ctx2) {
            new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: dias,
                    datasets: [{
                        label: 'Horas (HH)',
                        data: [120, 135, 128, 142, 138, 145, 150],
                        backgroundColor: '#FF6A13'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
        
        // Gráfico 3: Ocorrências por tipo
        const ctx3 = document.getElementById('chart-ocorrencias');
        if (ctx3) {
            new Chart(ctx3, {
                type: 'doughnut',
                data: {
                    labels: ['Atraso', 'Falta', 'Acidente', 'Equipamento'],
                    datasets: [{
                        data: [12, 8, 3, 15],
                        backgroundColor: ['#ffc107', '#dc3545', '#C8102E', '#0086BF']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true
                }
            });
        }
        
        // Gráfico 4: Status das obras
        const ctx4 = document.getElementById('chart-obras-status');
        if (ctx4) {
            const emAndamento = obras.filter(o => {
                const hoje = new Date();
                const inicio = new Date(o.data_inicio);
                const fim = o.data_conclusao_prevista ? new Date(o.data_conclusao_prevista) : null;
                return inicio <= hoje && (!fim || fim >= hoje);
            }).length;
            
            const concluidas = obras.filter(o => {
                if (!o.data_conclusao_prevista) return false;
                return new Date(o.data_conclusao_prevista) < new Date();
            }).length;
            
            const planejadas = obras.length - emAndamento - concluidas;
            
            new Chart(ctx4, {
                type: 'bar',
                data: {
                    labels: ['Em Andamento', 'Concluídas', 'Planejadas'],
                    datasets: [{
                        label: 'Obras',
                        data: [emAndamento, concluidas, planejadas],
                        backgroundColor: ['#FF6A13', '#28a745', '#0086BF']
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
        
        console.log('✅ Gráficos carregados');
        
    } catch (error) {
        console.error('Erro ao carregar gráficos:', error);
    }
}

/* ============================================================================
   CARREGAR TABELA DE OBRAS
   ============================================================================ */
async function loadObrasTable() {
    try {
        const tbody = document.getElementById('obras-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (obras.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma obra cadastrada</td></tr>';
            return;
        }
        
        // Mostrar apenas as 5 mais recentes
        const obrasRecentes = obras.slice(0, 5);
        
        obrasRecentes.forEach(obra => {
            const tr = document.createElement('tr');
            
            // Calcular status
            let status = 'Planejada';
            let badgeClass = 'badge-secondary';
            
            const hoje = new Date();
            const inicio = new Date(obra.data_inicio);
            const fim = obra.data_conclusao_prevista ? new Date(obra.data_conclusao_prevista) : null;
            
            if (inicio <= hoje && (!fim || fim >= hoje)) {
                status = 'Em Andamento';
                badgeClass = 'badge-warning';
            } else if (fim && fim < hoje) {
                status = 'Concluída';
                badgeClass = 'badge-success';
            }
            
            tr.innerHTML = `
                <td>${obra.nome}</td>
                <td>${obra.gestor_obra || '-'}</td>
                <td>${obra.numero_contrato || '-'}</td>
                <td>${UTILS.formatDateBR(obra.data_inicio)}</td>
                <td><span class="badge ${badgeClass}">${status}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="window.location.href='rdo/novo-rdo-v2.html?obra=${obra.id}'">
                        Novo RDO
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
        console.log('✅ Tabela de obras carregada');
        
    } catch (error) {
        console.error('Erro ao carregar tabela:', error);
    }
}

/* ============================================================================
   APLICAR FILTROS
   ============================================================================ */
function aplicarFiltros() {
    const selectObra = document.getElementById('filter-obra');
    const selectPeriodo = document.getElementById('filter-periodo');
    
    if (selectObra) {
        filtroObra = selectObra.value;
    }
    
    if (selectPeriodo) {
        filtroPeriodo = parseInt(selectPeriodo.value);
    }
    
    console.log('Aplicando filtros:', { filtroObra, filtroPeriodo });
    
    // Recarregar dados com filtros
    loadKPIs();
    loadCharts();
}

console.log('✅ Dashboard.js carregado (versão corrigida)');
