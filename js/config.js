/* ============================================================================
   RDO FIDEL - CONFIGURAÇÃO
   ============================================================================ */

// Configurações do Supabase
const SUPABASE_CONFIG = {
    url: 'https://qamgyoqecejvyqpccude.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhbWd5b3FlY2VqdnlxcGNjdWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MjU5OTQsImV4cCI6MjA4NDEwMTk5NH0.nzS2NwJlmKYrIUPAj9zj8OE6lw12esyhm0AyuneYNwI'
};

// Configurações da aplicação
const APP_CONFIG = {
    name: 'RDO Fidel',
    version: '1.0.0',
    description: 'Sistema de Relatório Diário de Obra',
    
    // Rotas
    routes: {
        login: 'pages/login.html',
        dashboard: 'pages/dashboard.html',
        cadastros: {
            obras: 'pages/cadastros/obras.html',
            colaboradores: 'pages/cadastros/colaboradores.html',
            equipes: 'pages/cadastros/equipes.html',
            atividades: 'pages/cadastros/atividades.html',
            equipamentos: 'pages/cadastros/equipamentos.html'
        },
        rdo: {
            novo: 'pages/rdo/novo-rdo-v2.html',
            lista: 'pages/rdo/lista-rdos.html',
            visualizar: 'pages/rdo/visualizar-rdo.html'
        }
    },
    
    // Storage
    storage: {
        bucket: 'rdo-anexos'
    },
    
    // Configurações de sessão
    session: {
        key: 'rdo_fidel_session',
        expiresIn: 7 * 24 * 60 * 60 * 1000 // 7 dias
    }
};

// Exportar configurações
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.APP_CONFIG = APP_CONFIG;

console.log('✅ Configurações carregadas');
