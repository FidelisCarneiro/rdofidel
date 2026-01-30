/* ============================================================================
   CADASTRO DE EQUIPAMENTOS - JavaScript (Com Upload de Fotos)
   ============================================================================ */

let equipamentos = [];
let equipamentoEditando = null;
let fotosEquipamento = [];

// Verificar autenticação e carregar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚜 Cadastro de Equipamentos carregando...');
    
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
    setupPhotoUpload();
    await carregarEquipamentos();
    
    console.log('✅ Cadastro de Equipamentos carregado!');
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
    
    // Novo equipamento
    document.getElementById('btn-novo-equipamento')?.addEventListener('click', abrirModalNovo);
    
    // Modal
    document.getElementById('modal-close')?.addEventListener('click', fecharModal);
    document.getElementById('btn-cancelar')?.addEventListener('click', fecharModal);
    
    // Form
    document.getElementById('form-equipamento')?.addEventListener('submit', salvarEquipamento);
    
    // Filtros
    document.getElementById('filtro-busca')?.addEventListener('input', filtrarEquipamentos);
    document.getElementById('filtro-tipo')?.addEventListener('change', filtrarEquipamentos);
    document.getElementById('filtro-status')?.addEventListener('change', filtrarEquipamentos);
}

/* ============================================================================
   UPLOAD DE FOTOS
   ============================================================================ */
function setupPhotoUpload() {
    const uploadArea = document.getElementById('photo-upload-area');
    const photoInput = document.getElementById('photo-input');
    
    // Click na área de upload
    uploadArea.addEventListener('click', () => {
        photoInput.click();
    });
    
    // Seleção de arquivos
    photoInput.addEventListener('change', handlePhotoSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        handlePhotoFiles(files);
    });
}

function handlePhotoSelect(e) {
    const files = e.target.files;
    handlePhotoFiles(files);
}

