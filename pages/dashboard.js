/* ============================================================================
   DASHBOARD.JS - Lógica do dashboard
   ============================================================================ */

// Variáveis globais
let chartRdosDia = null;
let chartHH = null;
let chartOcorrencias = null;
let chartObrasStatus = null;

// Verificar autenticação ao carregar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 Dashboard carregando...');
    
    // Verificar se está autenticado
    const session = await AUTH.checkAuth();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    
    // Carregar informações do usuário
    await loadUserInfo();
    
    // Carregar dados do dashboard
    await loadDashboardData();
    
    // Configurar event listeners
    setupEventListeners();
    
    console.log('✅ Dashboard carregado!');
});

/* ============================================================================
   INFORMAÇÕES DO USUÁRIO
   ============================================================================ */
async function loadUserInfo() {
    try {
        const user = await AUTH.getCurrentUser();
        
        if (user) {
            const userName = user.user_metadata?.nome || user.email.split('@')[0];
            document.getElementById('user-name').textContent = userName;
        }
        
    } catch (error) {
        console.error('Erro ao carregar usuário:', error);
    }
}

/* ============================================================================
   CARREGAR DADOS DO DASHBOARD
   ============================================================================ */
async function loadDashboardData() {
    try {
        UTILS.showLoading();
        
        // Carregar obras para o filtro
        await loadObrasFilter();
        
        // Carregar KPIs
        await loadKPIs();
        
        // Carregar gráficos
        await loadCharts();
        
        // Carregar tabela de obras
        await loadObrasTable();
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        UTILS.showError('Erro ao carregar dados do dashboard');
    } finally {
        UTILS.hideLoading();
    }
}

/* ============================================================================
   CARREGAR OBRAS NO FILTRO
   ============================================================================ */
async function loadObrasFilter() {
    try {
        const obras = await DB.getObras(true);
        const select = document.getElementById('filter-obra');
        
        // Limpar opções existentes (exceto "Todas")
        select.innerHTML = '<option value="">Todas as obras</option>';
        
        // Adicionar obras
        obras.forEach(obra => {
            const option = document.createElement('option');
            option.value = obra.id;
            option.textContent = obra.nome;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Erro ao carregar obras:', error);
    }
}

/* ============================================================================
   CARREGAR KPIs
   ============================================================================ */
async function loadKPIs() {
    try {
        // Obras ativas
        const obras = await DB.getObras(true);
        document.getElementById('kpi-obras').textContent = obras.length;
        
        // Colaboradores ativos
        const colaboradores = await DB.getColaboradores(true);
        document.getElementById('kpi-colaboradores').textContent = colaboradores.length;
        
        // RDOs no período (últimos 30 dias)
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - 30);
        
        const rdos = await DB.fetchData('rdos', {}, '*', {
            order: { column: 'data', ascending: false }
        });
        
        // Filtrar RDOs dos últimos 30 dias
        const rdosPeriodo = rdos.filter(rdo => {
            const dataRdo = new Date(rdo.data);
            return dataRdo >= dataInicio;
        });
        
        document.getElementById('kpi-rdos').textContent = rdosPeriodo.length;
        
        // Ocorrências no período
        let totalOcorrencias = 0;
        for (const rdo of rdosPeriodo) {
            const ocorrencias = await DB.fetchData('rdo_ocorrencias', { rdo_id: rdo.id });
            totalOcorrencias += ocorrencias.length;
        }
        
        document.getElementById('kpi-ocorrencias').textContent = totalOcorrencias;
        
    } catch (error) {
        console.error('Erro ao carregar KPIs:', error);
    }
}

/* ============================================================================
   CARREGAR GRÁFICOS
   ============================================================================ */
async function loadCharts() {
    try {
        await loadChartRdosDia();
        await loadChartHH();
        await loadChartOcorrencias();
        await loadChartObrasStatus();
        
    } catch (error) {
        console.error('Erro ao carregar gráficos:', error);
    }
}

/* ============================================================================
   GRÁFICO: RDOs POR DIA
   ============================================================================ */
async function loadChartRdosDia() {
    try {
        // Buscar RDOs dos últimos 30 dias
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - 30);
        
        const rdos = await DB.fetchData('rdos', {}, 'data', {
            order: { column: 'data', ascending: true }
        });
        
        // Filtrar e agrupar por data
        const rdosPorDia = {};
        rdos.forEach(rdo => {
            const dataRdo = new Date(rdo.data);
            if (dataRdo >= dataInicio) {
                const dataFormatada = UTILS.formatDateBR(rdo.data);
                rdosPorDia[dataFormatada] = (rdosPorDia[dataFormatada] || 0) + 1;
            }
        });
        
        // Preparar dados para o gráfico
        const labels = Object.keys(rdosPorDia);
        const data = Object.values(rdosPorDia);
        
        // Criar gráfico
        const ctx = document.getElementById('chart-rdos-dia');
        
        if (chartRdosDia) {
            chartRdosDia.destroy();
        }
        
        chartRdosDia = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.slice(-14), // Últimos 14 dias
                datasets: [{
                    label: 'RDOs',
                    data: data.slice(-14),
                    borderColor: '#C8102E',
                    backgroundColor: 'rgba(200, 16, 46, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Erro no gráfico RDOs por dia:', error);
    }
}

/* ============================================================================
   GRÁFICO: HORAS TRABALHADAS
   ============================================================================ */
async function loadChartHH() {
    try {
        // Dados de exemplo (em produção, calcular do banco)
        const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const data = [64, 72, 80, 68, 76, 40];
        
        const ctx = document.getElementById('chart-hh');
        
        if (chartHH) {
            chartHH.destroy();
        }
        
        chartHH = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Horas Trabalhadas',
                    data: data,
                    backgroundColor: '#0086BF',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Erro no gráfico HH:', error);
    }
}

/* ============================================================================
   GRÁFICO: OCORRÊNCIAS POR TIPO
   ============================================================================ */
async function loadChartOcorrencias() {
    try {
        // Buscar tipos de ocorrências
        const tipos = await DB.fetchData('tipos_ocorrencias', { ativo: true });
        
        // Contar ocorrências por tipo (últimos 30 dias)
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - 30);
        
        const rdos = await DB.fetchData('rdos', {}, 'id, data');
        const rdosRecentes = rdos.filter(rdo => new Date(rdo.data) >= dataInicio);
        
        const contagemPorTipo = {};
        
        for (const tipo of tipos) {
            contagemPorTipo[tipo.nome] = 0;
        }
        
        for (const rdo of rdosRecentes) {
            const ocorrencias = await DB.fetchData('rdo_ocorrencias', { rdo_id: rdo.id }, 'tipo_ocorrencia_id');
            
            for (const ocorrencia of ocorrencias) {
                const tipo = tipos.find(t => t.id === ocorrencia.tipo_ocorrencia_id);
                if (tipo) {
                    contagemPorTipo[tipo.nome]++;
                }
            }
        }
        
        // Top 5 ocorrências
        const topOcorrencias = Object.entries(contagemPorTipo)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        const labels = topOcorrencias.map(([nome]) => nome);
        const data = topOcorrencias.map(([, count]) => count);
        
        const ctx = document.getElementById('chart-ocorrencias');
        
        if (chartOcorrencias) {
            chartOcorrencias.destroy();
        }
        
        chartOcorrencias = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#C8102E',
                        '#FF6A13',
                        '#0086BF',
                        '#00617F',
                        '#BBBCBC'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Erro no gráfico de ocorrências:', error);
    }
}

