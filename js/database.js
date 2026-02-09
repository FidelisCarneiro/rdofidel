/* ============================================================================
   RDO FIDEL - DATABASE (VERSÃO CORRIGIDA)
   ============================================================================ */

// 🎯 CORREÇÃO: Sobrescrever window.supabase com cliente criado
window.supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

console.log('✅ Supabase cliente inicializado globalmente');

// Referência local para usar neste arquivo
const supabase = window.supabase;

/* ============================================================================
   FUNÇÕES GENÉRICAS DE CRUD
   ============================================================================ */

async function fetchData(table, filters = {}, select = '*', options = {}) {
    try {
        let query = supabase.from(table).select(select);
        
        Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        
        if (options.order) {
            const { column, ascending = true } = options.order;
            query = query.order(column, { ascending });
        }
        
        if (options.limit) {
            query = query.limit(options.limit);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error(`❌ Erro ao buscar dados de ${table}:`, error);
            throw error;
        }
        
        console.log(`✅ Dados de ${table} carregados:`, data?.length || 0, 'registros');
        return data;
        
    } catch (error) {
        console.error('Erro em fetchData:', error);
        throw error;
    }
}

async function fetchOne(table, filters = {}, select = '*') {
    const data = await fetchData(table, filters, select, { limit: 1 });
    return data && data.length > 0 ? data[0] : null;
}

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
        
        console.log(`✅ Dados inseridos em ${table}`);
        return inserted;
        
    } catch (error) {
        console.error('Erro em insertData:', error);
        throw error;
    }
}

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
        
        console.log(`✅ Dados atualizados em ${table}`);
        return data;
        
    } catch (error) {
        console.error('Erro em updateData:', error);
        throw error;
    }
}

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
        
        console.log(`✅ Dados deletados de ${table}`);
        return data;
        
    } catch (error) {
        console.error('Erro em deleteData:', error);
        throw error;
    }
}

/* ============================================================================
   FUNÇÕES ESPECÍFICAS
   ============================================================================ */

async function getObras(apenasAtivas = true) {
    const filters = apenasAtivas ? { ativo: true } : {};
    return await fetchData('obras', filters, '*', {
        order: { column: 'nome', ascending: true }
    });
}

async function getColaboradores(apenasAtivos = true) {
    const filters = apenasAtivos ? { ativo: true } : {};
    return await fetchData('colaboradores', filters, '*', {
        order: { column: 'nome', ascending: true }
    });
}

async function getEquipesByObra(obraId) {
    return await fetchData('equipes', { obra_id: obraId, ativo: true }, '*', {
        order: { column: 'nome', ascending: true }
    });
}

async function getAtividadesByObra(obraId) {
    return await fetchData('atividades', { obra_id: obraId, ativo: true }, '*', {
        order: { column: 'nome', ascending: true }
    });
}

async function getRDOsByObra(obraId, options = {}) {
    return await fetchData('rdos', { obra_id: obraId }, '*', {
        order: { column: 'data', ascending: false },
        ...options
    });
}

async function getUltimoRDO(obraId) {
    const rdos = await getRDOsByObra(obraId, { limit: 1 });
    return rdos && rdos.length > 0 ? rdos[0] : null;
}

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
        
        const { data: urlData } = supabase.storage
            .from(APP_CONFIG.storage.bucket)
            .getPublicUrl(fileName);
        
        console.log('✅ Arquivo enviado');
        return {
            path: fileName,
            url: urlData.publicUrl
        };
        
    } catch (error) {
        console.error('Erro em uploadFile:', error);
        throw error;
    }
}

async function testarConexao() {
    try {
        console.log('🔍 Testando conexão com banco de dados...');
        
        const { data: obras, error } = await supabase
            .from('obras')
            .select('id, nome')
            .limit(1);
        
        if (error) {
            console.error('❌ Erro na conexão:', error);
            return false;
        }
        
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

// Exportar funções auxiliares
window.DB = {
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

console.log('✅ Database.js carregado (VERSÃO FINAL CORRIGIDA)');
```

#### **4️⃣ SALVE O ARQUIVO:**
- `Ctrl+S`

#### **5️⃣ RECARREGUE O NAVEGADOR:**
- `Ctrl+F5` (força recarregar sem cache)

#### **6️⃣ ABRA O CONSOLE (F12):**

**DEVE APARECER:**
```
✅ Configurações carregadas
✅ Supabase cliente inicializado globalmente
🔍 Testando conexão com banco de dados...
✅ Conexão com banco OK! Obra encontrada: Obra Industrial GASLUB Itaboraí
✅ Database.js carregado (VERSÃO FINAL CORRIGIDA)
```

#### **7️⃣ VÁ PARA NOVO RDO:**

**NO CONSOLE DEVE APARECER:**
```
✅ Supervisores carregados: 3