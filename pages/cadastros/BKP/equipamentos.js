/* ============================================================================
   EQUIPAMENTOS.JS - Cadastro de Equipamentos (CRUD Completo)
   ============================================================================ */

// Variáveis globais
let equipamentos = [];
let equipamentosFiltrados = [];
let equipamentoEditando = null;

// Verificar autenticação e carregar dados
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚜 Cadastro de Equipamentos carregando...');
    
    // Verificar autenticação
    const session = await AUTH.checkAuth();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }
    
    // Configurar event listeners
    setupEventListeners();
    
    // Carregar equipamentos
    await loadEquipamentos();
    
    console.log('✅ Cadastro de Equipamentos carregado!');
});

/* ============================================================================
   CARREGAR EQUIPAMENTOS
   ============================================================================ */
async function loadEquipamentos() {
    try {
        UTILS.showLoading();
        
        equipamentos = await DB.fetchData('equipamentos', {}, '*', {
            order: { column: 'nome', ascending: true }
        });
        
        equipamentosFiltrados = equipamentos;
        
        console.log(`✅ ${equipamentos.length} equipamentos carregados`);
        
        renderEquipamentos();
        
    } catch (error) {
        console.error('Erro ao carregar equipamentos:', error);
        UTILS.showError('Erro ao carregar equipamentos', '#alert-container');
    } finally {
        UTILS.hideLoading();
    }
}

/* ============================================================================
   RENDERIZAR TABELA
   ============================================================================ */