/* ============================================================================
   GRÁFICO: STATUS DAS OBRAS
   ============================================================================ */
async function loadChartObrasStatus() {
    try {
        const obras = await DB.getObras(true);
        
        // Calcular status baseado em datas
        let noInicio = 0;
        let emAndamento = 0;
        let atrasadas = 0;
        let concluidas = 0;
        
        const hoje = new Date();
        
        obras.forEach(obra => {
            const dataInicio = new Date(obra.data_inicio);
            const dataPrevisao = new Date(obra.data_previsao_conclusao);
            
            const diasDecorridos = Math.floor((hoje - dataInicio) / (1000 * 60 * 60 * 24));
            
            if (diasDecorridos < 30) {
                noInicio++;
            } else if (hoje > dataPrevisao) {
                atrasadas++;
            } else {
                emAndamento++;
            }
        });
        
        const ctx = document.getElementById('chart-obras-status');
        
        if (chartObrasStatus) {
            chartObrasStatus.destroy();
        }
        
        chartObrasStatus = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['No Início', 'Em Andamento', 'Atrasadas'],
                datasets: [{
                    label: 'Obras',
                    data: [noInicio, emAndamento, atrasadas],
                    backgroundColor: [
                        '#0086BF',
                        '#28a745',
                        '#C8102E'
                    ],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Erro no gráfico de status:', error);
    }
}

/* ============================================================================
   TABELA DE OBRAS
   ============================================================================ */
async function loadObrasTable() {
    try {
        const obras = await DB.getObras(true);
        const tbody = document.getElementById('obras-tbody');
        
        if (obras.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma obra cadastrada</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        // Mostrar apenas as 5 primeiras
        obras.slice(0, 5).forEach(obra => {
            const tr = document.createElement('tr');
            
            // Calcular status
            const hoje = new Date();
            const dataInicio = new Date(obra.data_inicio);
            const dataPrevisao = new Date(obra.data_previsao_conclusao);
            
            let status = 'Em Andamento';
            let badgeClass = 'badge-success';
            
            const diasDecorridos = Math.floor((hoje - dataInicio) / (1000 * 60 * 60 * 24));
            
            if (diasDecorridos < 30) {
                status = 'Início';
                badgeClass = 'badge-info';
            } else if (hoje > dataPrevisao) {
                status = 'Atrasada';
                badgeClass = 'badge-danger';
            }
            
            tr.innerHTML = `
                <td><strong>${obra.nome}</strong></td>
                <td>${obra.gestor}</td>
                <td>${obra.numero_contrato || '-'}</td>
                <td>${UTILS.formatDateBR(obra.data_inicio)}</td>
                <td><span class="badge ${badgeClass}">${status}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="verObra('${obra.id}')">
                        Ver
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error('Erro ao carregar tabela:', error);
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
    
    // Filtros
    document.getElementById('btn-aplicar-filtros').addEventListener('click', () => {
        loadDashboardData();
    });
    
    // Menu mobile
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    
    mobileMenuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
    });
    
    // Fechar sidebar ao clicar em link (mobile)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('mobile-open');
            }
        });
    });
}

/* ============================================================================
   FUNÇÕES AUXILIARES
   ============================================================================ */
function verObra(obraId) {
    // TODO: Implementar visualização detalhada da obra
    alert(`Ver detalhes da obra: ${obraId}`);
}

console.log('✅ Dashboard.js carregado');
