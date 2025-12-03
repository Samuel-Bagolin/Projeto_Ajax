class DataFlowApp {
    constructor() {
        this.dados = [];
        this.grafico = null;
        this.temaAtual = localStorage.getItem('dataflow-tema') || 'claro';
        this.init();
    }

    init() {
        this.setupTema();
        this.setupEventos();
        this.carregarDadosIniciais();
        this.iniciarGrafico();
        this.setupMascaras();
    }

    setupTema() {
        document.documentElement.setAttribute('data-tema', this.temaAtual);
        document.getElementById('temaAtual').textContent = this.temaAtual.charAt(0).toUpperCase() + this.temaAtual.slice(1);
    }

    alternarTema() {
        const temas = ['claro', 'escuro', 'colorido'];
        let index = temas.indexOf(this.temaAtual);
        this.temaAtual = temas[(index + 1) % temas.length];
        localStorage.setItem('dataflow-tema', this.temaAtual);
        this.setupTema();
        this.atualizarGrafico();
    }

    setupEventos() {
        document.getElementById('btnAlternarTema').addEventListener('click', () => this.alternarTema());
        document.getElementById('btnCarregarDados').addEventListener('click', () => this.carregarDadosAPI());
        document.getElementById('btnExportar').addEventListener('click', () => this.exportarDados());
        document.getElementById('btnFiltrar').addEventListener('click', () => this.aplicarFiltros());
        document.getElementById('formNovoDado').addEventListener('submit', (e) => this.adicionarDado(e));
        
        // Eventos de arrastar e soltar
        this.setupDragAndDrop();
        
        // Eventos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                this.duplicarSelecionados();
            }
        });
    }

    setupMascaras() {
        // Máscaras para diferentes tipos de entrada
        $('.mask-data').mask('00/00/0000');
        $('.mask-hora').mask('00:00');
        $('.mask-cep').mask('00000-000');
        $('.mask-cpf').mask('000.000.000-00');
        $('.mask-cnpj').mask('00.000.000/0000-00');
        $('.mask-telefone').mask('(00) 00000-0000');
        $('.mask-dinheiro').mask('000.000.000.000.000,00', {reverse: true});
        $('.mask-porcentagem').mask('##0,00%', {reverse: true});
    }

    async carregarDadosAPI() {
        const loader = document.getElementById('loader');
        const listaDados = document.getElementById('listaDados');
        
        loader.style.display = 'flex';
        listaDados.innerHTML = '<div class="placeholder">🔄 Buscando dados...</div>';

        try {
            const response = await fetch('https://jsonplaceholder.typicode.com/users');
            if (!response.ok) throw new Error(`Erro: ${response.status}`);
            
            const usuarios = await response.json();
            this.dados = usuarios.map(user => ({
                id: user.id,
                nome: user.name,
                email: user.email,
                cidade: user.address.city,
                empresa: user.company.name,
                receita: Math.random() * 100000,
                crescimento: (Math.random() * 50 - 25).toFixed(2),
                data: new Date().toISOString().split('T')[0],
                tags: ['cliente', 'ativo']
            }));
            
            this.atualizarLista();
            this.atualizarGrafico();
            this.atualizarMetricas();
        } catch (error) {
            listaDados.innerHTML = `<div class="erro">❌ ${error.message}</div>`;
        } finally {
            loader.style.display = 'none';
        }
    }

    carregarDadosIniciais() {
        this.dados = [
            { id: 1, nome: "Tech Solutions Inc.", email: "contato@tech.com", cidade: "São Paulo", empresa: "Tech Corp", receita: 85000, crescimento: 12.5, data: "2024-01-15", tags: ['empresa', 'crescimento'] },
            { id: 2, nome: "Inovação Digital Ltda", email: "inovacao@digital.com", cidade: "Rio de Janeiro", empresa: "Digital Group", receita: 65000, crescimento: 8.3, data: "2024-01-14", tags: ['startup', 'tecnologia'] },
            { id: 3, nome: "Global Services SA", email: "global@services.com", cidade: "Belo Horizonte", empresa: "Global Corp", receita: 120000, crescimento: -2.1, data: "2024-01-13", tags: ['corporação', 'estável'] }
        ];
        this.atualizarLista();
        this.atualizarMetricas();
    }

    atualizarLista() {
        const listaDados = document.getElementById('listaDados');
        listaDados.innerHTML = '';
        
        this.dados.forEach(item => {
            const card = document.createElement('div');
            card.className = 'dado-card';
            card.draggable = true;
            card.dataset.id = item.id;
            
            const crescimentoClass = item.crescimento >= 0 ? 'positivo' : 'negativo';
            const crescimentoIcon = item.crescimento >= 0 ? '📈' : '📉';
            
            card.innerHTML = `
                <div class="dado-cabecalho">
                    <h3>${item.nome}</h3>
                    <span class="badge ${item.tags[0]}">${item.tags[0]}</span>
                </div>
                <div class="dado-corpo">
                    <p><i class="bi bi-envelope"></i> ${item.email}</p>
                    <p><i class="bi bi-geo-alt"></i> ${item.cidade} • ${item.empresa}</p>
                    <div class="dado-metricas">
                        <div class="metrica">
                            <span class="label">Receita</span>
                            <span class="valor">R$ ${item.receita.toLocaleString('pt-BR')}</span>
                        </div>
                        <div class="metrica">
                            <span class="label">Crescimento</span>
                            <span class="valor ${crescimentoClass}">${crescimentoIcon} ${item.crescimento}%</span>
                        </div>
                    </div>
                </div>
                <div class="dado-rodape">
                    <span class="data"><i class="bi bi-calendar"></i> ${item.data}</span>
                    <button class="btn-acoes" onclick="app.editarDado(${item.id})"><i class="bi bi-pencil"></i></button>
                </div>
            `;
            
            listaDados.appendChild(card);
        });
    }

    iniciarGrafico() {
        const ctx = document.getElementById('graficoDados').getContext('2d');
        this.grafico = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Receita (R$)',
                    data: [],
                    backgroundColor: 'rgba(67, 97, 238, 0.7)',
                    borderColor: 'rgba(67, 97, 238, 1)',
                    borderWidth: 1
                }, {
                    label: 'Crescimento (%)',
                    data: [],
                    type: 'line',
                    borderColor: 'rgba(114, 9, 183, 1)',
                    backgroundColor: 'rgba(114, 9, 183, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    atualizarGrafico() {
        if (!this.grafico) return;
        
        const labels = this.dados.map(d => d.nome.substring(0, 15));
        const receitas = this.dados.map(d => d.receita);
        const crescimentos = this.dados.map(d => d.crescimento);
        
        this.grafico.data.labels = labels;
        this.grafico.data.datasets[0].data = receitas;
        this.grafico.data.datasets[1].data = crescimentos;
        this.grafico.update();
    }

    atualizarMetricas() {
        const total = this.dados.length;
        const receitaTotal = this.dados.reduce((sum, d) => sum + d.receita, 0);
        const crescimentoMedio = this.dados.reduce((sum, d) => sum + parseFloat(d.crescimento), 0) / total;
        
        document.getElementById('metricTotal').textContent = total;
        document.getElementById('metricReceita').textContent = 'R$ ' + receitaTotal.toLocaleString('pt-BR');
        document.getElementById('metricCrescimento').textContent = crescimentoMedio.toFixed(2) + '%';
        document.getElementById('metricAtivos').textContent = this.dados.filter(d => d.crescimento > 0).length;
    }

    adicionarDado(e) {
        e.preventDefault();
        const form = e.target;
        const novoDado = {
            id: this.dados.length + 1,
            nome: form.nome.value,
            email: form.email.value,
            cidade: form.cidade.value,
            empresa: form.empresa.value,
            receita: parseFloat(form.receita.value),
            crescimento: parseFloat(form.crescimento.value),
            data: new Date().toISOString().split('T')[0],
            tags: ['novo', 'manual']
        };
        
        this.dados.unshift(novoDado);
        this.atualizarLista();
        this.atualizarGrafico();
        this.atualizarMetricas();
        form.reset();
        
        // Feedback visual
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check2"></i> Adicionado!';
        btn.style.background = 'var(--cor-sucesso)';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
        }, 2000);
    }

    editarDado(id) {
        const dado = this.dados.find(d => d.id === id);
        if (!dado) return;
        
        // Implementar modal de edição
        const nome = prompt('Editar nome:', dado.nome);
        if (nome) {
            dado.nome = nome;
            this.atualizarLista();
            this.atualizarGrafico();
        }
    }

    aplicarFiltros() {
        const filtro = document.getElementById('filtroBusca').value.toLowerCase();
        const tipo = document.getElementById('filtroTipo').value;
        
        let filtrados = this.dados;
        
        if (filtro) {
            filtrados = filtrados.filter(d => 
                d.nome.toLowerCase().includes(filtro) || 
                d.email.toLowerCase().includes(filtro) ||
                d.cidade.toLowerCase().includes(filtro)
            );
        }
        
        if (tipo) {
            filtrados = filtrados.filter(d => d.tags.includes(tipo));
        }
        
        // Atualizar exibição temporária
        this.mostrarResultadosFiltrados(filtrados);
    }

    mostrarResultadosFiltrados(dadosFiltrados) {
        const listaDados = document.getElementById('listaDados');
        const cards = listaDados.querySelectorAll('.dado-card');
        
        cards.forEach(card => {
            const id = parseInt(card.dataset.id);
            const mostrar = dadosFiltrados.some(d => d.id === id);
            card.style.display = mostrar ? 'block' : 'none';
        });
        
        // Reset após 5 segundos
        setTimeout(() => {
            cards.forEach(card => card.style.display = 'block');
        }, 5000);
    }

    exportarDados() {
        const dadosFormatados = this.dados.map(d => ({
            ...d,
            receita: `R$ ${d.receita.toLocaleString('pt-BR')}`,
            crescimento: `${d.crescimento}%`
        }));
        
        const blob = new Blob([JSON.stringify(dadosFormatados, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dataflow-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    setupDragAndDrop() {
        const listaDados = document.getElementById('listaDados');
        
        listaDados.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('dado-card')) {
                e.dataTransfer.setData('text/plain', e.target.dataset.id);
                e.target.classList.add('arrastando');
            }
        });
        
        listaDados.addEventListener('dragend', (e) => {
            e.target.classList.remove('arrastando');
        });
        
        listaDados.addEventListener('dragover', (e) => {
            e.preventDefault();
            const card = e.target.closest('.dado-card');
            if (card) {
                card.classList.add('sobreposicao');
            }
        });
        
        listaDados.addEventListener('dragleave', (e) => {
            const card = e.target.closest('.dado-card');
            if (card) {
                card.classList.remove('sobreposicao');
            }
        });
        
        listaDados.addEventListener('drop', (e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData('text/plain');
            const cardArrastado = document.querySelector(`.dado-card[data-id="${id}"]`);
            const cardAlvo = e.target.closest('.dado-card');
            
            if (cardArrastado && cardAlvo && cardArrastado !== cardAlvo) {
                const indexFrom = Array.from(listaDados.children).indexOf(cardArrastado);
                const indexTo = Array.from(listaDados.children).indexOf(cardAlvo);
                
                if (indexFrom < indexTo) {
                    listaDados.insertBefore(cardArrastado, cardAlvo.nextSibling);
                } else {
                    listaDados.insertBefore(cardArrastado, cardAlvo);
                }
                
                // Reordenar dados
                const novosDados = [];
                Array.from(listaDados.children).forEach((card, index) => {
                    const id = parseInt(card.dataset.id);
                    const dado = this.dados.find(d => d.id === id);
                    if (dado) {
                        dado.ordem = index;
                        novosDados.push(dado);
                    }
                });
                
                this.dados = novosDados;
            }
            
            listaDados.querySelectorAll('.dado-card').forEach(card => {
                card.classList.remove('sobreposicao');
            });
        });
    }

    duplicarSelecionados() {
        const selecionados = this.dados.filter(d => d.selecionado);
        if (selecionados.length === 0) return;
        
        const novosDados = selecionados.map(d => ({
            ...JSON.parse(JSON.stringify(d)),
            id: this.dados.length + 1 + Math.random(),
            nome: d.nome + ' (Cópia)',
            tags: [...d.tags, 'copia']
        }));
        
        this.dados.push(...novosDados);
        this.atualizarLista();
        this.atualizarGrafico();
        this.atualizarMetricas();
    }
}

// Inicializar aplicação
const app = new DataFlowApp();
window.app = app;

// Inicializar tooltips do Bootstrap
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
});
