/* ============================================================================
   CADASTRO DE ATIVIDADES - JavaScript
   ============================================================================ */

let atividades = [];
let obras = [];
let atividadeEditando = null;

// Verificar autenticação e carregar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📋 Cadastro de Atividades carregando...');
    
    // Verificar auth
    const session = await AUTH.checkAuth();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }
    
    // Mostrar nome do usuário
    const userName = document.getElementById('user-name');
    if (userName) {
        userName.textContent = session.user.email.split('@')[0];
    }
    
    // Setup
    setupEventListeners();
    await carregarObras();
    await carregarAtividades();
    
    console.log('✅ Cadastro de Atividades carregado!');
});

/* ============================================================================
   EVENT LISTENERS
   ============================================================================ */
function setupEventListeners() {
    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        if (confirm('Deseja realmente sair?')) {
            await AUTH.logout();
        }
    });
    
    // Mobile menu
    document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('mobile-open');
    });
    
    // Nova atividade
    document.getElementById('btn-nova-atividade')?.addEventListener('click', abrirModalNova);
    
    // Modal
    document.getElementById('modal-close')?.addEventListener('click', fecharModal);
    document.getElementById('btn-cancelar')?.addEventListener('click', fecharModal);
    
    // Form
    document.getElementById('form-atividade')?.addEventListener('submit', salvarAtividade);
    
    // Filtros
    document.getElementById('filtro-busca')?.addEventListener('input', filtrarAtividades);
    document.getElementById('filtro-obra')?.addEventListener('change', filtrarAtividades);
    document.getElementById('filtro-tipo')?.addEventListener('change', filtrarAtividades);
}

/* ============================================================================
   CARREGAR OBRAS
   ============================================================================ */
async function carregarObras() {
    try {
        obras = await DB.getObras(true);
        
        // Preencher selects
        const selectFiltro = document.getElementById('filtro-obra');
        const selectModal = document.getElementById('obra_id');
        
        obras.forEach(obra => {
            // Filtro
            const optFiltro = document.createElement('option');
            optFiltro.value = obra.id;
            optFiltro.textContent = obra.nome;
            selectFiltro?.appendChild(optFiltro);
            
            // Modal
            const optModal = document.createElement('option');
            optModal.value = obra.id;
            optModal.textContent = obra.nome;
            selectModal?.appendChild(optModal);
        });
        
        console.log(`✅ ${obras.length} obras carregadas`);
        
    } catch (error) {
        console.error('Erro ao carregar obras:', error);
    }
}

/* ============================================================================
   CARREGAR ATIVIDADES
   ============================================================================ */
async function carregarAtividades() {
    try {
        UTILS.showLoading();
        
        // Buscar atividades com join de obras
        atividades = await DB.fetchData('atividades', {}, `
            *,
            obras (nome)
        `, {
            order: { column: 'created_at', ascending: false }
        });
        
        console.log(`✅ ${atividades.length} atividades carregadas`);
        
        renderizarTabela(atividades);
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao carregar atividades:', error);
        UTILS.showError('Erro ao carregar atividades');
        UTILS.hideLoading();
    }
}

/* ============================================================================
   RENDERIZAR TABELA
   ============================================================================ */
