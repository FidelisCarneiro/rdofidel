/* ============================================================================
   RDO FIDEL - AUTENTICAÇÃO
   ============================================================================ */

/* ============================================================================
   FUNÇÕES DE AUTENTICAÇÃO
   ============================================================================ */

/**
 * Fazer login com email e senha
 */
async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            console.error('❌ Erro no login:', error);
            throw error;
        }
        
        console.log('✅ Login realizado:', data.user.email);
        
        // Salvar informações do usuário
        saveUserSession(data);
        
        return data;
        
    } catch (error) {
        console.error('Erro em login:', error);
        throw error;
    }
}

/**
 * Fazer cadastro de novo usuário
 */
async function signup(email, password, userData = {}) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: userData
            }
        });
        
        if (error) {
            console.error('❌ Erro no cadastro:', error);
            throw error;
        }
        
        console.log('✅ Cadastro realizado:', data.user.email);
        return data;
        
    } catch (error) {
        console.error('Erro em signup:', error);
        throw error;
    }
}

/**
 * Fazer logout
 */
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('❌ Erro no logout:', error);
            throw error;
        }
        
        console.log('✅ Logout realizado');
        
        // Limpar sessão local
        clearUserSession();
        
        // Redirecionar para login
        redirectTo('login');
        
    } catch (error) {
        console.error('Erro em logout:', error);
        throw error;
    }
}

/**
 * Verificar se usuário está autenticado
 */
async function checkAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('❌ Erro ao verificar sessão:', error);
            return null;
        }
        
        if (session) {
            console.log('✅ Usuário autenticado:', session.user.email);
            return session;
        } else {
            console.log('⚠️ Usuário não autenticado');
            return null;
        }
        
    } catch (error) {
        console.error('Erro em checkAuth:', error);
        return null;
    }
}

/**
 * Obter usuário atual
 */
async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('❌ Erro ao obter usuário:', error);
            return null;
        }
        
        return user;
        
    } catch (error) {
        console.error('Erro em getCurrentUser:', error);
        return null;
    }
}

/**
 * Resetar senha
 */
async function resetPassword(email) {
    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`
        });
        
        if (error) {
            console.error('❌ Erro ao resetar senha:', error);
            throw error;
        }
        
        console.log('✅ Email de reset enviado');
        return data;
        
    } catch (error) {
        console.error('Erro em resetPassword:', error);
        throw error;
    }
}

/**
 * Atualizar senha
 */
async function updatePassword(newPassword) {
    try {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) {
            console.error('❌ Erro ao atualizar senha:', error);
            throw error;
        }
        
        console.log('✅ Senha atualizada');
        return data;
        
    } catch (error) {
        console.error('Erro em updatePassword:', error);
        throw error;
    }
}

/* ============================================================================
   GERENCIAMENTO DE SESSÃO LOCAL
   ============================================================================ */

/**
 * Salvar sessão do usuário no localStorage
 */
function saveUserSession(sessionData) {
    try {
        const userInfo = {
            email: sessionData.user.email,
            id: sessionData.user.id,
            metadata: sessionData.user.user_metadata,
            lastLogin: new Date().toISOString()
        };
        
        localStorage.setItem(APP_CONFIG.session.key, JSON.stringify(userInfo));
        console.log('✅ Sessão salva localmente');
        
    } catch (error) {
        console.error('Erro ao salvar sessão:', error);
    }
}

/**
 * Obter sessão do localStorage
 */
function getUserSession() {
    try {
        const session = localStorage.getItem(APP_CONFIG.session.key);
        return session ? JSON.parse(session) : null;
    } catch (error) {
        console.error('Erro ao obter sessão:', error);
        return null;
    }
}

/**
 * Limpar sessão do localStorage
 */
function clearUserSession() {
    try {
        localStorage.removeItem(APP_CONFIG.session.key);
        console.log('✅ Sessão local limpa');
    } catch (error) {
        console.error('Erro ao limpar sessão:', error);
    }
}

/* ============================================================================
   PROTEÇÃO DE ROTAS
   ============================================================================ */

/**
 * Verificar se precisa autenticação na página atual
 */
async function requireAuth() {
    const session = await checkAuth();
    
    if (!session) {
        console.log('⚠️ Acesso negado - redirecionando para login');
        redirectTo('login');
        return false;
    }
    
    return true;
}

/**
 * Verificar se já está autenticado (para páginas públicas como login)
 */
async function redirectIfAuthenticated() {
    const session = await checkAuth();
    
    if (session) {
        console.log('✅ Já autenticado - redirecionando para dashboard');
        redirectTo('dashboard');
        return true;
    }
    
    return false;
}

/* ============================================================================
   NAVEGAÇÃO
   ============================================================================ */

/**
 * Redirecionar para uma página
 */
function redirectTo(page) {
    const routes = {
        login: 'pages/login.html',
        dashboard: 'pages/dashboard.html',
        cadastros: 'pages/cadastros/obras.html',
        rdo: 'pages/rdo/lista-rdos.html'
    };
    
    const url = routes[page] || page;
    window.location.href = url;
}

/* ============================================================================
   LISTENER DE MUDANÇAS DE AUTH
   ============================================================================ */

// Escutar mudanças no estado de autenticação
supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔄 Auth state changed:', event);
    
    if (event === 'SIGNED_IN') {
        console.log('✅ Usuário logado');
        saveUserSession(session);
    }
    
    if (event === 'SIGNED_OUT') {
        console.log('⚠️ Usuário deslogado');
        clearUserSession();
    }
    
    if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token atualizado');
    }
});

// Exportar funções
window.AUTH = {
    login,
    signup,
    logout,
    checkAuth,
    getCurrentUser,
    resetPassword,
    updatePassword,
    getUserSession,
    requireAuth,
    redirectIfAuthenticated,
    redirectTo
};

console.log('✅ Sistema de autenticação carregado');
