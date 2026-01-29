/* ============================================================================
   RDO FIDEL - UTILITÁRIOS
   ============================================================================ */

/* ============================================================================
   MANIPULAÇÃO DE DOM
   ============================================================================ */

/**
 * Selecionar elemento
 */
function $(selector) {
    return document.querySelector(selector);
}

/**
 * Selecionar múltiplos elementos
 */
function $$(selector) {
    return document.querySelectorAll(selector);
}

/**
 * Criar elemento HTML
 */
function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    // Adicionar atributos
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else {
            element.setAttribute(key, value);
        }
    });
    
    // Adicionar filhos
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else {
            element.appendChild(child);
        }
    });
    
    return element;
}

/* ============================================================================
   ALERTAS E NOTIFICAÇÕES
   ============================================================================ */

/**
 * Mostrar alerta
 */
function showAlert(message, type = 'info', container = null, dismissible = true) {
    const alertClass = `alert alert-${type}${dismissible ? ' alert-dismissible' : ''}`;
    
    const alertHTML = `
        <div class="${alertClass}" role="alert">
            ${message}
            ${dismissible ? '<button type="button" class="alert-close" onclick="this.parentElement.remove()">&times;</button>' : ''}
        </div>
    `;
    
    if (container) {
        const containerEl = typeof container === 'string' ? $(container) : container;
        if (containerEl) {
            containerEl.innerHTML = alertHTML + containerEl.innerHTML;
        }
    } else {
        // Criar container temporário no topo da página
        const tempContainer = createElement('div', {
            className: 'container',
            innerHTML: alertHTML
        });
        document.body.insertBefore(tempContainer, document.body.firstChild);
        
        // Remover automaticamente após 5 segundos
        if (dismissible) {
            setTimeout(() => tempContainer.remove(), 5000);
        }
    }
}

/**
 * Mostrar erro
 */
function showError(message, container = null) {
    showAlert(message, 'error', container);
}

/**
 * Mostrar sucesso
 */
function showSuccess(message, container = null) {
    showAlert(message, 'success', container);
}

/**
 * Mostrar aviso
 */
function showWarning(message, container = null) {
    showAlert(message, 'warning', container);
}

/* ============================================================================
   LOADING
   ============================================================================ */

/**
 * Mostrar loading
 */
function showLoading() {
    const loading = $('#loading');
    if (loading) {
        loading.classList.remove('hidden');
    }
}

/**
 * Esconder loading
 */
function hideLoading() {
    const loading = $('#loading');
    if (loading) {
        loading.classList.add('hidden');
    }
}

/* ============================================================================
   VALIDAÇÃO DE FORMULÁRIOS
   ============================================================================ */

/**
 * Validar email
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validar senha (mínimo 6 caracteres)
 */
function isValidPassword(password) {
    return password && password.length >= 6;
}

/**
 * Validar CPF
 */
function isValidCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, '');
    
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    let soma = 0;
    let resto;
    
    for (let i = 1; i <= 9; i++) {
        soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
    }
    
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    
    soma = 0;
    for (let i = 1; i <= 10; i++) {
        soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
    }
    
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;
    
    return true;
}

/**
 * Validar CNPJ
 */
function isValidCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]/g, '');
    
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;
    
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(0)) return false;
    
    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(1)) return false;
    
    return true;
}

/**
 * Mostrar erro de validação em campo
 */
function showFieldError(fieldId, message) {
    const field = $(fieldId);
    if (!field) return;
    
    field.classList.add('error');
    
    // Remover erro anterior se existir
    const existingError = field.parentElement.querySelector('.form-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Adicionar novo erro
    const errorEl = createElement('span', {
        className: 'form-error',
        innerHTML: message
    });
    
    field.parentElement.appendChild(errorEl);
}

/**
 * Limpar erro de campo
 */
function clearFieldError(fieldId) {
    const field = $(fieldId);
    if (!field) return;
    
    field.classList.remove('error');
    
    const errorEl = field.parentElement.querySelector('.form-error');
    if (errorEl) {
        errorEl.remove();
    }
}

/* ============================================================================
   FORMATAÇÃO
   ============================================================================ */

/**
 * Formatar data BR (dd/mm/yyyy)
 */
function formatDateBR(date) {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}/${month}/${year}`;
}

/**
 * Formatar data ISO (yyyy-mm-dd)
 */
function formatDateISO(date) {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${year}-${month}-${day}`;
}

/**
 * Formatar moeda BRL
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

/**
 * Formatar CPF
 */
function formatCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, '');
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formatar CNPJ
 */
function formatCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]/g, '');
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Formatar telefone
 */
function formatPhone(phone) {
    phone = phone.replace(/[^\d]/g, '');
    
    if (phone.length === 11) {
        return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (phone.length === 10) {
        return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    
    return phone;
}

/* ============================================================================
   MÁSCARAS
   ============================================================================ */

/**
 * Aplicar máscara em campo
 */
function applyMask(input, mask) {
    input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^\d]/g, '');
        let formatted = '';
        let valueIndex = 0;
        
        for (let i = 0; i < mask.length && valueIndex < value.length; i++) {
            if (mask[i] === '9') {
                formatted += value[valueIndex];
                valueIndex++;
            } else {
                formatted += mask[i];
            }
        }
        
        e.target.value = formatted;
    });
}

/* ============================================================================
   UTILITÁRIOS GERAIS
   ============================================================================ */

/**
 * Debounce (atrasar execução de função)
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Copiar texto para clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showSuccess('Copiado para área de transferência!');
        return true;
    } catch (error) {
        console.error('Erro ao copiar:', error);
        showError('Erro ao copiar texto');
        return false;
    }
}

/**
 * Baixar arquivo
 */
function downloadFile(url, filename) {
    const link = createElement('a', {
        href: url,
        download: filename,
        style: 'display: none'
    });
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Exportar utilitários
window.UTILS = {
    $,
    $$,
    createElement,
    showAlert,
    showError,
    showSuccess,
    showWarning,
    showLoading,
    hideLoading,
    isValidEmail,
    isValidPassword,
    isValidCPF,
    isValidCNPJ,
    showFieldError,
    clearFieldError,
    formatDateBR,
    formatDateISO,
    formatCurrency,
    formatCPF,
    formatCNPJ,
    formatPhone,
    applyMask,
    debounce,
    copyToClipboard,
    downloadFile
};

console.log('✅ Utilitários carregados');
