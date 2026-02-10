/* ========== NOVO RDO - JAVASCRIPT ========== */

let obras = [], colaboradores = [], atividades = [], equipeLista = [];
let rdoNumero = '', fotosRDO = [], ocorrencias = [];
let signaturePad = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📝 Novo RDO iniciando...');
    
    const session = await AUTH.checkAuth();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }
    
    document.getElementById('user-name').textContent = session.user.email.split('@')[0];
    
    setupEvents();
    setupSignaturePad();
    setupPhotoUpload();
    preencherDataHoje();
    await carregarDados();
    
    console.log('✅ RDO pronto!');
});

function setupEvents() {
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        if (confirm('Sair?')) await AUTH.logout();
    });
    
    document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('mobile-open');
    });
    
    document.getElementById('form-rdo').addEventListener('submit', salvarRDO);
    document.getElementById('obra_id').addEventListener('change', async () => {
        await gerarNumeroRDO();
        await carregarAtividades();
    });
    
    document.querySelectorAll('input[name="teve_pts"]').forEach(radio => {
        radio.addEventListener('change', togglePTS);
    });
    
    document.getElementById('encarregado_id').addEventListener('change', carregarEquipe);
    document.getElementById('btn-add-ocorrencia').addEventListener('click', adicionarOcorrencia);
    document.getElementById('btn-limpar-assinatura').addEventListener('click', limparAssinatura);
    
    document.getElementById('data').addEventListener('change', (e) => {
        const data = new Date(e.target.value + 'T00:00:00');
        atualizarBadgeData(data);
    });
}

/* ========== DATA ========== */
function preencherDataHoje() {
    const hoje = new Date();
    const dataISO = hoje.toISOString().split('T')[0];
    document.getElementById('data').value = dataISO;
    atualizarBadgeData(hoje);
}

function atualizarBadgeData(data) {
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const dia = dias[data.getDay()];
    const fmt = data.toLocaleDateString('pt-BR');
    document.getElementById('rdo-data-badge').textContent = `${dia}, ${fmt}`;
}

/* ========== AUTO-NUMERAÇÃO (8 DÍGITOS) ========== */
async function gerarNumeroRDO() {
    const obraId = document.getElementById('obra_id').value;
    if (!obraId) {
        document.getElementById('rdo-numero').textContent = '00000000';
        return;
    }
    
    try {
        const ultimosRDOs = await DB.fetchData('rdos', { obra_id: obraId }, 'numero', {
            order: { column: 'numero', ascending: false },
            limit: 1
        });
        
        let proximoNum = 1;
        if (ultimosRDOs && ultimosRDOs.length > 0) {
            proximoNum = parseInt(ultimosRDOs[0].numero) + 1;
        }
        
        rdoNumero = proximoNum.toString().padStart(8, '0');
        document.getElementById('rdo-numero').textContent = rdoNumero;
        console.log('✅ RDO Nº:', rdoNumero);
        
    } catch (error) {
        console.error('Erro ao gerar número:', error);
        rdoNumero = '00000001';
        document.getElementById('rdo-numero').textContent = rdoNumero;
    }
}

/* ========== CARREGAR DADOS ========== */
async function carregarDados() {
    try {
        obras = await DB.getObras(true);
        const selectObra = document.getElementById('obra_id');
        obras.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.id;
            opt.textContent = o.nome;
            selectObra.appendChild(opt);
        });
        
        colaboradores = await DB.getColaboradores(true);
        const funcoesLider = ['engenheiro', 'mestre', 'encarregado'];
        const encarregados = colaboradores.filter(c => funcoesLider.includes(c.funcao));
        
        const selectEnc = document.getElementById('encarregado_id');
        encarregados.forEach(e => {
            const opt = document.createElement('option');
            opt.value = e.id;
            opt.textContent = `${e.nome} (${cap(e.funcao)})`;
            selectEnc.appendChild(opt);
        });
        
        console.log(`✅ ${obras.length} obras, ${colaboradores.length} colaboradores`);
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

async function carregarAtividades() {
    const obraId = document.getElementById('obra_id').value;
    if (!obraId) return;
    
    try {
        atividades = await DB.getAtividadesByObra(obraId);
        console.log(`✅ ${atividades.length} atividades`);
    } catch (error) {
        console.error('Erro ao carregar atividades:', error);
    }
}

/* ========== PTS ========== */
function togglePTS() {
    const tevePTS = document.querySelector('input[name="teve_pts"]:checked')?.value;
    const group = document.getElementById('atividade-pts-group');
    const campo = document.getElementById('atividade_pts');
    
    if (tevePTS === 'sim') {
        group.style.display = 'block';
        campo.required = true;
    } else {
        group.style.display = 'none';
        campo.required = false;
        campo.value = '';
    }
}

