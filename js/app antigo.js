/* ============================================================================
   RDO FIDEL - APP PRINCIPAL
   ============================================================================ */

// Aguardar carregamento completo do DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 RDO Fidel iniciando...');
    
    // Esconder loading após 500ms
    setTimeout(() => {
        hideLoading();
    }, 500);
    
    console.log('✅ RDO Fidel carregado com sucesso!');
});

// Tratar erros globais
window.addEventListener('error', (event) => {
    console.error('❌ Erro global:', event.error);
});

// Tratar rejeições de promises
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promise rejeitada:', event.reason);
});

console.log('✅ App principal carregado');
