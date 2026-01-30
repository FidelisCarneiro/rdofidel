/* ============================================================================
   OBRAS.JS - Cadastro de Obras (CRUD Completo)
   ============================================================================ */

// Variáveis globais
let obras = [];
let obrasFiltradas = [];
let obraEditando = null;

// Verificar autenticação e carregar dados
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏗️ Cadastro de Obras carregando...');
    
    // Verificar autenticação
    const session = await AUTH.checkAuth();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }
    
    // Configurar event listeners
    setupEventListeners();
    
    // Carregar obras
    await loadObras();
    
    console.log('✅ Cadastro de Obras carregado!');
});

/* ============================================================================
   CARREGAR OBRAS
   ============================================================================ */
async function loadObras() {
    try {
        UTILS.showLoading();
        
        obras = await DB.fetchData('obras', {}, '*', {
            order: { column: 'nome', ascending: true }
        });
        
        obrasFiltradas = obras;
        
        console.log(`✅ ${obras.length} obras carregadas`);
        
        renderObras();
        
    } catch (error) {
        console.error('Erro ao carregar obras:', error);
        UTILS.showError('Erro ao carregar obras', '#alert-container');
    } finally {
        UTILS.hideLoading();
    }
}

/* ============================================================================
   RENDERIZAR TABELA
   ============================================================================ */
