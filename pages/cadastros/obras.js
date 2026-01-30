/* ============================================================================
   CADASTRO DE OBRAS - JavaScript
   ============================================================================ */

let obras = [];
let obraEditando = null;

// Verificar autenticação e carregar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📋 Cadastro de Obras carregando...');
    
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
    
    console.log('✅ Cadastro de Obras carregado!');
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
    
    // Nova obra
    document.getElementById('btn-nova-obra')?.addEventListener('click', abrirModalNova);
    
    // Modal
    document.getElementById('modal-close')?.addEventListener('click', fecharModal);
    document.getElementById('btn-cancelar')?.addEventListener('click', fecharModal);
    
    // Form
    document.getElementById('form-obra')?.addEventListener('submit', salvarObra);
    
    // Filtros
    document.getElementById('filtro-busca')?.addEventListener('input', filtrarObras);
    document.getElementById('filtro-status')?.addEventListener('change', filtrarObras);
}

/* ============================================================================
   CARREGAR OBRAS
   ============================================================================ */
async function carregarObras() {
    try {
        UTILS.showLoading();
        
        obras = await DB.fetchData('obras', {}, '*', {
            order: { column: 'created_at', ascending: false }
        });
        
        console.log(`✅ ${obras.length} obras carregadas`);
        
        renderizarTabela(obras);
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao carregar obras:', error);
        UTILS.showError('Erro ao carregar obras');
        UTILS.hideLoading();
    }
}

/* ============================================================================
   RENDERIZAR TABELA
   ============================================================================ */
