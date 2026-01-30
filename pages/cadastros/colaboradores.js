/* ============================================================================
   CADASTRO DE COLABORADORES - JavaScript (Com Facial, NFC e Assinatura)
   ============================================================================ */

let colaboradores = [];
let colaboradorEditando = null;
let stream = null;
let signaturePad = null;

// Verificar autenticação e carregar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('👷 Cadastro de Colaboradores carregando...');
    
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
    setupTabs();
    setupSignaturePad();
    await carregarColaboradores();
    
    console.log('✅ Cadastro de Colaboradores carregado!');
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
    
    // Novo colaborador
    document.getElementById('btn-novo-colaborador')?.addEventListener('click', abrirModalNovo);
    
    // Modal
    document.getElementById('modal-close')?.addEventListener('click', fecharModal);
    document.getElementById('btn-cancelar')?.addEventListener('click', fecharModal);
    
    // Form
    document.getElementById('form-colaborador')?.addEventListener('submit', salvarColaborador);
    
    // Filtros
    document.getElementById('filtro-busca')?.addEventListener('input', filtrarColaboradores);
    document.getElementById('filtro-funcao')?.addEventListener('change', filtrarColaboradores);
    document.getElementById('filtro-ativo')?.addEventListener('change', filtrarColaboradores);
    
    // Câmera
    document.getElementById('btn-iniciar-camera')?.addEventListener('click', iniciarCamera);
    document.getElementById('btn-parar-camera')?.addEventListener('click', pararCamera);
    document.getElementById('btn-capturar-foto')?.addEventListener('click', capturarFoto);
    document.getElementById('btn-remover-foto')?.addEventListener('click', removerFoto);
    
    // NFC
    document.getElementById('btn-ler-nfc')?.addEventListener('click', lerNFC);
    
    // Assinatura
    document.getElementById('btn-salvar-assinatura')?.addEventListener('click', salvarAssinatura);
    document.getElementById('btn-limpar-assinatura')?.addEventListener('click', limparAssinatura);
}

/* ============================================================================
   TABS
   ============================================================================ */
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // Remover active de todos
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Adicionar active no clicado
            button.classList.add('active');
            document.querySelector(`.tab-content[data-tab="${tabName}"]`)?.classList.add('active');
        });
    });
}

/* ============================================================================
   CARREGAR COLABORADORES
   ============================================================================ */
async function carregarColaboradores() {
    try {
        UTILS.showLoading();
        
        colaboradores = await DB.fetchData('colaboradores', {}, '*', {
            order: { column: 'created_at', ascending: false }
        });
        
        console.log(`✅ ${colaboradores.length} colaboradores carregados`);
        
        renderizarTabela(colaboradores);
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao carregar colaboradores:', error);
        UTILS.showError('Erro ao carregar colaboradores');
        UTILS.hideLoading();
    }
}

/* ============================================================================
   RENDERIZAR TABELA
   ============================================================================ */
