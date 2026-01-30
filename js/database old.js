/* ============================================================================
   RDO FIDEL - DATABASE (Supabase)
   ============================================================================ */

// Inicializar cliente Supabase
const supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

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
        let query = supabase.from(table).select(select);
        
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
        const { data: inserted, error } = await supabase
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
        const { data, error } = await supabase
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
        const { data, error } = await supabase
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

/**
 * Upload de arquivo para Storage
 */
async function uploadFile(file, folder = 'anexos') {
    try {
        const fileName = `${folder}/${Date.now()}_${file.name}`;
        
        const { data, error } = await supabase.storage
            .from(APP_CONFIG.storage.bucket)
            .upload(fileName, file);
        
        if (error) {
            console.error('❌ Erro no upload:', error);
            throw error;
        }
        
        // Obter URL pública
        const { data: urlData } = supabase.storage
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
    supabase,
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
    testarConexao
};