/* ========== EQUIPE ========== */
async function carregarEquipe() {
    const encarregadoId = document.getElementById('encarregado_id').value;
    if (!encarregadoId) {
        document.getElementById('equipe-container').innerHTML = '<p style="color: #999; font-style: italic;">Selecione um encarregado...</p>';
        return;
    }
    
    try {
        let equipes = await DB.fetchData('equipes', { lider_equipe: encarregadoId }, '*');
        
        if (equipes && equipes.length > 0) {
            const equipeId = equipes[0].id;
            const equipesColabs = await DB.fetchData('equipes_colaboradores', { equipe_id: equipeId }, '*');
            const colabIds = equipesColabs.map(ec => ec.colaborador_id);
            equipeLista = colaboradores.filter(c => colabIds.includes(c.id));
        } else {
            equipeLista = colaboradores.filter(c => c.id !== encarregadoId);
        }
        
        renderEquipe();
        console.log(`✅ Equipe: ${equipeLista.length} colaboradores`);
        
    } catch (error) {
        console.error('Erro ao carregar equipe:', error);
        equipeLista = colaboradores.filter(c => c.id !== encarregadoId);
        renderEquipe();
    }
}

function renderEquipe() {
    const container = document.getElementById('equipe-container');
    
    if (equipeLista.length === 0) {
        container.innerHTML = '<p style="color: #dc3545;">Nenhum colaborador encontrado</p>';
        return;
    }
    
    container.innerHTML = `<p><strong>Equipe (${equipeLista.length}):</strong></p>`;
    
    equipeLista.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'colab-row';
        div.id = `colab-${i}`;
        div.innerHTML = `
            <div>
                <strong>${c.nome}</strong><br>
                <small style="color: #666;">${cap(c.funcao)}</small>
            </div>
            <div>
                <select class="form-control form-control-sm" data-colab="${i}" data-field="status">
                    <option value="presente">✅ Presente</option>
                    <option value="ausente">❌ Ausente</option>
                    <option value="atrasado">⏰ Atrasado</option>
                    <option value="transferido">🔄 Transferido</option>
                    <option value="emprestado">🤝 Emprestado</option>
                </select>
            </div>
            <div id="atividades-${i}">
                <div class="atividade-mini">
                    <select class="form-control form-control-sm" style="flex: 1;">
                        <option value="">Atividade...</option>
                        ${atividades.map(a => `<option value="${a.id}">${a.nome}</option>`).join('')}
                    </select>
                    <input type="number" class="form-control form-control-sm" placeholder="HH" style="width: 60px;" step="0.5" min="0" max="24">
                </div>
            </div>
            <div>
                <button type="button" class="btn btn-sm btn-success" onclick="addAtividade(${i})">+ HH</button>
            </div>
        `;
        container.appendChild(div);
    });
    
    equipeLista.forEach((c, i) => {
        c.status = 'presente';
        c.atividades = [];
    });
}