function renderizarTabela(dadosFiltrados) {
    const tbody = document.getElementById('colaboradores-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (dadosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Nenhum colaborador cadastrado</td></tr>';
        return;
    }
    
    dadosFiltrados.forEach(colab => {
        const tr = document.createElement('tr');
        
        // Foto
        const fotoHtml = colab.foto_url ? 
            `<img src="${colab.foto_url}" alt="${colab.nome}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` :
            '<span style="font-size: 32px;">👤</span>';
        
        // Recursos (ícones de foto, NFC, assinatura)
        const recursos = [];
        if (colab.foto_url) recursos.push('📸');
        if (colab.nfc_tag_id) recursos.push('📱');
        if (colab.assinatura_url) recursos.push('✍️');
        const recursosHtml = recursos.length > 0 ? recursos.join(' ') : '-';
        
        // Status
        const statusBadge = colab.ativo ? 
            '<span class="badge badge-success">Ativo</span>' : 
            '<span class="badge badge-secondary">Inativo</span>';
        
        tr.innerHTML = `
            <td>${fotoHtml}</td>
            <td><strong>${colab.nome}</strong>${colab.matricula ? `<br><small>${colab.matricula}</small>` : ''}</td>
            <td>${formatarCPF(colab.cpf)}</td>
            <td>${capitalizar(colab.funcao)}</td>
            <td>${colab.telefone || '-'}</td>
            <td>${recursosHtml}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editarColaborador('${colab.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deletarColaborador('${colab.id}', '${colab.nome}')">🗑️</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

/* ============================================================================
   FILTRAR COLABORADORES
   ============================================================================ */
function filtrarColaboradores() {
    const busca = document.getElementById('filtro-busca')?.value.toLowerCase() || '';
    const funcao = document.getElementById('filtro-funcao')?.value || '';
    const ativo = document.getElementById('filtro-ativo')?.value || '';
    
    let filtrados = colaboradores;
    
    // Filtro de função
    if (funcao) {
        filtrados = filtrados.filter(c => c.funcao === funcao);
    }
    
    // Filtro de status
    if (ativo) {
        const isAtivo = ativo === 'true';
        filtrados = filtrados.filter(c => c.ativo === isAtivo);
    }
    
    // Filtro de busca
    if (busca) {
        filtrados = filtrados.filter(c =>
            c.nome.toLowerCase().includes(busca) ||
            (c.cpf && c.cpf.includes(busca)) ||
            (c.matricula && c.matricula.toLowerCase().includes(busca))
        );
    }
    
    renderizarTabela(filtrados);
}

/* ============================================================================
   MODAL
   ============================================================================ */
function abrirModalNovo() {
    colaboradorEditando = null;
    document.getElementById('modal-titulo').textContent = 'Novo Colaborador';
    document.getElementById('form-colaborador').reset();
    document.getElementById('ativo').checked = true;
    
    // Limpar foto, NFC e assinatura
    removerFoto();
    document.getElementById('nfc_tag_id').value = '';
    document.getElementById('nfc-status').innerHTML = '';
    limparAssinatura();
    
    // Voltar para primeira aba
    document.querySelector('.tab-button[data-tab="dados"]')?.click();
    
    document.getElementById('modal-colaborador').classList.add('show');
}

function fecharModal() {
    document.getElementById('modal-colaborador').classList.remove('show');
    pararCamera();
    colaboradorEditando = null;
}

/* ============================================================================
   CÂMERA E FOTO FACIAL
   ============================================================================ */
async function iniciarCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            } 
        });
        
        const video = document.getElementById('video');
        video.srcObject = stream;
        
        document.getElementById('camera-container').style.display = 'block';
        document.getElementById('btn-iniciar-camera').style.display = 'none';
        
        console.log('✅ Câmera iniciada');
        
    } catch (error) {
        console.error('Erro ao iniciar câmera:', error);
        alert('Erro ao acessar câmera. Verifique as permissões.');
    }
}

function pararCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        
        document.getElementById('camera-container').style.display = 'none';
        document.getElementById('btn-iniciar-camera').style.display = 'inline-block';
        
        console.log('✅ Câmera parada');
    }
}

function capturarFoto() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const preview = document.getElementById('photo-preview');
    
    // Configurar canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Capturar frame
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // Converter para base64
    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
    
    // Mostrar preview
    preview.src = dataURL;
    preview.classList.add('show');
    document.getElementById('foto_base64').value = dataURL;
    document.getElementById('btn-remover-foto').style.display = 'inline-block';
    
    // Parar câmera
    pararCamera();
    
    console.log('✅ Foto capturada');
    UTILS.showSuccess('Foto capturada com sucesso!');
}

function removerFoto() {
    const preview = document.getElementById('photo-preview');
    preview.src = '';
    preview.classList.remove('show');
    document.getElementById('foto_base64').value = '';
    document.getElementById('btn-remover-foto').style.display = 'none';
    
    console.log('✅ Foto removida');
}

/* ============================================================================
   NFC
   ============================================================================ */
async function lerNFC() {
    const statusDiv = document.getElementById('nfc-status');
    
    // Verificar se NFC está disponível
    if ('NDEFReader' in window) {
        try {
            statusDiv.innerHTML = '<div class="nfc-status waiting">📱 Aproxime a tag NFC...</div>';
            
            const ndef = new NDEFReader();
            await ndef.scan();
            
            ndef.addEventListener('reading', ({ serialNumber }) => {
                const tagId = serialNumber.replace(/:/g, '');
                document.getElementById('nfc_tag_id').value = tagId;
                statusDiv.innerHTML = '<div class="nfc-status success">✅ Tag NFC lida com sucesso!</div>';
                
                console.log('✅ NFC lido:', tagId);
                UTILS.showSuccess('Tag NFC registrada!');
            });
            
        } catch (error) {
            console.error('Erro ao ler NFC:', error);
            statusDiv.innerHTML = '<div class="nfc-status">❌ Erro ao ler NFC. Verifique as permissões.</div>';
        }
    } else {
        // NFC não disponível - permitir entrada manual
        statusDiv.innerHTML = '<div class="nfc-status">ℹ️ NFC não disponível neste dispositivo. Digite o ID manualmente.</div>';
    }
}

/* ============================================================================
   ASSINATURA DIGITAL
   ============================================================================ */
function setupSignaturePad() {
    const canvas = document.getElementById('signature-pad');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    
    // Configurar estilo
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', stopDrawing);
    
    function startDrawing(e) {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        lastX = e.clientX - rect.left;
        lastY = e.clientY - rect.top;
    }
    
    function draw(e) {
        if (!isDrawing) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        lastX = x;
        lastY = y;
    }
    
    function stopDrawing() {
        isDrawing = false;
    }
    
    function handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        lastX = touch.clientX - rect.left;
        lastY = touch.clientY - rect.top;
        isDrawing = true;
    }
    
    function handleTouchMove(e) {
        if (!isDrawing) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        lastX = x;
        lastY = y;
    }
    
    signaturePad = { canvas, ctx };
}

function limparAssinatura() {
    if (!signaturePad) return;
    
    const { canvas, ctx } = signaturePad;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    document.getElementById('signature-preview').classList.remove('show');
    document.getElementById('assinatura_base64').value = '';
    
    console.log('✅ Assinatura limpa');
}

function salvarAssinatura() {
    if (!signaturePad) return;
    
    const canvas = signaturePad.canvas;
    
    // Converter para base64
    const dataURL = canvas.toDataURL('image/png');
    
    // Mostrar preview
    const preview = document.getElementById('signature-preview');
    preview.src = dataURL;
    preview.classList.add('show');
    document.getElementById('assinatura_base64').value = dataURL;
    
    console.log('✅ Assinatura salva');
    UTILS.showSuccess('Assinatura capturada com sucesso!');
}

/* ============================================================================
   SALVAR COLABORADOR
   ============================================================================ */
async function salvarColaborador(e) {
    e.preventDefault();
    
    try {
        const dados = {
            nome: document.getElementById('nome').value,
            matricula: document.getElementById('matricula').value || null,
            cpf: document.getElementById('cpf').value,
            rg: document.getElementById('rg').value || null,
            data_nascimento: document.getElementById('data_nascimento').value || null,
            telefone: document.getElementById('telefone').value || null,
            email: document.getElementById('email').value || null,
            funcao: document.getElementById('funcao').value,
            contratada_id: document.getElementById('contratada_id').value || null,
            data_admissao: document.getElementById('data_admissao').value || null,
            salario: document.getElementById('salario').value || null,
            ativo: document.getElementById('ativo').checked,
            foto_base64: document.getElementById('foto_base64').value || null,
            nfc_tag_id: document.getElementById('nfc_tag_id').value || null,
            assinatura_base64: document.getElementById('assinatura_base64').value || null
        };
        
        UTILS.showLoading();
        
        if (colaboradorEditando) {
            await DB.updateData('colaboradores', colaboradorEditando, dados);
            UTILS.showSuccess('Colaborador atualizado com sucesso!');
        } else {
            await DB.insertData('colaboradores', dados);
            UTILS.showSuccess('Colaborador cadastrado com sucesso!');
        }
        
        fecharModal();
        await carregarColaboradores();
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao salvar colaborador:', error);
        UTILS.showError('Erro ao salvar colaborador');
        UTILS.hideLoading();
    }
}

/* ============================================================================
   EDITAR COLABORADOR
   ============================================================================ */
async function editarColaborador(id) {
    try {
        UTILS.showLoading();
        
        const colab = await DB.fetchOne('colaboradores', { id });
        
        if (!colab) {
            UTILS.showError('Colaborador não encontrado');
            return;
        }
        
        colaboradorEditando = id;
        
        // Preencher form
        document.getElementById('nome').value = colab.nome;
        document.getElementById('matricula').value = colab.matricula || '';
        document.getElementById('cpf').value = colab.cpf;
        document.getElementById('rg').value = colab.rg || '';
        document.getElementById('data_nascimento').value = colab.data_nascimento || '';
        document.getElementById('telefone').value = colab.telefone || '';
        document.getElementById('email').value = colab.email || '';
        document.getElementById('funcao').value = colab.funcao;
        document.getElementById('contratada_id').value = colab.contratada_id || '';
        document.getElementById('data_admissao').value = colab.data_admissao || '';
        document.getElementById('salario').value = colab.salario || '';
        document.getElementById('ativo').checked = colab.ativo;
        
        // Foto
        if (colab.foto_base64) {
            document.getElementById('photo-preview').src = colab.foto_base64;
            document.getElementById('photo-preview').classList.add('show');
            document.getElementById('foto_base64').value = colab.foto_base64;
            document.getElementById('btn-remover-foto').style.display = 'inline-block';
        }
        
        // NFC
        if (colab.nfc_tag_id) {
            document.getElementById('nfc_tag_id').value = colab.nfc_tag_id;
            document.getElementById('nfc-status').innerHTML = '<div class="nfc-status success">✅ Tag NFC cadastrada</div>';
        }
        
        // Assinatura
        if (colab.assinatura_base64) {
            document.getElementById('signature-preview').src = colab.assinatura_base64;
            document.getElementById('signature-preview').classList.add('show');
            document.getElementById('assinatura_base64').value = colab.assinatura_base64;
        }
        
        document.getElementById('modal-titulo').textContent = 'Editar Colaborador';
        document.getElementById('modal-colaborador').classList.add('show');
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao carregar colaborador:', error);
        UTILS.showError('Erro ao carregar colaborador');
        UTILS.hideLoading();
    }
}

/* ============================================================================
   DELETAR COLABORADOR
   ============================================================================ */
async function deletarColaborador(id, nome) {
    if (!confirm(`Deseja realmente excluir o colaborador "${nome}"?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }
    
    try {
        UTILS.showLoading();
        
        await DB.deleteData('colaboradores', id);
        
        UTILS.showSuccess('Colaborador excluído com sucesso!');
        await carregarColaboradores();
        
        UTILS.hideLoading();
        
    } catch (error) {
        console.error('Erro ao deletar colaborador:', error);
        UTILS.showError('Erro ao deletar colaborador');
        UTILS.hideLoading();
    }
}

/* ============================================================================
   FUNÇÕES AUXILIARES
   ============================================================================ */
function formatarCPF(cpf) {
    if (!cpf) return '-';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function capitalizar(texto) {
    if (!texto) return '-';
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Exportar funções globais
window.editarColaborador = editarColaborador;
window.deletarColaborador = deletarColaborador;

console.log('✅ Colaboradores.js carregado (Com Facial, NFC e Assinatura)');