function renderizarTabela(dadosFiltrados) {
    const tbody = document.getElementById('atividades-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (dadosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhuma atividade cadastrada</td></tr>';
        return;
    }
    
    const tipoLabels = {
        'civil': 'Civil',
        'eletrica': 'Elétrica',
        'mecanica': 'Mecânica',
        'hidraulica': 'Hidráulica',
        'instrumentacao': 'Instrumentação',
        'outras': 'Outras'
    };
    
    dadosFiltrados.forEach(atividade => {
        const tr = document.createElement('tr');
        
        const obraNome = atividade.obras?.nome || 'Obra não encontrada';
        const statusBadge = atividade.ativo ? 
            '<span class="badge badge-success">Ativa</span>' : 
            '<span class="badge badge-secondary">Inativa</span>';
        
        tr.innerHTML = `
            <td>${atividade.codigo || '-'}</td>
            <td><strong>${atividade.nome}</strong></td>
            <td>${obraNome}</td>
            <td>${tipoLabels[atividade.tipo] || atividade.tipo}</td>
            <td>${atividade.unidade_medida || '-'}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editarAtividade('${atividade.id}')">✏️ Editar</button>
                <button class="btn btn-sm btn-danger" onclick="deletarAtividade('${atividade.id}', '${atividade.nome}')">🗑️ Excluir</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

/* ============================================================================
   FILTRAR ATIVIDADES
   ============================================================================ */
function filtrarAtividades() {
    const busca = document.getElementById('filtro-busca')?.value.toLowerCase() || '';
    const obraId = document.getElementById('filtro-obra')?.value || '';
    const tipo = document.getElementById('filtro-tipo')?.value || '';
    
    let filtradas = atividades;
    
    // Filtro de obra
    if (obraId) {
        filtradas = filtradas.filter(at => at.obra_id === obraId);
    }
    
    // Filtro de tipo
    if (tipo) {
        filtradas = filtradas.filter(at => at.tipo === tipo);
    }
    
    // Filtro de busca
    if (busca) {
        filtradas = filtradas.filter(at =>
            at.nome.toLowerCase().includes(busca) ||
            (at.codigo && at.codigo.toLowerCase().includes(busca)) ||
            (at.descricao && at.descricao.toLowerCase().includes(busca))
        );
    }
    
    renderizarTabela(filtradas);
}

/* ============================================================================
   MODAL
   ============================================================================ */
function abrirModalNova() {
    atividadeEditando = null;
    document.getElementById('modal-titulo').textContent = 'Nova Atividade';
    document.getElementById('form-atividade').reset();
    document.getElementById('ativo').checked = true;
    document.getElementById('modal-atividade').classList.add('show');
}

function fecharModal() {
    document.getElementById('modal-atividade').classList.remove('show');
    atividadeEditando = null;
}

/* ============================================================================
   SALVAR ATIVIDADE
   ============================================================================ */
async function salvarAtividade(e) {
    e.preventDefault();
    
    try {
        const dados = {
            obra_id: document.getElementById('obra_id').value,
            codigo: document.getElementById('codigo').value || null,
            nome: document.getElementById('nome').value,
            tipo: document.getElementById('tipo').value,
            unidade_medida: document.getElementById('unidade_medida').value || null,
            quantidade_prevista: document.getElementById('quantidade_prevista').value || null,
            prazo_dias: document.getElementById('prazo_dias').value || null,
            descricao: document.getElementById('descricao').value || null,
            ativo: document.getElementById('ativo').checked
        };
        
        UTILS.showLoading();
        
        if (atividadeEditando) {
            await DB.updateData('atividades', atividadeEditando, dados);
            UTILS.showSuccess('Atividade atualizada com sucesso!');
        } else {
            await DB.insertData('atividades', dados);
            UTILS.showSuccess('Atividade cadastrada com sucesso!');
        }
        
        fecharModal();
        await carregarAtividades();
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao salvar atividade:', error);
        UTILS.showError('Erro ao salvar atividade');
        UTILS.hideLoading();
    }
}

/* ============================================================================
   EDITAR ATIVIDADE
   ============================================================================ */
async function editarAtividade(id) {
    try {
        UTILS.showLoading();
        
        const atividade = await DB.fetchOne('atividades', { id });
        
        if (!atividade) {
            UTILS.showError('Atividade não encontrada');
            return;
        }
        
        atividadeEditando = id;
        
        // Preencher form
        document.getElementById('obra_id').value = atividade.obra_id;
        document.getElementById('codigo').value = atividade.codigo || '';
        document.getElementById('nome').value = atividade.nome;
        document.getElementById('tipo').value = atividade.tipo;
        document.getElementById('unidade_medida').value = atividade.unidade_medida || '';
        document.getElementById('quantidade_prevista').value = atividade.quantidade_prevista || '';
        document.getElementById('prazo_dias').value = atividade.prazo_dias || '';
        document.getElementById('descricao').value = atividade.descricao || '';
        document.getElementById('ativo').checked = atividade.ativo;
        
        document.getElementById('modal-titulo').textContent = 'Editar Atividade';
        document.getElementById('modal-atividade').classList.add('show');
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao carregar atividade:', error);
        UTILS.showError('Erro ao carregar atividade');
        UTILS.hideLoading();
    }
}

/* ============================================================================
   DELETAR ATIVIDADE
   ============================================================================ */
async function deletarAtividade(id, nome) {
    if (!confirm(`Deseja realmente excluir a atividade "${nome}"?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }
    
    try {
        UTILS.showLoading();
        
        await DB.deleteData('atividades', id);
        
        UTILS.showSuccess('Atividade excluída com sucesso!');
        await carregarAtividades();
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao deletar atividade:', error);
        UTILS.showError('Erro ao deletar atividade');
        UTILS.hideLoading();
    }
}

// Exportar funções globais
window.editarAtividade = editarAtividade;
window.deletarAtividade = deletarAtividade;

console.log('✅ Atividades.js carregado');