function addAtividade(index) {
    const container = document.getElementById(`atividades-${index}`);
    const div = document.createElement('div');
    div.className = 'atividade-mini';
    div.innerHTML = `
        <select class="form-control form-control-sm" style="flex: 1;">
            <option value="">Atividade...</option>
            ${atividades.map(a => `<option value="${a.id}">${a.nome}</option>`).join('')}
        </select>
        <input type="number" class="form-control form-control-sm" placeholder="HH" style="width: 60px;" step="0.5" min="0" max="24">
        <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(div);
}

/* ========== OCORRÊNCIAS ========== */
let ocorrenciaId = 0;

function adicionarOcorrencia() {
    if (equipeLista.length === 0) {
        alert('Selecione um encarregado primeiro!');
        return;
    }
    
    const id = ocorrenciaId++;
    const container = document.getElementById('ocorrencias-container');
    
    const div = document.createElement('div');
    div.className = 'section-card';
    div.style.marginBottom = '15px';
    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <h4>Ocorrência #${id + 1}</h4>
            <button type="button" class="btn btn-sm btn-danger" onclick="removerOcorrencia(${id})">🗑️</button>
        </div>
        <div class="form-group">
            <label>Tipo</label>
            <select class="form-control" id="ocorr-tipo-${id}">
                <option value="ocorrencia">Ocorrência</option>
                <option value="interferencia">Interferência</option>
                <option value="paralisacao">Paralisação</option>
            </select>
        </div>
        <div class="form-group">
            <label>Descrição</label>
            <textarea class="form-control" id="ocorr-desc-${id}" rows="3"></textarea>
        </div>
        <div class="form-group">
            <label>Colaboradores Afetados:</label>
            <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
                ${equipeLista.map((c, i) => `
                    <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                        <input type="checkbox" id="ocorr-${id}-c-${i}" value="${c.id}">
                        <label for="ocorr-${id}-c-${i}" style="flex: 1;">${c.nome}</label>
                        <input type="number" class="form-control form-control-sm" id="ocorr-${id}-hh-${i}" placeholder="HH" style="width: 80px;" step="0.5" min="0" max="24">
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="form-group">
            <label>Fotos:</label>
            <div class="upload-area" onclick="document.getElementById('ocorr-foto-${id}').click()">
                <input type="file" id="ocorr-foto-${id}" accept="image/*" multiple style="display: none;">
                <p>📷 Adicionar fotos</p>
            </div>
            <div class="photo-grid" id="ocorr-fotos-${id}"></div>
        </div>
    `;
    
    container.appendChild(div);
    
    document.getElementById(`ocorr-foto-${id}`).addEventListener('change', (e) => {
        handleOcorrenciaFotos(e, id);
    });
    
    ocorrencias.push({ id, fotos: [] });
}

function removerOcorrencia(id) {
    event.target.closest('.section-card').remove();
    const idx = ocorrencias.findIndex(o => o.id === id);
    if (idx > -1) ocorrencias.splice(idx, 1);
}

async function handleOcorrenciaFotos(event, ocorrId) {
    const files = event.target.files;
    const ocorr = ocorrencias.find(o => o.id === ocorrId);
    if (!ocorr) return;
    
    for (let file of files) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 5 * 1024 * 1024) {
            alert(`${file.name} > 5MB`);
            continue;
        }
        
        const base64 = await fileToBase64(file);
        ocorr.fotos.push(base64);
    }
    
    renderOcorrenciaFotos(ocorrId);
}

function renderOcorrenciaFotos(ocorrId) {
    const ocorr = ocorrencias.find(o => o.id === ocorrId);
    if (!ocorr) return;
    
    const grid = document.getElementById(`ocorr-fotos-${ocorrId}`);
    grid.innerHTML = '';
    
    ocorr.fotos.forEach((foto, i) => {
        const tipo = document.getElementById(`ocorr-tipo-${ocorrId}`).value;
        const nome = `${rdoNumero}_${tipo}_${(i + 1).toString().padStart(4, '0')}.jpg`;
        
        const div = document.createElement('div');
        div.className = 'photo-item';
        div.innerHTML = `
            <img src="${foto}" alt="Foto">
            <button class="photo-remove" onclick="removerOcorrFoto(${ocorrId}, ${i})" type="button">×</button>
            <div class="photo-label">${nome}</div>
        `;
        grid.appendChild(div);
    });
}

function removerOcorrFoto(ocorrId, idx) {
    const ocorr = ocorrencias.find(o => o.id === ocorrId);
    if (!ocorr) return;
    ocorr.fotos.splice(idx, 1);
    renderOcorrenciaFotos(ocorrId);
}

/* ========== FOTOS RDO ========== */
function setupPhotoUpload() {
    const area = document.getElementById('upload-area-rdo');
    const input = document.getElementById('foto-input-rdo');
    
    area.addEventListener('click', () => input.click());
    input.addEventListener('change', handleFotosRDO);
    
    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.style.borderColor = '#007bff';
    });
    area.addEventListener('dragleave', () => {
        area.style.borderColor = '#ddd';
    });
    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.style.borderColor = '#ddd';
        handleFotosRDOFiles(e.dataTransfer.files);
    });
}

async function handleFotosRDO(e) {
    await handleFotosRDOFiles(e.target.files);
}

async function handleFotosRDOFiles(files) {
    for (let file of files) {
        if (!file.type.startsWith('image/')) {
            alert(`${file.name} não é imagem`);
            continue;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert(`${file.name} > 5MB`);
            continue;
        }
        
        const base64 = await fileToBase64(file);
        fotosRDO.push(base64);
    }
    
    renderFotosRDO();
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function renderFotosRDO() {
    const grid = document.getElementById('fotos-rdo-grid');
    grid.innerHTML = '';
    
    fotosRDO.forEach((foto, i) => {
        const nome = `${rdoNumero}_${(i + 1).toString().padStart(4, '0')}.jpg`;
        
        const div = document.createElement('div');
        div.className = 'photo-item';
        div.innerHTML = `
            <img src="${foto}" alt="Foto RDO">
            <button class="photo-remove" onclick="removerFotoRDO(${i})" type="button">×</button>
            <div class="photo-label">${nome}</div>
        `;
        grid.appendChild(div);
    });
}

function removerFotoRDO(idx) {
    fotosRDO.splice(idx, 1);
    renderFotosRDO();
}

/* ========== ASSINATURA ========== */
function setupSignaturePad() {
    const canvas = document.getElementById('signature-pad');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0, lastY = 0;
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    function start(e) {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        lastX = (e.clientX || e.touches[0].clientX) - rect.left;
        lastY = (e.clientY || e.touches[0].clientY) - rect.top;
    }
    
    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        lastX = x;
        lastY = y;
    }
    
    function stop() {
        isDrawing = false;
    }
    
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('mouseout', stop);
    
    canvas.addEventListener('touchstart', start);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stop);
    
    signaturePad = { canvas, ctx };
}

function limparAssinatura() {
    if (!signaturePad) return;
    const { canvas, ctx } = signaturePad;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function obterAssinatura() {
    if (!signaturePad) return null;
    return signaturePad.canvas.toDataURL('image/png');
}

/* ========== SALVAR RDO ========== */
async function salvarRDO(e) {
    e.preventDefault();
    
    if (!rdoNumero) {
        alert('Selecione uma obra!');
        return;
    }
    
    try {
        UTILS.showLoading();
        
        // 1. RDO principal
        const tevePTS = document.querySelector('input[name="teve_pts"]:checked')?.value === 'sim';
        const dadosRDO = {
            obra_id: document.getElementById('obra_id').value,
            numero: rdoNumero,
            data: document.getElementById('data').value,
            teve_pts: tevePTS,
            atividade_pts: tevePTS ? document.getElementById('atividade_pts').value : null,
            assinatura_url: null
        };
        
        const rdoInserido = await DB.insertData('rdos', dadosRDO);
        const rdoId = rdoInserido[0].id;
        
        // 2. Colaboradores
        for (let i = 0; i < equipeLista.length; i++) {
            const c = equipeLista[i];
            const status = document.querySelector(`select[data-colab="${i}"][data-field="status"]`)?.value || 'presente';
            
            const atividadesDiv = document.getElementById(`atividades-${i}`);
            const linhas = atividadesDiv.querySelectorAll('.atividade-mini');
            
            let totalHH = 0;
            linhas.forEach(linha => {
                const atividadeId = linha.querySelector('select').value;
                const hh = parseFloat(linha.querySelector('input[type="number"]').value) || 0;
                
                if (atividadeId && hh > 0) {
                    totalHH += hh;
                    DB.insertData('rdo_atividades', {
                        rdo_id: rdoId,
                        atividade_id: atividadeId,
                        colaborador_id: c.id,
                        horas_homem: hh
                    });
                }
            });
            
            await DB.insertData('rdo_colaboradores', {
                rdo_id: rdoId,
                colaborador_id: c.id,
                status: status,
                horas_trabalhadas: totalHH
            });
        }
        
        // 3. Ocorrências
        for (let ocorr of ocorrencias) {
            const tipo = document.getElementById(`ocorr-tipo-${ocorr.id}`).value;
            const desc = document.getElementById(`ocorr-desc-${ocorr.id}`).value;
            
            const ocorrInserida = await DB.insertData('rdo_ocorrencias', {
                rdo_id: rdoId,
                tipo: tipo,
                descricao: desc,
                fotos: ocorr.fotos
            });
            
            const ocorrId = ocorrInserida[0].id;
            
            for (let i = 0; i < equipeLista.length; i++) {
                const checkbox = document.getElementById(`ocorr-${ocorr.id}-c-${i}`);
                const hh = document.getElementById(`ocorr-${ocorr.id}-hh-${i}`).value;
                
                if (checkbox?.checked && hh) {
                    await DB.insertData('rdo_ocorrencias_colaboradores', {
                        ocorrencia_id: ocorrId,
                        colaborador_id: equipeLista[i].id,
                        horas_perdidas: parseFloat(hh)
                    });
                }
            }
        }
        
        // 4. Fotos
        if (fotosRDO.length > 0) {
            await DB.insertData('rdo_anexos', {
                rdo_id: rdoId,
                tipo: 'foto',
                arquivos: fotosRDO
            });
        }
        
        // 5. Assinatura
        const assinatura = obterAssinatura();
        if (assinatura) {
            await DB.updateData('rdos', rdoId, {
                assinatura_url: assinatura
            });
        }
        
        UTILS.hideLoading();
        UTILS.showSuccess('RDO salvo com sucesso!');
        
        setTimeout(() => {
            window.location.href = 'lista-rdos.html';
        }, 2000);
        
    } catch (error) {
        console.error('Erro ao salvar RDO:', error);
        UTILS.showError('Erro ao salvar RDO');
        UTILS.hideLoading();
    }
}

/* ========== UTILS ========== */
function cap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

window.addAtividade = addAtividade;
window.removerOcorrencia = removerOcorrencia;
window.removerOcorrFoto = removerOcorrFoto;
window.removerFotoRDO = removerFotoRDO;

console.log('✅ novo-rdo.js carregado');