function renderEquipamentos() {
    const tbody = document.getElementById('equipamentos-tbody');
    const totalEquipamentos = document.getElementById('total-equipamentos');
    
    totalEquipamentos.textContent = equipamentosFiltrados.length;
    
    if (equipamentosFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    Nenhum equipamento encontrado.
                    <button class="btn btn-primary btn-sm mt-2" onclick="abrirModal()">
                        ➕ Cadastrar primeiro equipamento
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    equipamentosFiltrados.forEach(equipamento => {
        const tr = document.createElement('tr');
        
        // Status badge
        const statusBadge = equipamento.ativo 
            ? '<span class="badge badge-success">Ativo</span>'
            : '<span class="badge badge-secondary">Inativo</span>';
        
        // Tipo badge
        const tipoBadge = equipamento.tipo === 'proprio'
            ? '<span class="badge badge-info">Próprio</span>'
            : '<span class="badge badge-warning">Locado</span>';
        
        // Marca/Modelo
        const marcaModelo = [equipamento.marca, equipamento.modelo]
            .filter(Boolean)
            .join(' / ') || '-';
        
        tr.innerHTML = `
            <td><strong>${equipamento.nome}</strong></td>
            <td>${marcaModelo}</td>
            <td>${equipamento.placa || '-'}</td>
            <td>${tipoBadge}</td>
            <td>${equipamento.data_aquisicao ? UTILS.formatDateBR(equipamento.data_aquisicao) : '-'}</td>
            <td>${equipamento.valor_locacao_hora ? UTILS.formatCurrency(equipamento.valor_locacao_hora) : '-'}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editarEquipamento('${equipamento.id}')" title="Editar">
                    ✏️
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletarEquipamento('${equipamento.id}')" title="Deletar">
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
    
    // Novo equipamento
    document.getElementById('btn-novo-equipamento').addEventListener('click', () => {
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
    document.getElementById('modal-equipamento').addEventListener('click', (e) => {
        if (e.target.id === 'modal-equipamento') {
            fecharModal();
        }
    });
    
    // Submit form
    document.getElementById('form-equipamento').addEventListener('submit', async (e) => {
        e.preventDefault();
        await salvarEquipamento();
    });
    
    // Busca
    document.getElementById('search-equipamentos').addEventListener('input', () => {
        aplicarFiltros();
    });
    
    // Filtros
    document.getElementById('filter-tipo').addEventListener('change', () => {
        aplicarFiltros();
    });
    
    document.getElementById('filter-status').addEventListener('change', () => {
        aplicarFiltros();
    });
}

/* ============================================================================
   MODAL
   ============================================================================ */
function abrirModal(equipamento = null) {
    const modal = document.getElementById('modal-equipamento');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('form-equipamento');
    
    // Resetar form
    form.reset();
    
    if (equipamento) {
        // Modo edição
        modalTitle.textContent = 'Editar Equipamento';
        equipamentoEditando = equipamento;
        
        // Preencher campos
        document.getElementById('equipamento-id').value = equipamento.id;
        document.getElementById('equipamento-nome').value = equipamento.nome || '';
        document.getElementById('equipamento-marca').value = equipamento.marca || '';
        document.getElementById('equipamento-modelo').value = equipamento.modelo || '';
        document.getElementById('equipamento-placa').value = equipamento.placa || '';
        document.getElementById('equipamento-tipo').value = equipamento.tipo || '';
        document.getElementById('equipamento-data-aquisicao').value = equipamento.data_aquisicao || '';
        document.getElementById('equipamento-valor-locacao').value = equipamento.valor_locacao_hora || '';
        document.getElementById('equipamento-observacoes').value = equipamento.observacoes || '';
        document.getElementById('equipamento-ativo').value = equipamento.ativo ? 'true' : 'false';
        
    } else {
        // Modo criação
        modalTitle.textContent = 'Novo Equipamento';
        equipamentoEditando = null;
        document.getElementById('equipamento-ativo').value = 'true';
    }
    
    // Mostrar modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function fecharModal() {
    const modal = document.getElementById('modal-equipamento');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    equipamentoEditando = null;
}

/* ============================================================================
   SALVAR EQUIPAMENTO
   ============================================================================ */
async function salvarEquipamento() {
    try {
        const dados = {
            nome: document.getElementById('equipamento-nome').value.trim(),
            marca: document.getElementById('equipamento-marca').value.trim() || null,
            modelo: document.getElementById('equipamento-modelo').value.trim() || null,
            placa: document.getElementById('equipamento-placa').value.trim().toUpperCase() || null,
            tipo: document.getElementById('equipamento-tipo').value,
            data_aquisicao: document.getElementById('equipamento-data-aquisicao').value || null,
            valor_locacao_hora: parseFloat(document.getElementById('equipamento-valor-locacao').value) || null,
            observacoes: document.getElementById('equipamento-observacoes').value.trim() || null,
            ativo: document.getElementById('equipamento-ativo').value === 'true'
        };
        
        // Validar
        if (!dados.nome || !dados.tipo) {
            UTILS.showError('Preencha todos os campos obrigatórios', '#alert-container');
            return;
        }
        
        UTILS.showLoading();
        
        if (equipamentoEditando) {
            // Atualizar
            await DB.updateData('equipamentos', equipamentoEditando.id, dados);
            UTILS.showSuccess('Equipamento atualizado com sucesso!', '#alert-container');
        } else {
            // Criar
            await DB.insertData('equipamentos', dados);
            UTILS.showSuccess('Equipamento cadastrado com sucesso!', '#alert-container');
        }
        
        // Recarregar lista
        await loadEquipamentos();
        
        // Fechar modal
        fecharModal();
        
    } catch (error) {
        console.error('Erro ao salvar equipamento:', error);
        UTILS.showError('Erro ao salvar equipamento: ' + error.message, '#alert-container');
    } finally {
        UTILS.hideLoading();
    }
}

/* ============================================================================
   EDITAR EQUIPAMENTO
   ============================================================================ */
async function editarEquipamento(equipamentoId) {
    try {
        const equipamento = equipamentos.find(e => e.id === equipamentoId);
        
        if (!equipamento) {
            UTILS.showError('Equipamento não encontrado');
            return;
        }
        
        abrirModal(equipamento);
        
    } catch (error) {
        console.error('Erro ao editar equipamento:', error);
        UTILS.showError('Erro ao carregar dados do equipamento');
    }
}

/* ============================================================================
   DELETAR EQUIPAMENTO
   ============================================================================ */
async function deletarEquipamento(equipamentoId) {
    try {
        const equipamento = equipamentos.find(e => e.id === equipamentoId);
        
        if (!equipamento) {
            UTILS.showError('Equipamento não encontrado');
            return;
        }
        
        const confirmacao = confirm(
            `Tem certeza que deseja deletar o equipamento "${equipamento.nome}"?\n\n` +
            `ATENÇÃO: Esta ação não pode ser desfeita!`
        );
        
        if (!confirmacao) return;
        
        UTILS.showLoading();
        
        await DB.deleteData('equipamentos', equipamentoId);
        
        UTILS.showSuccess('Equipamento deletado com sucesso!', '#alert-container');
        
        // Recarregar lista
        await loadEquipamentos();
        
    } catch (error) {
        console.error('Erro ao deletar equipamento:', error);
        UTILS.showError('Erro ao deletar equipamento: ' + error.message, '#alert-container');
    } finally {
        UTILS.hideLoading();
    }
}

/* ============================================================================
   FILTROS
   ============================================================================ */
function aplicarFiltros() {
    const termoBusca = document.getElementById('search-equipamentos').value.toLowerCase().trim();
    const tipoFiltro = document.getElementById('filter-tipo').value;
    const statusFiltro = document.getElementById('filter-status').value;
    
    // Começar com todos
    let resultado = equipamentos;
    
    // Filtrar por busca
    if (termoBusca) {
        resultado = resultado.filter(equipamento => {
            return (
                equipamento.nome.toLowerCase().includes(termoBusca) ||
                (equipamento.marca && equipamento.marca.toLowerCase().includes(termoBusca)) ||
                (equipamento.placa && equipamento.placa.toLowerCase().includes(termoBusca))
            );
        });
    }
    
    // Filtrar por tipo
    if (tipoFiltro) {
        resultado = resultado.filter(e => e.tipo === tipoFiltro);
    }
    
    // Filtrar por status
    if (statusFiltro === 'ativo') {
        resultado = resultado.filter(e => e.ativo);
    } else if (statusFiltro === 'inativo') {
        resultado = resultado.filter(e => !e.ativo);
    }
    
    equipamentosFiltrados = resultado;
    renderEquipamentos();
}

// Exportar funções globais
window.editarEquipamento = editarEquipamento;
window.deletarEquipamento = deletarEquipamento;
window.abrirModal = abrirModal;

console.log('✅ Equipamentos.js carregado');
