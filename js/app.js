/* ============================================================================
   RDO FIDEL - APP PRINCIPAL (CORRIGIDO)
   ============================================================================ */

// Aguardar carregamento completo do DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 RDO Fidel iniciando...');
    
    try {
        // Verificar se está autenticado
        const session = await AUTH.checkAuth();
        
        if (!session) {
            // Não autenticado → redirecionar para login
            console.log('⚠️  Usuário não autenticado');
            console.log('↪️  Redirecionando para login...');
            
            setTimeout(() => {
                window.location.href = 'pages/login.html';
            }, 500);
            
        } else {
            // Autenticado → redirecionar para dashboard
            console.log('✅ Usuário autenticado:', session.user.email);
            console.log('↪️  Redirecionando para dashboard...');
            
            setTimeout(() => {
                window.location.href = 'pages/dashboard.html';
            }, 500);
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar autenticação:', error);
        
        // Em caso de erro, redirecionar para login por segurança
        setTimeout(() => {
            window.location.href = 'pages/login.html';
        }, 1000);
    }
    
    // Esconder loading após verificação
    setTimeout(() => {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }, 1500);
});

// Tratar erros globais
window.addEventListener('error', (event) => {
    console.error('❌ Erro global:', event.error);
});

// Tratar rejeições de promises
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promise rejeitada:', event.reason);
});

console.log('✅ App principal carregado (versão corrigida)');
