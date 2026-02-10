/* ============================================================================
   RDO FIDEL - DATABASE (Supabase) - VERSÃO ADAPTADA
   ============================================================================
   Mantém compatibilidade com LOGIN + Adiciona funções para RDO
   ============================================================================ */

// Inicializar cliente Supabase
// ⚠️ IMPORTANTE: Não use 'const supabase' porque o CDN já declarou!
const supabaseClient = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

// Criar alias para manter compatibilidade com o código
window.supabase = supabaseClient;

console.log('✅ Supabase cliente inicializado');

/* ============================================================================
   FUNÇÕES GENÉRICAS DE CRUD
   ============================================================================ */

/**
 * Buscar dados de uma tabela
 * @param {string} table - Nome da tabela
 * @param {object} filters - Filtros (ex: { id: '123', ativo: true })
 * @param {string} select - Campos a selecionar (default: '*')
 * @param {object} options - Opções adicionais (order, limit, etc)
 */
async function fetchData(table, filters = {}, select = '*', options = {}) {
    try {
        let query = supabaseClient.from(table).select(select);
        
        // Aplicar filtros
        Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        
        // Aplicar ordenação
        if (options.order) {
            const { column, ascending = true } = options.order;
            query = query.order(column, { ascending });
        }
        
        // Aplicar limite
        if (options.limit) {
            query = query.limit(options.limit);
        }
        
        // Executar query
        const { data, error } = await query;
        
        if (error) {
            console.error(`❌ Erro ao buscar dados de ${table}:`, error);
            throw error;
        }
        
        console.log(`✅ Dados de ${table} carregados:`, data);
        return data;
        
    } catch (error) {
        console.error('Erro em fetchData:', error);
        throw error;
    }
}

/**
 * Buscar um único registro
 */
async function fetchOne(table, filters = {}, select = '*') {
    const data = await fetchData(table, filters, select, { limit: 1 });
    return data && data.length > 0 ? data[0] : null;
}

/**
 * Inserir dados em uma tabela
 */
async function insertData(table, data) {
    try {
        const { data: inserted, error } = await supabaseClient
            .from(table)
            .insert(data)
            .select();
        
        if (error) {
            console.error(`❌ Erro ao inserir em ${table}:`, error);
            throw error;
        }
        
        console.log(`✅ Dados inseridos em ${table}:`, inserted);
        return inserted;
        
    } catch (error) {
        console.error('Erro em insertData:', error);
        throw error;
    }
}

/**
 * Atualizar dados em uma tabela
 */
async function updateData(table, id, updates) {
    try {
        const { data, error } = await supabaseClient
            .from(table)
            .update(updates)
            .eq('id', id)
            .select();
        
        if (error) {
            console.error(`❌ Erro ao atualizar ${table}:`, error);
            throw error;
        }
        
        console.log(`✅ Dados atualizados em ${table}:`, data);
        return data;
        
    } catch (error) {
        console.error('Erro em updateData:', error);
        throw error;
    }
}

/**
 * Deletar dados de uma tabela
 */
async function deleteData(table, id) {
    try {
        const { data, error } = await supabaseClient
            .from(table)
            .delete()
            .eq('id', id)
            .select();
        
        if (error) {
            console.error(`❌ Erro ao deletar de ${table}:`, error);
            throw error;
        }
        
        console.log(`✅ Dados deletados de ${table}:`, data);
        return data;
        
    } catch (error) {
        console.error('Erro em deleteData:', error);
        throw error;
    }
}

/* ============================================================================
   FUNÇÕES ESPECÍFICAS
   ============================================================================ */

/**
 * Buscar todas as obras
 */
async function getObras(apenasAtivas = true) {
    const filters = apenasAtivas ? { ativo: true } : {};
    return await fetchData('obras', filters, '*', {
        order: { column: 'nome', ascending: true }
    });
}

/**
 * Buscar colaboradores
 */
