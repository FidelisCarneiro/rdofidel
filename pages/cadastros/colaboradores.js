/* ============================================================================
   COLABORADORES.JS - Cadastro de Colaboradores (CRUD Completo)
   ============================================================================ */

// Variáveis globais
let colaboradores = [];
let colaboradoresFiltrados = [];
let contratadas = [];
let colaboradorEditando = null;

// Verificar autenticação e carregar dados
document.addEventListener('DOMContentLoaded', async () => {
    console.log('👷 Cadastro de Colaboradores carregando...');
    
    // Verificar autenticação
    const session = await AUTH.checkAuth();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }
    
    // Configurar máscaras
    setupMasks();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Carregar contratadas
    await loadContratadas();
    
    // Carregar colaboradores
    await loadColaboradores();
    
    console.log('✅ Cadastro de Colaboradores carregado!');
});

/* ============================================================================
   MÁSCARAS DE FORMATAÇÃO
   ============================================================================ */
function setupMasks() {
    const cpfInput = document.getElementById('colaborador-cpf');
    const telefoneInput = document.getElementById('colaborador-telefone');
    
    // Máscara CPF
    cpfInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length <= 11) {
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
        
        e.target.value = value;
    });
    
    // Máscara Telefone
    telefoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length <= 11) {
            value = value.replace(/(\d{2})(\d)/, '($1) $2');
            value = value.replace(/(\d{5})(\d)/, '$1-$2');
        }
        
        e.target.value = value;
    });
}

/* ============================================================================
   CARREGAR CONTRATADAS
   ============================================================================ */
async function loadContratadas() {
    try {
        contratadas = await DB.fetchData('contratadas', { ativo: true }, '*', {
            order: { column: 'nome', ascending: true }
        });
        
        // Preencher select
        const select = document.getElementById('colaborador-contratada');
        const filterSelect = document.getElementById('filter-contratada');
        
        contratadas.forEach(contratada => {
            // Select do formulário
            const option = document.createElement('option');
            option.value = contratada.id;
            option.textContent = contratada.nome;
            select.appendChild(option);
            
            // Select do filtro
            const filterOption = document.createElement('option');
            filterOption.value = contratada.id;
            filterOption.textContent = contratada.nome;
            filterSelect.appendChild(filterOption);
        });
        
        console.log(`✅ ${contratadas.length} contratadas carregadas`);
        
    } catch (error) {
        console.error('Erro ao carregar contratadas:', error);
    }
}

/* ============================================================================
   CARREGAR COLABORADORES
   ============================================================================ */
async function loadColaboradores() {
    try {
        UTILS.showLoading();
        
        colaboradores = await DB.fetchData('colaboradores', {}, '*', {
            order: { column: 'nome', ascending: true }
        });
        
        colaboradoresFiltrados = colaboradores;
        
        console.log(`✅ ${colaboradores.length} colaboradores carregados`);
        
        renderColaboradores();
        
    } catch (error) {
        console.error('Erro ao carregar colaboradores:', error);
        UTILS.showError('Erro ao carregar colaboradores', '#alert-container');
    } finally {
        UTILS.hideLoading();
    }
}

/* ============================================================================
   RENDERIZAR TABELA
   ============================================================================ */