function renderizarTabela(dadosFiltrados) {
    const tbody = document.getElementById('obras-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (dadosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhuma obra cadastrada</td></tr>';
        return;
    }
    
    dadosFiltrados.forEach(obra => {
        const tr = document.createElement('tr');
        
        // Status badge
        const statusMap = {
            'planejamento': 'badge-secondary',
            'em_andamento': 'badge-warning',
            'paralisada': 'badge-danger',
            'concluida': 'badge-success',
            'cancelada': 'badge-danger'
        };
        
        const statusLabel = {
            'planejamento': 'Planejamento',
            'em_andamento': 'Em Andamento',
            'paralisada': 'Paralisada',
            'concluida': 'Concluída',
            'cancelada': 'Cancelada'
        };
        
        tr.innerHTML = `
            <td><strong>${obra.nome}</strong></td>
            <td>${obra.gestor_obra || '-'}</td>
            <td>${obra.numero_contrato || '-'}</td>
            <td>${UTILS.formatDateBR(obra.data_inicio)}</td>
            <td>${obra.data_conclusao_prevista ? UTILS.formatDateBR(obra.data_conclusao_prevista) : '-'}</td>
            <td><span class="badge ${statusMap[obra.status]}">${statusLabel[obra.status]}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editarObra('${obra.id}')">✏️ Editar</button>
                <button class="btn btn-sm btn-danger" onclick="deletarObra('${obra.id}', '${obra.nome}')">🗑️ Excluir</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

/* ============================================================================
   FILTRAR OBRAS
   ============================================================================ */
function filtrarObras() {
    const busca = document.getElementById('filtro-busca')?.value.toLowerCase() || '';
    const status = document.getElementById('filtro-status')?.value || '';
    
    let filtradas = obras;
    
    // Filtro de busca
    if (busca) {
        filtradas = filtradas.filter(obra =>
            obra.nome.toLowerCase().includes(busca) ||
            (obra.gestor_obra && obra.gestor_obra.toLowerCase().includes(busca)) ||
            (obra.numero_contrato && obra.numero_contrato.toLowerCase().includes(busca)) ||
            (obra.cliente && obra.cliente.toLowerCase().includes(busca))
        );
    }
    
    // Filtro de status
    if (status) {
        filtradas = filtradas.filter(obra => obra.status === status);
    }
    
    renderizarTabela(filtradas);
}

/* ============================================================================
   MODAL
   ============================================================================ */
function abrirModalNova() {
    obraEditando = null;
    document.getElementById('modal-titulo').textContent = 'Nova Obra';
    document.getElementById('form-obra').reset();
    document.getElementById('ativo').checked = true;
    document.getElementById('status').value = 'planejamento';
    document.getElementById('modal-obra').classList.add('show');
}

function fecharModal() {
    document.getElementById('modal-obra').classList.remove('show');
    obraEditando = null;
}

/* ============================================================================
   SALVAR OBRA
   ============================================================================ */
async function salvarObra(e) {
    e.preventDefault();
    
    try {
        const dados = {
            nome: document.getElementById('nome').value,
            numero_contrato: document.getElementById('numero_contrato').value || null,
            cliente: document.getElementById('cliente').value,
            contratante: document.getElementById('contratante').value || null,
            gestor_obra: document.getElementById('gestor_obra').value,
            email_gestor: document.getElementById('email_gestor').value || null,
            telefone_gestor: document.getElementById('telefone_gestor').value || null,
            endereco: document.getElementById('endereco').value || null,
            cidade: document.getElementById('cidade').value || null,
            estado: document.getElementById('estado').value || null,
            cep: document.getElementById('cep').value || null,
            data_inicio: document.getElementById('data_inicio').value,
            data_conclusao_prevista: document.getElementById('data_conclusao_prevista').value || null,
            valor_contrato: document.getElementById('valor_contrato').value || null,
            status: document.getElementById('status').value,
            ativo: document.getElementById('ativo').checked,
            observacoes: document.getElementById('observacoes').value || null
        };
        
        UTILS.showLoading();
        
        if (obraEditando) {
            // Atualizar
            await DB.updateData('obras', obraEditando, dados);
            UTILS.showSuccess('Obra atualizada com sucesso!');
        } else {
            // Criar
            await DB.insertData('obras', dados);
            UTILS.showSuccess('Obra cadastrada com sucesso!');
        }
        
        fecharModal();
        await carregarObras();
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao salvar obra:', error);
        UTILS.showError('Erro ao salvar obra');
        UTILS.hideLoading();
    }
}

/* ============================================================================
   EDITAR OBRA
   ============================================================================ */
async function editarObra(id) {
    try {
        UTILS.showLoading();
        
        const obra = await DB.fetchOne('obras', { id });
        
        if (!obra) {
            UTILS.showError('Obra não encontrada');
            return;
        }
        
        obraEditando = id;
        
        // Preencher form
        document.getElementById('nome').value = obra.nome;
        document.getElementById('numero_contrato').value = obra.numero_contrato || '';
        document.getElementById('cliente').value = obra.cliente;
        document.getElementById('contratante').value = obra.contratante || '';
        document.getElementById('gestor_obra').value = obra.gestor_obra;
        document.getElementById('email_gestor').value = obra.email_gestor || '';
        document.getElementById('telefone_gestor').value = obra.telefone_gestor || '';
        document.getElementById('endereco').value = obra.endereco || '';
        document.getElementById('cidade').value = obra.cidade || '';
        document.getElementById('estado').value = obra.estado || '';
        document.getElementById('cep').value = obra.cep || '';
        document.getElementById('data_inicio').value = obra.data_inicio;
        document.getElementById('data_conclusao_prevista').value = obra.data_conclusao_prevista || '';
        document.getElementById('valor_contrato').value = obra.valor_contrato || '';
        document.getElementById('status').value = obra.status;
        document.getElementById('ativo').checked = obra.ativo;
        document.getElementById('observacoes').value = obra.observacoes || '';
        
        document.getElementById('modal-titulo').textContent = 'Editar Obra';
        document.getElementById('modal-obra').classList.add('show');
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao carregar obra:', error);
        UTILS.showError('Erro ao carregar obra');
        UTILS.hideLoading();
    }
}

/* ============================================================================
   DELETAR OBRA
   ============================================================================ */
async function deletarObra(id, nome) {
    if (!confirm(`Deseja realmente excluir a obra "${nome}"?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }
    
    try {
        UTILS.showLoading();
        
        await DB.deleteData('obras', id);
        
        UTILS.showSuccess('Obra excluída com sucesso!');
        await carregarObras();
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao deletar obra:', error);
        UTILS.showError('Erro ao deletar obra');
        UTILS.hideLoading();
    }
}

// Exportar funções globais
window.editarObra = editarObra;
window.deletarObra = deletarObra;

console.log('✅ Obras.js carregado');