function renderObras() {
    const tbody = document.getElementById('obras-tbody');
    const totalObras = document.getElementById('total-obras');
    
    totalObras.textContent = obrasFiltradas.length;
    
    if (obrasFiltradas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    Nenhuma obra encontrada.
                    <button class="btn btn-primary btn-sm mt-2" onclick="abrirModal()">
                        ➕ Cadastrar primeira obra
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    obrasFiltradas.forEach(obra => {
        const tr = document.createElement('tr');
        
        // Status badge
        const statusBadge = obra.ativo 
            ? '<span class="badge badge-success">Ativo</span>'
            : '<span class="badge badge-secondary">Inativo</span>';
        
        tr.innerHTML = `
            <td>
                <strong>${obra.nome}</strong>
                ${obra.escopo ? `<br><small class="text-muted">${obra.escopo.substring(0, 50)}...</small>` : ''}
            </td>
            <td>${obra.gestor}</td>
            <td>${obra.numero_contrato || '-'}</td>
            <td>${UTILS.formatDateBR(obra.data_inicio)}</td>
            <td>${obra.data_previsao_conclusao ? UTILS.formatDateBR(obra.data_previsao_conclusao) : '-'}</td>
            <td>${obra.valor ? UTILS.formatCurrency(obra.valor) : '-'}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editarObra('${obra.id}')" title="Editar">
                    ✏️
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletarObra('${obra.id}')" title="Deletar">
                    🗑️
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
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
    
    // Nova obra
    document.getElementById('btn-nova-obra').addEventListener('click', () => {
        abrirModal();
    });
    
    // Fechar modal
    document.getElementById('btn-close-modal').addEventListener('click', () => {
        fecharModal();
    });
    
    document.getElementById('btn-cancel').addEventListener('click', () => {
        fecharModal();
    });
    
    // Fechar modal ao clicar fora
    document.getElementById('modal-obra').addEventListener('click', (e) => {
        if (e.target.id === 'modal-obra') {
            fecharModal();
        }
    });
    
    // Submit form
    document.getElementById('form-obra').addEventListener('submit', async (e) => {
        e.preventDefault();
        await salvarObra();
    });
    
    // Busca
    document.getElementById('search-obras').addEventListener('input', (e) => {
        filtrarObras(e.target.value);
    });
    
    // Filtro de status
    document.getElementById('filter-status').addEventListener('change', (e) => {
        filtrarPorStatus(e.target.value);
    });
}

/* ============================================================================
   MODAL
   ============================================================================ */
function abrirModal(obra = null) {
    const modal = document.getElementById('modal-obra');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('form-obra');
    
    // Resetar form
    form.reset();
    
    if (obra) {
        // Modo edição
        modalTitle.textContent = 'Editar Obra';
        obraEditando = obra;
        
        // Preencher campos
        document.getElementById('obra-id').value = obra.id;
        document.getElementById('obra-nome').value = obra.nome || '';
        document.getElementById('obra-gestor').value = obra.gestor || '';
        document.getElementById('obra-numero-contrato').value = obra.numero_contrato || '';
        document.getElementById('obra-escopo').value = obra.escopo || '';
        document.getElementById('obra-data-inicio').value = obra.data_inicio || '';
        document.getElementById('obra-data-assinatura').value = obra.data_assinatura || '';
        document.getElementById('obra-data-conclusao').value = obra.data_previsao_conclusao || '';
        document.getElementById('obra-valor').value = obra.valor || '';
        document.getElementById('obra-responsavel-tecnico').value = obra.responsavel_tecnico || '';
        document.getElementById('obra-numero-art').value = obra.numero_art || '';
        document.getElementById('obra-endereco').value = obra.endereco || '';
        document.getElementById('obra-latitude').value = obra.latitude || '';
        document.getElementById('obra-longitude').value = obra.longitude || '';
        document.getElementById('obra-ativo').value = obra.ativo ? 'true' : 'false';
        
    } else {
        // Modo criação
        modalTitle.textContent = 'Nova Obra';
        obraEditando = null;
        document.getElementById('obra-ativo').value = 'true';
    }
    
    // Mostrar modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function fecharModal() {
    const modal = document.getElementById('modal-obra');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    obraEditando = null;
}

/* ============================================================================
   SALVAR OBRA
   ============================================================================ */
async function salvarObra() {
    try {
        // Obter dados do form
        const dados = {
            nome: document.getElementById('obra-nome').value.trim(),
            gestor: document.getElementById('obra-gestor').value.trim(),
            numero_contrato: document.getElementById('obra-numero-contrato').value.trim() || null,
            escopo: document.getElementById('obra-escopo').value.trim() || null,
            data_inicio: document.getElementById('obra-data-inicio').value || null,
            data_assinatura: document.getElementById('obra-data-assinatura').value || null,
            data_previsao_conclusao: document.getElementById('obra-data-conclusao').value || null,
            valor: parseFloat(document.getElementById('obra-valor').value) || null,
            responsavel_tecnico: document.getElementById('obra-responsavel-tecnico').value.trim() || null,
            numero_art: document.getElementById('obra-numero-art').value.trim() || null,
            endereco: document.getElementById('obra-endereco').value.trim() || null,
            latitude: parseFloat(document.getElementById('obra-latitude').value) || null,
            longitude: parseFloat(document.getElementById('obra-longitude').value) || null,
            ativo: document.getElementById('obra-ativo').value === 'true'
        };
        
        // Validar
        if (!dados.nome || !dados.gestor || !dados.data_inicio) {
            UTILS.showError('Preencha todos os campos obrigatórios', '#alert-container');
            return;
        }
        
        UTILS.showLoading();
        
        if (obraEditando) {
            // Atualizar
            await DB.updateData('obras', obraEditando.id, dados);
            UTILS.showSuccess('Obra atualizada com sucesso!', '#alert-container');
        } else {
            // Criar
            await DB.insertData('obras', dados);
            UTILS.showSuccess('Obra cadastrada com sucesso!', '#alert-container');
        }
        
        // Recarregar lista
        await loadObras();
        
        // Fechar modal
        fecharModal();
        
    } catch (error) {
        console.error('Erro ao salvar obra:', error);
        UTILS.showError('Erro ao salvar obra: ' + error.message, '#alert-container');
    } finally {
        UTILS.hideLoading();
    }
}

/* ============================================================================
   EDITAR OBRA
   ============================================================================ */
async function editarObra(obraId) {
    try {
        const obra = obras.find(o => o.id === obraId);
        
        if (!obra) {
            UTILS.showError('Obra não encontrada');
            return;
        }
        
        abrirModal(obra);
        
    } catch (error) {
        console.error('Erro ao editar obra:', error);
        UTILS.showError('Erro ao carregar dados da obra');
    }
}

/* ============================================================================
   DELETAR OBRA
   ============================================================================ */
async function deletarObra(obraId) {
    try {
        const obra = obras.find(o => o.id === obraId);
        
        if (!obra) {
            UTILS.showError('Obra não encontrada');
            return;
        }
        
        const confirmacao = confirm(
            `Tem certeza que deseja deletar a obra "${obra.nome}"?\n\n` +
            `ATENÇÃO: Esta ação não pode ser desfeita!`
        );
        
        if (!confirmacao) return;
        
        UTILS.showLoading();
        
        await DB.deleteData('obras', obraId);
        
        UTILS.showSuccess('Obra deletada com sucesso!', '#alert-container');
        
        // Recarregar lista
        await loadObras();
        
    } catch (error) {
        console.error('Erro ao deletar obra:', error);
        UTILS.showError('Erro ao deletar obra: ' + error.message, '#alert-container');
    } finally {
        UTILS.hideLoading();
    }
}

/* ============================================================================
   FILTROS
   ============================================================================ */
function filtrarObras(termo) {
    termo = termo.toLowerCase().trim();
    
    if (!termo) {
        obrasFiltradas = obras;
    } else {
        obrasFiltradas = obras.filter(obra => {
            return (
                obra.nome.toLowerCase().includes(termo) ||
                obra.gestor.toLowerCase().includes(termo) ||
                (obra.numero_contrato && obra.numero_contrato.toLowerCase().includes(termo))
            );
        });
    }
    
    // Aplicar filtro de status também
    const statusFiltro = document.getElementById('filter-status').value;
    if (statusFiltro) {
        filtrarPorStatus(statusFiltro);
    } else {
        renderObras();
    }
}

function filtrarPorStatus(status) {
    const termoBusca = document.getElementById('search-obras').value.toLowerCase().trim();
    
    // Começar com todas as obras ou obras já filtradas por busca
    let obrasParaFiltrar = termoBusca 
        ? obras.filter(obra => {
            return (
                obra.nome.toLowerCase().includes(termoBusca) ||
                obra.gestor.toLowerCase().includes(termoBusca) ||
                (obra.numero_contrato && obra.numero_contrato.toLowerCase().includes(termoBusca))
            );
        })
        : obras;
    
    if (status === 'ativo') {
        obrasFiltradas = obrasParaFiltrar.filter(obra => obra.ativo);
    } else if (status === 'inativo') {
        obrasFiltradas = obrasParaFiltrar.filter(obra => !obra.ativo);
    } else {
        obrasFiltradas = obrasParaFiltrar;
    }
    
    renderObras();
}

// Exportar funções globais
window.editarObra = editarObra;
window.deletarObra = deletarObra;
window.abrirModal = abrirModal;

console.log('✅ Obras.js carregado');