function renderColaboradores() {
    const tbody = document.getElementById('colaboradores-tbody');
    const totalColaboradores = document.getElementById('total-colaboradores');
    
    totalColaboradores.textContent = colaboradoresFiltrados.length;
    
    if (colaboradoresFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    Nenhum colaborador encontrado.
                    <button class="btn btn-primary btn-sm mt-2" onclick="abrirModal()">
                        ➕ Cadastrar primeiro colaborador
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    colaboradoresFiltrados.forEach(colaborador => {
        const tr = document.createElement('tr');
        
        // Status badge
        const statusBadge = colaborador.ativo 
            ? '<span class="badge badge-success">Ativo</span>'
            : '<span class="badge badge-secondary">Inativo</span>';
        
        // Nome da contratada
        const contratadaNome = colaborador.contratada_id 
            ? (contratadas.find(c => c.id === colaborador.contratada_id)?.nome || 'N/A')
            : 'Próprio';
        
        tr.innerHTML = `
            <td><strong>${colaborador.nome}</strong></td>
            <td>${colaborador.funcao}</td>
            <td>${UTILS.formatCPF(colaborador.cpf)}</td>
            <td>${colaborador.telefone ? UTILS.formatPhone(colaborador.telefone) : '-'}</td>
            <td>${contratadaNome}</td>
            <td>${colaborador.nfc_id || '-'}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editarColaborador('${colaborador.id}')" title="Editar">
                    ✏️
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletarColaborador('${colaborador.id}')" title="Deletar">
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
    
    // Novo colaborador
    document.getElementById('btn-novo-colaborador').addEventListener('click', () => {
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
    document.getElementById('modal-colaborador').addEventListener('click', (e) => {
        if (e.target.id === 'modal-colaborador') {
            fecharModal();
        }
    });
    
    // Submit form
    document.getElementById('form-colaborador').addEventListener('submit', async (e) => {
        e.preventDefault();
        await salvarColaborador();
    });
    
    // Busca
    document.getElementById('search-colaboradores').addEventListener('input', (e) => {
        filtrarColaboradores(e.target.value);
    });
    
    // Filtro de contratada
    document.getElementById('filter-contratada').addEventListener('change', () => {
        aplicarFiltros();
    });
    
    // Filtro de status
    document.getElementById('filter-status').addEventListener('change', () => {
        aplicarFiltros();
    });
}

/* ============================================================================
   MODAL
   ============================================================================ */
function abrirModal(colaborador = null) {
    const modal = document.getElementById('modal-colaborador');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('form-colaborador');
    
    // Resetar form
    form.reset();
    
    if (colaborador) {
        // Modo edição
        modalTitle.textContent = 'Editar Colaborador';
        colaboradorEditando = colaborador;
        
        // Preencher campos
        document.getElementById('colaborador-id').value = colaborador.id;
        document.getElementById('colaborador-nome').value = colaborador.nome || '';
        document.getElementById('colaborador-funcao').value = colaborador.funcao || '';
        document.getElementById('colaborador-cpf').value = UTILS.formatCPF(colaborador.cpf || '');
        document.getElementById('colaborador-telefone').value = colaborador.telefone ? UTILS.formatPhone(colaborador.telefone) : '';
        document.getElementById('colaborador-contratada').value = colaborador.contratada_id || '';
        document.getElementById('colaborador-nfc-id').value = colaborador.nfc_id || '';
        document.getElementById('colaborador-email').value = colaborador.email || '';
        document.getElementById('colaborador-observacoes').value = colaborador.observacoes || '';
        document.getElementById('colaborador-ativo').value = colaborador.ativo ? 'true' : 'false';
        
    } else {
        // Modo criação
        modalTitle.textContent = 'Novo Colaborador';
        colaboradorEditando = null;
        document.getElementById('colaborador-ativo').value = 'true';
    }
    
    // Mostrar modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function fecharModal() {
    const modal = document.getElementById('modal-colaborador');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    colaboradorEditando = null;
}

/* ============================================================================
   SALVAR COLABORADOR
   ============================================================================ */
async function salvarColaborador() {
    try {
        // Obter dados do form
        const cpf = document.getElementById('colaborador-cpf').value.replace(/\D/g, '');
        const telefone = document.getElementById('colaborador-telefone').value.replace(/\D/g, '');
        const contratadaId = document.getElementById('colaborador-contratada').value;
        
        const dados = {
            nome: document.getElementById('colaborador-nome').value.trim(),
            funcao: document.getElementById('colaborador-funcao').value.trim(),
            cpf: cpf,
            telefone: telefone || null,
            contratada_id: contratadaId || null,
            nfc_id: document.getElementById('colaborador-nfc-id').value.trim() || null,
            email: document.getElementById('colaborador-email').value.trim() || null,
            observacoes: document.getElementById('colaborador-observacoes').value.trim() || null,
            ativo: document.getElementById('colaborador-ativo').value === 'true'
        };
        
        // Validar
        if (!dados.nome || !dados.funcao || !dados.cpf) {
            UTILS.showError('Preencha todos os campos obrigatórios', '#alert-container');
            return;
        }
        
        // Validar CPF
        if (!UTILS.isValidCPF(dados.cpf)) {
            UTILS.showError('CPF inválido', '#alert-container');
            return;
        }
        
        UTILS.showLoading();
        
        if (colaboradorEditando) {
            // Atualizar
            await DB.updateData('colaboradores', colaboradorEditando.id, dados);
            UTILS.showSuccess('Colaborador atualizado com sucesso!', '#alert-container');
        } else {
            // Criar
            await DB.insertData('colaboradores', dados);
            UTILS.showSuccess('Colaborador cadastrado com sucesso!', '#alert-container');
        }
        
        // Recarregar lista
        await loadColaboradores();
        
        // Fechar modal
        fecharModal();
        
    } catch (error) {
        console.error('Erro ao salvar colaborador:', error);
        
        // Verificar se é erro de CPF duplicado
        if (error.message && error.message.includes('duplicate') && error.message.includes('cpf')) {
            UTILS.showError('Este CPF já está cadastrado!', '#alert-container');
        } else {
            UTILS.showError('Erro ao salvar colaborador: ' + error.message, '#alert-container');
        }
    } finally {
        UTILS.hideLoading();
    }
}

/* ============================================================================
   EDITAR COLABORADOR
   ============================================================================ */
async function editarColaborador(colaboradorId) {
    try {
        const colaborador = colaboradores.find(c => c.id === colaboradorId);
        
        if (!colaborador) {
            UTILS.showError('Colaborador não encontrado');
            return;
        }
        
        abrirModal(colaborador);
        
    } catch (error) {
        console.error('Erro ao editar colaborador:', error);
        UTILS.showError('Erro ao carregar dados do colaborador');
    }
}

/* ============================================================================
   DELETAR COLABORADOR
   ============================================================================ */
async function deletarColaborador(colaboradorId) {
    try {
        const colaborador = colaboradores.find(c => c.id === colaboradorId);
        
        if (!colaborador) {
            UTILS.showError('Colaborador não encontrado');
            return;
        }
        
        const confirmacao = confirm(
            `Tem certeza que deseja deletar o colaborador "${colaborador.nome}"?\n\n` +
            `ATENÇÃO: Esta ação não pode ser desfeita!`
        );
        
        if (!confirmacao) return;
        
        UTILS.showLoading();
        
        await DB.deleteData('colaboradores', colaboradorId);
        
        UTILS.showSuccess('Colaborador deletado com sucesso!', '#alert-container');
        
        // Recarregar lista
        await loadColaboradores();
        
    } catch (error) {
        console.error('Erro ao deletar colaborador:', error);
        UTILS.showError('Erro ao deletar colaborador: ' + error.message, '#alert-container');
    } finally {
        UTILS.hideLoading();
    }
}

/* ============================================================================
   FILTROS
   ============================================================================ */
function filtrarColaboradores(termo) {
    termo = termo.toLowerCase().trim();
    
    colaboradoresFiltrados = colaboradores;
    
    if (termo) {
        colaboradoresFiltrados = colaboradoresFiltrados.filter(colaborador => {
            const cpfLimpo = colaborador.cpf.replace(/\D/g, '');
            return (
                colaborador.nome.toLowerCase().includes(termo) ||
                colaborador.funcao.toLowerCase().includes(termo) ||
                cpfLimpo.includes(termo.replace(/\D/g, ''))
            );
        });
    }
    
    // Aplicar outros filtros
    aplicarFiltros();
}

function aplicarFiltros() {
    const termoBusca = document.getElementById('search-colaboradores').value.toLowerCase().trim();
    const contratadaFiltro = document.getElementById('filter-contratada').value;
    const statusFiltro = document.getElementById('filter-status').value;
    
    // Começar com todos
    let resultado = colaboradores;
    
    // Filtrar por busca
    if (termoBusca) {
        resultado = resultado.filter(colaborador => {
            const cpfLimpo = colaborador.cpf.replace(/\D/g, '');
            return (
                colaborador.nome.toLowerCase().includes(termoBusca) ||
                colaborador.funcao.toLowerCase().includes(termoBusca) ||
                cpfLimpo.includes(termoBusca.replace(/\D/g, ''))
            );
        });
    }
    
    // Filtrar por contratada
    if (contratadaFiltro) {
        if (contratadaFiltro === 'proprio') {
            resultado = resultado.filter(c => !c.contratada_id);
        } else {
            resultado = resultado.filter(c => c.contratada_id === contratadaFiltro);
        }
    }
    
    // Filtrar por status
    if (statusFiltro === 'ativo') {
        resultado = resultado.filter(c => c.ativo);
    } else if (statusFiltro === 'inativo') {
        resultado = resultado.filter(c => !c.ativo);
    }
    
    colaboradoresFiltrados = resultado;
    renderColaboradores();
}

// Exportar funções globais
window.editarColaborador = editarColaborador;
window.deletarColaborador = deletarColaborador;
window.abrirModal = abrirModal;

console.log('✅ Colaboradores.js carregado');
