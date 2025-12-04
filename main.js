class GitHubProfile {
    constructor() {
        this.API_URL = 'https://api.github.com/users/';
        this.elements = {
            input: document.getElementById('inputName'),
            btnBuscar: document.getElementById('btn-buscar-user'),
            btnLimpar: document.getElementById('btn-limpar'),
            profileCard: document.getElementById('profile-card'),
            errorMessage: document.getElementById('error-message'),
            errorText: document.getElementById('error-text'),
            
            // Elementos do perfil
            avatar: document.getElementById('avatar'),
            nome: document.getElementById('nome'),
            userName: document.getElementById('userName'),
            bio: document.getElementById('bio'),
            repos: document.getElementById('repos'),
            followers: document.getElementById('followers'),
            following: document.getElementById('following'),
            link: document.getElementById('link'),
            
            // Elementos de meta
            location: document.getElementById('location'),
            company: document.getElementById('company'),
            blog: document.getElementById('blog')
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupDefaultUser();
    }
    
    setupEventListeners() {
        // Buscar usuário
        this.elements.btnBuscar.addEventListener('click', () => this.buscarUsuario());
        
        // Buscar ao pressionar Enter
        this.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.buscarUsuario();
            }
        });
        
        // Limpar busca
        this.elements.btnLimpar.addEventListener('click', () => this.limparBusca());
    }
    
    setupDefaultUser() {
        // Opcional: carregar um perfil padrão ao iniciar
        this.elements.input.value = 'octocat';
        this.buscarUsuario();
    }
    
    async buscarUsuario() {
        const username = this.elements.input.value.trim();
        
        if (!username) {
            this.mostrarErro('Por favor, digite um username do GitHub');
            return;
        }
        
        // Mostrar loading
        this.setLoading(true);
        this.esconderErro();
        
        try {
            const response = await fetch(`${this.API_URL}${username}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Usuário não encontrado');
                } else if (response.status === 403) {
                    throw new Error('Limite de requisições excedido. Tente novamente mais tarde.');
                } else {
                    throw new Error(`Erro ${response.status}: ${response.statusText}`);
                }
            }
            
            const userData = await response.json();
            this.atualizarPerfil(userData);
            
        } catch (error) {
            this.mostrarErro(error.message);
            this.profileCard.classList.remove('fade-in');
        } finally {
            this.setLoading(false);
        }
    }
    
    atualizarPerfil(userData) {
        // Atualizar informações básicas
        this.elements.avatar.src = userData.avatar_url || 'https://via.placeholder.com/180/01a3a4/ffffff?text=Github';
        this.elements.avatar.alt = `Avatar de ${userData.login}`;
        
        this.elements.nome.textContent = userData.name || userData.login;
        this.elements.userName.textContent = `@${userData.login}`;
        this.elements.bio.textContent = userData.bio || 'Este usuário não possui biografia';
        
        // Atualizar estatísticas
        this.elements.repos.textContent = userData.public_repos.toLocaleString();
        this.elements.followers.textContent = userData.followers.toLocaleString();
        this.elements.following.textContent = userData.following.toLocaleString();
        
        // Atualizar link
        this.elements.link.href = userData.html_url;
        
        // Atualizar informações adicionais
        this.atualizarMetaInfo('location', userData.location, 'Não informado');
        this.atualizarMetaInfo('company', userData.company, 'Não informado');
        this.atualizarMetaInfo('blog', userData.blog, 'Não informado');
        
        // Mostrar card com animação
        this.elements.profileCard.classList.add('fade-in');
        this.elements.profileCard.style.display = 'block';
    }
    
    atualizarMetaInfo(elementId, value, defaultValue) {
        const element = this.elements[elementId];
        const span = element.querySelector('span');
        
        if (value) {
            // Se for blog, criar link
            if (elementId === 'blog' && value.startsWith('http')) {
                span.innerHTML = `<a href="${value}" target="_blank" rel="noopener">${this.truncateText(value, 30)}</a>`;
            } else {
                span.textContent = value;
            }
        } else {
            span.textContent = defaultValue;
        }
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    limparBusca() {
        this.elements.input.value = '';
        this.elements.input.focus();
        this.esconderErro();
        
        // Resetar para estado inicial
        this.elements.avatar.src = 'https://via.placeholder.com/180/01a3a4/ffffff?text=Github';
        this.elements.nome.textContent = 'Busque um usuário';
        this.elements.userName.textContent = '@username';
        this.elements.bio.textContent = 'Clique no botão buscar para ver informações do perfil';
        this.elements.repos.textContent = '0';
        this.elements.followers.textContent = '0';
        this.elements.following.textContent = '0';
        this.elements.link.href = '#';
        
        this.atualizarMetaInfo('location', null, 'Não informado');
        this.atualizarMetaInfo('company', null, 'Não informado');
        this.atualizarMetaInfo('blog', null, 'Não informado');
        
        this.profileCard.classList.remove('fade-in');
    }
    
    mostrarErro(mensagem) {
        this.elements.errorText.textContent = mensagem;
        this.elements.errorMessage.style.display = 'flex';
        this.elements.profileCard.style.display = 'none';
    }
    
    esconderErro() {
        this.elements.errorMessage.style.display = 'none';
        this.elements.profileCard.style.display = 'block';
    }
    
    setLoading(isLoading) {
        const btn = this.elements.btnBuscar;
        
        if (isLoading) {
            btn.classList.add('loading');
            btn.disabled = true;
            this.elements.input.disabled = true;
        } else {
            btn.classList.remove('loading');
            btn.disabled = false;
            this.elements.input.disabled = false;
        }
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new GitHubProfile();
});
