/* ============================================================================
   LOGIN.JS - Lógica da página de login
   ============================================================================ */

// Elementos do DOM
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const btnSignup = document.getElementById('btn-signup');
const btnBackLogin = document.getElementById('btn-back-login');
const forgotPasswordLink = document.getElementById('forgot-password');
const alertContainer = document.getElementById('alert-container');

// Verificar se já está autenticado ao carregar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Página de login carregada');
    
    // Se já estiver autenticado, redirecionar para dashboard
    const session = await AUTH.checkAuth();
    if (session) {
        window.location.href = '../pages/dashboard.html';
    }
});

/* ============================================================================
   ALTERNÂNCIA ENTRE LOGIN E CADASTRO
   ============================================================================ */

// Mostrar form de cadastro
btnSignup.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    alertContainer.innerHTML = '';
});

// Voltar para form de login
btnBackLogin.addEventListener('click', () => {
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    alertContainer.innerHTML = '';
});

/* ============================================================================
   SUBMIT LOGIN
   ============================================================================ */

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Limpar alertas anteriores
    alertContainer.innerHTML = '';
    
    // Obter valores
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;
    
    // Validar
    if (!email || !password) {
        UTILS.showError('Por favor, preencha todos os campos', alertContainer);
        return;
    }
    
    if (!UTILS.isValidEmail(email)) {
        UTILS.showError('E-mail inválido', alertContainer);
        return;
    }
    
    // Desabilitar botão
    const btnLogin = document.getElementById('btn-login');
    btnLogin.disabled = true;
    btnLogin.textContent = 'Entrando...';
    
    try {
        // Fazer login
        const { user, session } = await AUTH.login(email, password);
        
        console.log('✅ Login bem-sucedido:', user.email);
        
        // Mostrar mensagem de sucesso
        UTILS.showSuccess('Login realizado com sucesso!', alertContainer);
        
        // Redirecionar para dashboard após 1 segundo
        setTimeout(() => {
            window.location.href = '../pages/dashboard.html';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        
        // Mostrar mensagem de erro
        let errorMessage = 'Erro ao fazer login. Verifique suas credenciais.';
        
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'E-mail ou senha incorretos';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'E-mail não confirmado. Verifique sua caixa de entrada.';
        } else if (error.message.includes('Too many requests')) {
            errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
        }
        
        UTILS.showError(errorMessage, alertContainer);
        
        // Reabilitar botão
        btnLogin.disabled = false;
        btnLogin.textContent = 'Entrar';
    }
});

/* ============================================================================
   SUBMIT CADASTRO
   ============================================================================ */

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Limpar alertas
    alertContainer.innerHTML = '';
    
    // Obter valores
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const phone = document.getElementById('signup-phone').value.trim();
    const password = document.getElementById('signup-password').value;
    const passwordConfirm = document.getElementById('signup-password-confirm').value;
    
    // Validar
    if (!name || !email || !password || !passwordConfirm) {
        UTILS.showError('Por favor, preencha todos os campos obrigatórios', alertContainer);
        return;
    }
    
    if (!UTILS.isValidEmail(email)) {
        UTILS.showError('E-mail inválido', alertContainer);
        return;
    }
    
    if (!UTILS.isValidPassword(password)) {
        UTILS.showError('A senha deve ter no mínimo 6 caracteres', alertContainer);
        return;
    }
    
    if (password !== passwordConfirm) {
        UTILS.showError('As senhas não coincidem', alertContainer);
        return;
    }
    
    // Desabilitar botão
    const btnSubmit = signupForm.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Criando conta...';
    
    try {
        // Criar conta
        const userData = {
            nome: name,
            telefone: phone
        };
        
        const { user, session } = await AUTH.signup(email, password, userData);
        
        console.log('✅ Cadastro realizado:', user.email);
        
        // Mostrar mensagem de sucesso
        UTILS.showSuccess('Conta criada com sucesso! Fazendo login...', alertContainer);
        
        // Fazer login automaticamente
        setTimeout(async () => {
            await AUTH.login(email, password);
            window.location.href = '../pages/dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('❌ Erro no cadastro:', error);
        
        // Mostrar mensagem de erro
        let errorMessage = 'Erro ao criar conta. Tente novamente.';
        
        if (error.message.includes('already registered')) {
            errorMessage = 'Este e-mail já está cadastrado';
        } else if (error.message.includes('Password')) {
            errorMessage = 'Senha muito fraca. Use no mínimo 6 caracteres.';
        }
        
        UTILS.showError(errorMessage, alertContainer);
        
        // Reabilitar botão
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Criar conta';
    }
});

/* ============================================================================
   ESQUECI SENHA
   ============================================================================ */

forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    
    if (!email) {
        UTILS.showWarning('Digite seu e-mail no campo acima', alertContainer);
        return;
    }
    
    if (!UTILS.isValidEmail(email)) {
        UTILS.showError('E-mail inválido', alertContainer);
        return;
    }
    
    try {
        await AUTH.resetPassword(email);
        UTILS.showSuccess(`Instruções enviadas para ${email}`, alertContainer);
    } catch (error) {
        console.error('Erro ao resetar senha:', error);
        UTILS.showError('Erro ao enviar e-mail. Tente novamente.', alertContainer);
    }
});

console.log('✅ Login.js carregado');
