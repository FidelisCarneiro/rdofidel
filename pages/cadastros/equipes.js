/* ============================================================================
   CADASTRO DE EQUIPES - JavaScript
   ============================================================================ */

let equipes = [];
let obras = [];
let equipeEditando = null;

// Verificar autenticação e carregar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('👥 Cadastro de Equipes carregando...');
    
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
    await carregarEquipes();
    
    console.log('✅ Cadastro de Equipes carregado!');
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
    
    // Nova equipe
    document.getElementById('btn-nova-equipe')?.addEventListener('click', abrirModalNova);
    
    // Modal
    document.getElementById('modal-close')?.addEventListener('click', fecharModal);
    document.getElementById('btn-cancelar')?.addEventListener('click', fecharModal);
    
    // Form
    document.getElementById('form-equipe')?.addEventListener('submit', salvarEquipe);
    
    // Filtros
    document.getElementById('filtro-busca')?.addEventListener('input', filtrarEquipes);
    document.getElementById('filtro-obra')?.addEventListener('change', filtrarEquipes);
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
   CARREGAR EQUIPES
   ============================================================================ */
async function carregarEquipes() {
    try {
        UTILS.showLoading();
        
        // Buscar equipes com join de obras
        equipes = await DB.fetchData('equipes', {}, `
            *,
            obras (nome)
        `, {
            order: { column: 'created_at', ascending: false }
        });
        
        console.log(`✅ ${equipes.length} equipes carregadas`);
        
        renderizarTabela(equipes);
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao carregar equipes:', error);
        UTILS.showError('Erro ao carregar equipes');
        UTILS.hideLoading();
    }
}

/* ============================================================================
   RENDERIZAR TABELA
   ============================================================================ */
function renderizarTabela(dadosFiltrados) {
    const tbody = document.getElementById('equipes-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (dadosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhuma equipe cadastrada</td></tr>';
        return;
    }
    
    dadosFiltrados.forEach(equipe => {
        const tr = document.createElement('tr');
        
        const obraNome = equipe.obras?.nome || 'Obra não encontrada';
        const statusBadge = equipe.ativo ? 
            '<span class="badge badge-success">Ativa</span>' : 
            '<span class="badge badge-secondary">Inativa</span>';
        
        tr.innerHTML = `
            <td><strong>${equipe.nome}</strong></td>
            <td>${obraNome}</td>
            <td>${equipe.gestor}</td>
            <td>${equipe.telefone_gestor || '-'}</td>
            <td>-</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editarEquipe('${equipe.id}')">✏️ Editar</button>
                <button class="btn btn-sm btn-danger" onclick="deletarEquipe('${equipe.id}', '${equipe.nome}')">🗑️ Excluir</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

/* ============================================================================
   FILTRAR EQUIPES
   ============================================================================ */
function filtrarEquipes() {
    const busca = document.getElementById('filtro-busca')?.value.toLowerCase() || '';
    const obraId = document.getElementById('filtro-obra')?.value || '';
    
    let filtradas = equipes;
    
    // Filtro de obra
    if (obraId) {
        filtradas = filtradas.filter(eq => eq.obra_id === obraId);
    }
    
    // Filtro de busca
    if (busca) {
        filtradas = filtradas.filter(eq =>
            eq.nome.toLowerCase().includes(busca) ||
            (eq.gestor && eq.gestor.toLowerCase().includes(busca)) ||
            (eq.especialidade && eq.especialidade.toLowerCase().includes(busca))
        );
    }
    
    renderizarTabela(filtradas);
}

/* ============================================================================
   MODAL
   ============================================================================ */
function abrirModalNova() {
    equipeEditando = null;
    document.getElementById('modal-titulo').textContent = 'Nova Equipe';
    document.getElementById('form-equipe').reset();
    document.getElementById('ativo').checked = true;
    document.getElementById('modal-equipe').classList.add('show');
}

function fecharModal() {
    document.getElementById('modal-equipe').classList.remove('show');
    equipeEditando = null;
}

/* ============================================================================
   SALVAR EQUIPE
   ============================================================================ */
async function salvarEquipe(e) {
    e.preventDefault();
    
    try {
        const dados = {
            obra_id: document.getElementById('obra_id').value,
            nome: document.getElementById('nome').value,
            gestor: document.getElementById('gestor').value,
            telefone_gestor: document.getElementById('telefone_gestor').value || null,
            turno: document.getElementById('turno').value || null,
            especialidade: document.getElementById('especialidade').value || null,
            ativo: document.getElementById('ativo').checked,
            observacoes: document.getElementById('observacoes').value || null
        };
        
        UTILS.showLoading();
        
        if (equipeEditando) {
            await DB.updateData('equipes', equipeEditando, dados);
            UTILS.showSuccess('Equipe atualizada com sucesso!');
        } else {
            await DB.insertData('equipes', dados);
            UTILS.showSuccess('Equipe cadastrada com sucesso!');
        }
        
        fecharModal();
        await carregarEquipes();
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao salvar equipe:', error);
        UTILS.showError('Erro ao salvar equipe');
        UTILS.hideLoading();
    }
}

/* ============================================================================
   EDITAR EQUIPE
   ============================================================================ */
async function editarEquipe(id) {
    try {
        UTILS.showLoading();
        
        const equipe = await DB.fetchOne('equipes', { id });
        
        if (!equipe) {
            UTILS.showError('Equipe não encontrada');
            return;
        }
        
        equipeEditando = id;
        
        // Preencher form
        document.getElementById('obra_id').value = equipe.obra_id;
        document.getElementById('nome').value = equipe.nome;
        document.getElementById('gestor').value = equipe.gestor;
        document.getElementById('telefone_gestor').value = equipe.telefone_gestor || '';
        document.getElementById('turno').value = equipe.turno || '';
        document.getElementById('especialidade').value = equipe.especialidade || '';
        document.getElementById('ativo').checked = equipe.ativo;
        document.getElementById('observacoes').value = equipe.observacoes || '';
        
        document.getElementById('modal-titulo').textContent = 'Editar Equipe';
        document.getElementById('modal-equipe').classList.add('show');
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao carregar equipe:', error);
        UTILS.showError('Erro ao carregar equipe');
        UTILS.hideLoading();
    }
}

/* ============================================================================
   DELETAR EQUIPE
   ============================================================================ */
async function deletarEquipe(id, nome) {
    if (!confirm(`Deseja realmente excluir a equipe "${nome}"?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }
    
    try {
        UTILS.showLoading();
        
        await DB.deleteData('equipes', id);
        
        UTILS.showSuccess('Equipe excluída com sucesso!');
        await carregarEquipes();
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao deletar equipe:', error);
        UTILS.showError('Erro ao deletar equipe');
        UTILS.hideLoading();
    }
}

// Exportar funções globais
window.editarEquipe = editarEquipe;
window.deletarEquipe = deletarEquipe;

console.log('✅ Equipes.js carregado');