async function handlePhotoFiles(files) {
    for (let file of files) {
        // Validar tipo
        if (!file.type.startsWith('image/')) {
            alert(`${file.name} não é uma imagem válida`);
            continue;
        }
        
        // Validar tamanho (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert(`${file.name} é muito grande (máx 5MB)`);
            continue;
        }
        
        // Converter para base64
        const base64 = await fileToBase64(file);
        
        // Adicionar à lista
        fotosEquipamento.push({
            name: file.name,
            base64: base64
        });
        
        // Renderizar preview
        renderizarFotos();
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function renderizarFotos() {
    const grid = document.getElementById('photos-grid');
    grid.innerHTML = '';
    
    fotosEquipamento.forEach((foto, index) => {
        const div = document.createElement('div');
        div.className = 'photo-item';
        div.innerHTML = `
            <img src="${foto.base64}" alt="${foto.name}">
            <button class="photo-item-remove" onclick="removerFoto(${index})" type="button">×</button>
        `;
        grid.appendChild(div);
    });
}

function removerFoto(index) {
    fotosEquipamento.splice(index, 1);
    renderizarFotos();
}

/* ============================================================================
   CARREGAR EQUIPAMENTOS
   ============================================================================ */
async function carregarEquipamentos() {
    try {
        UTILS.showLoading();
        
        equipamentos = await DB.fetchData('equipamentos', {}, '*', {
            order: { column: 'created_at', ascending: false }
        });
        
        console.log(`✅ ${equipamentos.length} equipamentos carregados`);
        
        renderizarTabela(equipamentos);
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao carregar equipamentos:', error);
        UTILS.showError('Erro ao carregar equipamentos');
        UTILS.hideLoading();
    }
}

/* ============================================================================
   RENDERIZAR TABELA
   ============================================================================ */
function renderizarTabela(dadosFiltrados) {
    const tbody = document.getElementById('equipamentos-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (dadosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum equipamento cadastrado</td></tr>';
        return;
    }
    
    const statusMap = {
        'disponivel': 'badge-success',
        'em_uso': 'badge-warning',
        'manutencao': 'badge-danger',
        'inativo': 'badge-secondary'
    };
    
    const statusLabel = {
        'disponivel': 'Disponível',
        'em_uso': 'Em Uso',
        'manutencao': 'Manutenção',
        'inativo': 'Inativo'
    };
    
    const tipoLabel = {
        'pesado': 'Pesado',
        'leve': 'Leve',
        'ferramenta': 'Ferramenta'
    };
    
    dadosFiltrados.forEach(eq => {
        const tr = document.createElement('tr');
        
        // Foto
        let fotoHtml = '<span style="font-size: 32px;">🚜</span>';
        if (eq.fotos && eq.fotos.length > 0) {
            const primeiraFoto = eq.fotos[0];
            fotoHtml = `<img src="${primeiraFoto}" alt="${eq.nome}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;">`;
        }
        
        tr.innerHTML = `
            <td>${fotoHtml}</td>
            <td>
                <strong>${eq.nome}</strong>
                ${eq.codigo ? `<br><small>${eq.codigo}</small>` : ''}
            </td>
            <td>${tipoLabel[eq.tipo] || eq.tipo}</td>
            <td>${eq.placa || eq.numero_serie || '-'}</td>
            <td><span class="badge ${statusMap[eq.status]}">${statusLabel[eq.status]}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editarEquipamento('${eq.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deletarEquipamento('${eq.id}', '${eq.nome}')">🗑️</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

/* ============================================================================
   FILTRAR EQUIPAMENTOS
   ============================================================================ */
function filtrarEquipamentos() {
    const busca = document.getElementById('filtro-busca')?.value.toLowerCase() || '';
    const tipo = document.getElementById('filtro-tipo')?.value || '';
    const status = document.getElementById('filtro-status')?.value || '';
    
    let filtrados = equipamentos;
    
    // Filtro de tipo
    if (tipo) {
        filtrados = filtrados.filter(eq => eq.tipo === tipo);
    }
    
    // Filtro de status
    if (status) {
        filtrados = filtrados.filter(eq => eq.status === status);
    }
    
    // Filtro de busca
    if (busca) {
        filtrados = filtrados.filter(eq =>
            eq.nome.toLowerCase().includes(busca) ||
            (eq.codigo && eq.codigo.toLowerCase().includes(busca)) ||
            (eq.placa && eq.placa.toLowerCase().includes(busca))
        );
    }
    
    renderizarTabela(filtrados);
}

/* ============================================================================
   MODAL
   ============================================================================ */
function abrirModalNovo() {
    equipamentoEditando = null;
    document.getElementById('modal-titulo').textContent = 'Novo Equipamento';
    document.getElementById('form-equipamento').reset();
    document.getElementById('status').value = 'disponivel';
    
    // Limpar fotos
    fotosEquipamento = [];
    renderizarFotos();
    
    document.getElementById('modal-equipamento').classList.add('show');
}

function fecharModal() {
    document.getElementById('modal-equipamento').classList.remove('show');
    equipamentoEditando = null;
}

/* ============================================================================
   SALVAR EQUIPAMENTO
   ============================================================================ */
async function salvarEquipamento(e) {
    e.preventDefault();
    
    try {
        const dados = {
            nome: document.getElementById('nome').value,
            codigo: document.getElementById('codigo').value || null,
            tipo: document.getElementById('tipo').value,
            status: document.getElementById('status').value,
            placa: document.getElementById('placa').value || null,
            numero_serie: document.getElementById('numero_serie').value || null,
            marca: document.getElementById('marca').value || null,
            modelo: document.getElementById('modelo').value || null,
            ano_fabricacao: document.getElementById('ano_fabricacao').value || null,
            proprietario: document.getElementById('proprietario').value || null,
            descricao: document.getElementById('descricao').value || null,
            fotos: fotosEquipamento.map(f => f.base64)
        };
        
        UTILS.showLoading();
        
        if (equipamentoEditando) {
            await DB.updateData('equipamentos', equipamentoEditando, dados);
            UTILS.showSuccess('Equipamento atualizado com sucesso!');
        } else {
            await DB.insertData('equipamentos', dados);
            UTILS.showSuccess('Equipamento cadastrado com sucesso!');
        }
        
        fecharModal();
        await carregarEquipamentos();
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao salvar equipamento:', error);
        UTILS.showError('Erro ao salvar equipamento');
        UTILS.hideLoading();
    }
}

/* ============================================================================
   EDITAR EQUIPAMENTO
   ============================================================================ */
async function editarEquipamento(id) {
    try {
        UTILS.showLoading();
        
        const eq = await DB.fetchOne('equipamentos', { id });
        
        if (!eq) {
            UTILS.showError('Equipamento não encontrado');
            return;
        }
        
        equipamentoEditando = id;
        
        // Preencher form
        document.getElementById('nome').value = eq.nome;
        document.getElementById('codigo').value = eq.codigo || '';
        document.getElementById('tipo').value = eq.tipo;
        document.getElementById('status').value = eq.status;
        document.getElementById('placa').value = eq.placa || '';
        document.getElementById('numero_serie').value = eq.numero_serie || '';
        document.getElementById('marca').value = eq.marca || '';
        document.getElementById('modelo').value = eq.modelo || '';
        document.getElementById('ano_fabricacao').value = eq.ano_fabricacao || '';
        document.getElementById('proprietario').value = eq.proprietario || '';
        document.getElementById('descricao').value = eq.descricao || '';
        
        // Carregar fotos
        fotosEquipamento = [];
        if (eq.fotos && Array.isArray(eq.fotos)) {
            eq.fotos.forEach((foto, index) => {
                fotosEquipamento.push({
                    name: `foto-${index}.jpg`,
                    base64: foto
                });
            });
        }
        renderizarFotos();
        
        document.getElementById('modal-titulo').textContent = 'Editar Equipamento';
        document.getElementById('modal-equipamento').classList.add('show');
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao carregar equipamento:', error);
        UTILS.showError('Erro ao carregar equipamento');
        UTILS.hideLoading();
    }
}

/* ============================================================================
   DELETAR EQUIPAMENTO
   ============================================================================ */
async function deletarEquipamento(id, nome) {
    if (!confirm(`Deseja realmente excluir o equipamento "${nome}"?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }
    
    try {
        UTILS.showLoading();
        
        await DB.deleteData('equipamentos', id);
        
        UTILS.showSuccess('Equipamento excluído com sucesso!');
        await carregarEquipamentos();
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao deletar equipamento:', error);
        UTILS.showError('Erro ao deletar equipamento');
        UTILS.hideLoading();
    }
}

// Exportar funções globais
window.editarEquipamento = editarEquipamento;
window.deletarEquipamento = deletarEquipamento;
window.removerFoto = removerFoto;

console.log('✅ Equipamentos.js carregado (Com Upload de Fotos)');