async function getColaboradores(apenasAtivos = true) {
    const filters = apenasAtivos ? { ativo: true } : {};
    return await fetchData('colaboradores', filters, '*', {
        order: { column: 'nome', ascending: true }
    });
}

/**
 * Buscar equipes de uma obra
 */
async function getEquipesByObra(obraId) {
    return await fetchData('equipes', { obra_id: obraId, ativo: true }, '*', {
        order: { column: 'nome', ascending: true }
    });
}

/**
 * Buscar atividades de uma obra
 */
async function getAtividadesByObra(obraId) {
    return await fetchData('atividades', { obra_id: obraId, ativo: true }, '*', {
        order: { column: 'nome', ascending: true }
    });
}

/**
 * Buscar RDOs de uma obra
 */
async function getRDOsByObra(obraId, options = {}) {
    return await fetchData('rdos', { obra_id: obraId }, '*', {
        order: { column: 'data', ascending: false },
        ...options
    });
}

/**
 * Buscar último RDO de uma obra
 */
async function getUltimoRDO(obraId) {
    const rdos = await getRDOsByObra(obraId, { limit: 1 });
    return rdos && rdos.length > 0 ? rdos[0] : null;
}

/* ============================================================================
   🆕 FUNÇÕES PARA RDO - SUPERVISORES, ENCARREGADOS E EQUIPE
   ============================================================================ */

/**
 * Buscar supervisores de uma obra
 * @param {string} obraId - ID da obra
 * @returns {Array} Lista de supervisores
 */
async function getSupervisoresByObra(obraId) {
    try {
        console.log('🔍 Buscando supervisores da obra:', obraId);
        
        const { data, error } = await supabaseClient
            .from('colaboradores')
            .select('id, nome, cpf, funcao')
            .eq('obra_id', obraId)
            .eq('funcao', 'supervisor')
            .eq('ativo', true)
            .order('nome');
        
        if (error) {
            console.error('❌ Erro ao buscar supervisores:', error);
            throw error;
        }
        
        console.log(`✅ Supervisores carregados: ${data.length}`);
        return data;
        
    } catch (error) {
        console.error('Erro em getSupervisoresByObra:', error);
        throw error;
    }
}

/**
 * Buscar encarregados de um supervisor
 * @param {string} supervisorId - ID do supervisor
 * @returns {Array} Lista de encarregados
 */
async function getEncarregadosBySupervisor(supervisorId) {
    try {
        console.log('🔍 Buscando encarregados do supervisor:', supervisorId);
        
        const { data, error } = await supabaseClient
            .from('colaboradores')
            .select('id, nome, cpf, funcao')
            .eq('supervisor_id', supervisorId)
            .eq('funcao', 'encarregado')
            .eq('ativo', true)
            .order('nome');
        
        if (error) {
            console.error('❌ Erro ao buscar encarregados:', error);
            throw error;
        }
        
        console.log(`✅ Encarregados carregados: ${data.length}`);
        return data;
        
    } catch (error) {
        console.error('Erro em getEncarregadosBySupervisor:', error);
        throw error;
    }
}

/**
 * Buscar equipe de um encarregado
 * @param {string} encarregadoId - ID do encarregado
 * @returns {Array} Lista de colaboradores da equipe
 */
async function getEquipeByEncarregado(encarregadoId) {
    try {
        console.log('🔍 Buscando equipe do encarregado:', encarregadoId);
        
        // Primeiro buscar a equipe liderada pelo encarregado
        const { data: equipe, error: equipeError } = await supabaseClient
            .from('equipes')
            .select('id, nome')
            .eq('lider_equipe', encarregadoId)
            .eq('ativo', true)
            .single();
        
        if (equipeError) {
            console.error('❌ Erro ao buscar equipe:', equipeError);
            throw equipeError;
        }
        
        if (!equipe) {
            console.log('⚠️ Nenhuma equipe encontrada para este encarregado');
            return [];
        }
        
        console.log(`✅ Equipe encontrada: ${equipe.nome}`);
        
        // Buscar colaboradores da equipe
        const { data: vinculos, error: vinculosError } = await supabaseClient
            .from('equipes_colaboradores')
            .select(`
                colaborador_id,
                colaboradores (
                    id,
                    nome,
                    cpf,
                    funcao
                )
            `)
            .eq('equipe_id', equipe.id);
        
        if (vinculosError) {
            console.error('❌ Erro ao buscar colaboradores:', vinculosError);
            throw vinculosError;
        }
        
        // Mapear para retornar apenas os colaboradores
        const colaboradores = vinculos.map(v => v.colaboradores).filter(c => c !== null);
        
        console.log(`✅ Colaboradores da equipe: ${colaboradores.length}`);
        return colaboradores;
        
    } catch (error) {
        console.error('Erro em getEquipeByEncarregado:', error);
        throw error;
    }
}

/**
 * Buscar equipe diretamente pelo ID da equipe
 * @param {string} equipeId - ID da equipe
 * @returns {Array} Lista de colaboradores da equipe
 */
async function getColaboradoresByEquipe(equipeId) {
    try {
        console.log('🔍 Buscando colaboradores da equipe:', equipeId);
        
        const { data: vinculos, error } = await supabaseClient
            .from('equipes_colaboradores')
            .select(`
                colaborador_id,
                colaboradores (
                    id,
                    nome,
                    cpf,
                    funcao
                )
            `)
            .eq('equipe_id', equipeId);
        
        if (error) {
            console.error('❌ Erro ao buscar colaboradores:', error);
            throw error;
        }
        
        const colaboradores = vinculos.map(v => v.colaboradores).filter(c => c !== null);
        
        console.log(`✅ Colaboradores da equipe: ${colaboradores.length}`);
        return colaboradores;
        
    } catch (error) {
        console.error('Erro em getColaboradoresByEquipe:', error);
        throw error;
    }
}

/* ============================================================================
   OUTRAS FUNÇÕES
   ============================================================================ */

/**
 * Upload de arquivo para Storage
 */
async function uploadFile(file, folder = 'anexos') {
    try {
        const fileName = `${folder}/${Date.now()}_${file.name}`;
        
        const { data, error } = await supabaseClient.storage
            .from(APP_CONFIG.storage.bucket)
            .upload(fileName, file);
        
        if (error) {
            console.error('❌ Erro no upload:', error);
            throw error;
        }
        
        // Obter URL pública
        const { data: urlData } = supabaseClient.storage
            .from(APP_CONFIG.storage.bucket)
            .getPublicUrl(fileName);
        
        console.log('✅ Arquivo enviado:', urlData.publicUrl);
        return {
            path: fileName,
            url: urlData.publicUrl
        };
        
    } catch (error) {
        console.error('Erro em uploadFile:', error);
        throw error;
    }
}

/**
 * Testar conexão com banco de dados
 */
async function testarConexao() {
    try {
        const obras = await fetchData('obras', {}, 'id, nome', { limit: 1 });
        
        if (obras && obras.length > 0) {
            console.log('✅ Conexão com banco OK! Obra encontrada:', obras[0].nome);
            return true;
        } else {
            console.log('⚠️ Banco vazio ou sem permissão');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Erro na conexão:', error);
        return false;
    }
}

// Testar conexão ao carregar
testarConexao();

// Exportar funções
window.DB = {
    supabase: supabaseClient,
    fetchData,
    fetchOne,
    insertData,
    updateData,
    deleteData,
    getObras,
    getColaboradores,
    getEquipesByObra,
    getAtividadesByObra,
    getRDOsByObra,
    getUltimoRDO,
    uploadFile,
    testarConexao,
    // 🆕 Funções para RDO
    getSupervisoresByObra,
    getEncarregadosBySupervisor,
    getEquipeByEncarregado,
    getColaboradoresByEquipe
};

console.log('✅ Database.js carregado (versão adaptada com funções de RDO)');
